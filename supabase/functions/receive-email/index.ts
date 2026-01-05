import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncomingEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    content: string; // base64
  }>;
}

// Helper function to find or create thread_id
async function getOrCreateThreadId(
  supabase: any,
  inReplyTo?: string,
  references?: string[],
): Promise<string> {
  // If replying, find the thread from the original message
  if (inReplyTo) {
    // First try by message_id
    const { data: parentEmail } = await supabase
      .from("emails")
      .select("id, thread_id")
      .eq("message_id", inReplyTo)
      .maybeSingle();
    
    if (parentEmail?.thread_id) {
      console.log("Found thread_id from in_reply_to:", parentEmail.thread_id);
      return parentEmail.thread_id;
    }
    
    // If parent email exists but has no thread_id, create one and update it
    if (parentEmail) {
      const newThreadId = crypto.randomUUID();
      console.log("Creating thread_id for parent email:", newThreadId);
      
      // Update the parent email with the new thread_id
      await supabase
        .from("emails")
        .update({ thread_id: newThreadId })
        .eq("id", parentEmail.id);
      
      return newThreadId;
    }
  }
  
  // Check references array for existing thread
  if (references && references.length > 0) {
    for (const ref of references) {
      const { data: refEmail } = await supabase
        .from("emails")
        .select("id, thread_id")
        .eq("message_id", ref)
        .maybeSingle();
      
      if (refEmail?.thread_id) {
        console.log("Found thread_id from references:", refEmail.thread_id);
        return refEmail.thread_id;
      }
      
      // If ref email exists but has no thread_id, create one and update it
      if (refEmail) {
        const newThreadId = crypto.randomUUID();
        console.log("Creating thread_id for ref email:", newThreadId);
        
        await supabase
          .from("emails")
          .update({ thread_id: newThreadId })
          .eq("id", refEmail.id);
        
        return newThreadId;
      }
    }
  }
  
  // Generate new thread_id using crypto
  const newThreadId = crypto.randomUUID();
  console.log("Generated new thread_id:", newThreadId);
  return newThreadId;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Receive email webhook called - STRICT ALLOWLIST MODE v2");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse the incoming webhook payload
    const contentType = req.headers.get('content-type') || '';
    let emailData: IncomingEmail;

    if (contentType.includes('application/json')) {
      emailData = await req.json();
    } else if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data (common for email webhooks)
      const formData = await req.formData();
      emailData = {
        from: formData.get('from') as string || '',
        to: formData.get('to') as string || formData.get('recipient') as string || '',
        subject: formData.get('subject') as string || '',
        text: formData.get('text') as string || formData.get('body-plain') as string || '',
        html: formData.get('html') as string || formData.get('body-html') as string || '',
        messageId: formData.get('Message-Id') as string || formData.get('message-id') as string || '',
      };
    } else {
      // Try to parse as JSON anyway
      const text = await req.text();
      emailData = JSON.parse(text);
    }

    console.log("Received email for:", emailData.to);

    // Extract recipient info
    const toMatch = emailData.to.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
    const toEmail = toMatch?.[2] || emailData.to;
    const [localPart, domainName] = toEmail.split('@');

    if (!localPart || !domainName) {
      console.log("Invalid recipient format, rejecting");
      return new Response(
        JSON.stringify({ success: false, reason: 'invalid_recipient_format' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // ========================================
    // EARLY VALIDATION: Check if address exists in allowlist
    // ========================================
    
    // First, find the domain
    const { data: domain, error: domainError } = await supabase
      .from('email_domains')
      .select('id')
      .eq('domain', domainName)
      .maybeSingle();

    if (domainError || !domain) {
      console.log(`Domain not found: ${domainName}, rejecting email`);
      return new Response(
        JSON.stringify({ success: false, reason: 'domain_not_registered' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if the email address exists in our allowlist
    const { data: existingAddress, error: addressError } = await supabase
      .from('email_addresses')
      .select('id, status')
      .eq('domain_id', domain.id)
      .eq('local_part', localPart.toLowerCase())
      .maybeSingle();

    if (addressError) {
      console.error("Error checking address:", addressError);
      throw addressError;
    }

    // ========================================
    // REJECT if address not in allowlist (STRICT MODE - no auto-add)
    // Only addresses created via the app are allowed
    // ========================================
    if (!existingAddress) {
      console.log(`Address not in allowlist: ${localPart}@${domainName}, REJECTING`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: 'address_not_allowed',
          message: 'This email address is not registered. Create it via the app first.'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const addressId = existingAddress.id;
    const isFirstEmail = existingAddress.status === 'pending';

    console.log(`Address verified in allowlist: ${localPart}@${domainName}, processing email`);

    // ========================================
    // Address exists - Process the email
    // ========================================

    // Extract sender info
    const fromMatch = emailData.from.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
    const fromName = fromMatch?.[1] || null;
    const fromEmail = fromMatch?.[2] || emailData.from;

    // Extract recipient name
    const toName = toMatch?.[1] || null;

    // Get or create thread_id for proper threading
    const threadId = await getOrCreateThreadId(supabase, emailData.inReplyTo, emailData.references);
    console.log("Using thread_id:", threadId);

    // Insert email into database
    const { data: email, error: emailError } = await supabase
      .from('emails')
      .insert({
        from_email: fromEmail,
        from_name: fromName,
        to_email: toEmail,
        to_name: toName,
        subject: emailData.subject || '(No Subject)',
        body_text: emailData.text || null,
        body_html: emailData.html || null,
        headers: emailData.headers || null,
        message_id: emailData.messageId || null,
        in_reply_to: emailData.inReplyTo || null,
        references: emailData.references || null,
        thread_id: threadId,
        is_read: false,
        is_starred: false,
        is_archived: false,
        is_trash: false,
        is_sent: false,
        folder: 'inbox',
        received_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (emailError) {
      console.error("Error inserting email:", emailError);
      throw emailError;
    }

    console.log("Email inserted successfully:", email.id);

    // ========================================
    // UPDATE address status to 'active' if first email (only for existing pending addresses)
    // ========================================
    if (existingAddress && existingAddress.status === 'pending') {
      const { error: updateError } = await supabase
        .from('email_addresses')
        .update({
          status: 'active',
          first_received_at: new Date().toISOString(),
        })
        .eq('id', existingAddress.id);

      if (updateError) {
        console.error("Error updating address status:", updateError);
        // Don't throw - email is already saved, status update is secondary
      } else {
        console.log(`Address activated: ${localPart}@${domainName}`);
      }
    }

    // Handle attachments if present
    if (emailData.attachments && emailData.attachments.length > 0) {
      for (const attachment of emailData.attachments) {
        // Decode base64 content
        const content = Uint8Array.from(atob(attachment.content), c => c.charCodeAt(0));
        
        // Upload to storage
        const storagePath = `attachments/${email.id}/${attachment.filename}`;
        const { error: uploadError } = await supabase.storage
          .from('email-attachments')
          .upload(storagePath, content, {
            contentType: attachment.contentType,
          });

        if (uploadError) {
          console.error("Error uploading attachment:", uploadError);
          continue;
        }

        // Insert attachment record
        const { error: attachmentError } = await supabase
          .from('email_attachments')
          .insert({
            email_id: email.id,
            filename: attachment.filename,
            content_type: attachment.contentType,
            size: attachment.size,
            storage_path: storagePath,
          });

        if (attachmentError) {
          console.error("Error inserting attachment record:", attachmentError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailId: email.id }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in receive-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
