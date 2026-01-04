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

const handler = async (req: Request): Promise<Response> => {
  console.log("Receive email webhook called");
  
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

    console.log("Received email data:", JSON.stringify(emailData, null, 2));

    // Extract sender info
    const fromMatch = emailData.from.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
    const fromName = fromMatch?.[1] || null;
    const fromEmail = fromMatch?.[2] || emailData.from;

    // Extract recipient info
    const toMatch = emailData.to.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
    const toName = toMatch?.[1] || null;
    const toEmail = toMatch?.[2] || emailData.to;

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
