import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Function to get the correct API key based on the from_email domain
function getResendApiKey(fromEmail: string): string {
  const domain = fromEmail.split('@')[1]?.toLowerCase();
  console.log("Getting API key for domain:", domain);
  
  // Check for domain-specific API keys
  if (domain === 'redwan007.dpdns.org') {
    const key = Deno.env.get("RESEND_API_KEY_REDWAN007");
    if (key) {
      console.log("Using RESEND_API_KEY_REDWAN007");
      return key;
    }
  }
  
  // Default to the main RESEND_API_KEY (for aibd.dpdns.org and others)
  const defaultKey = Deno.env.get("RESEND_API_KEY");
  console.log("Using default RESEND_API_KEY");
  return defaultKey || "";
}

interface SendEmailRequest {
  to_email: string;
  subject: string;
  body_text: string;
  body_html?: string;
  from_email: string;
  from_name?: string;
  in_reply_to?: string;
  references?: string[];
  thread_id?: string;
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to_email, subject, body_text, body_html, from_email, from_name, in_reply_to, references }: SendEmailRequest = await req.json();

    console.log("Sending email:", { to_email, subject, from_email, from_name, in_reply_to });

    // Validate required fields - subject is optional for replies
    if (!to_email || !body_text || !from_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to_email, body_text, from_email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build email headers for threading
    const emailHeaders: Record<string, string> = {};
    if (in_reply_to) {
      emailHeaders['In-Reply-To'] = in_reply_to;
    }
    if (references && references.length > 0) {
      emailHeaders['References'] = references.join(' ');
    }

    // Get the correct API key based on from_email domain
    const resendApiKey = getResendApiKey(from_email);
    if (!resendApiKey) {
      console.error("No Resend API key found for domain:", from_email.split('@')[1]);
      return new Response(
        JSON.stringify({ error: `No Resend API key configured for domain: ${from_email.split('@')[1]}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email via Resend REST API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from_name ? `${from_name} <${from_email}>` : from_email,
        to: [to_email],
        subject: subject || '(No Subject)',
        text: body_text,
        html: body_html || body_text.replace(/\n/g, "<br>"),
        headers: Object.keys(emailHeaders).length > 0 ? emailHeaders : undefined,
      }),
    });

    const emailResponse = await resendResponse.json();
    console.log("Resend response:", emailResponse);

    if (!resendResponse.ok) {
      console.error("Resend error:", emailResponse);
      return new Response(
        JSON.stringify({ error: emailResponse.message || "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Save sent email to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get or create thread_id for proper threading
    const threadId = await getOrCreateThreadId(supabase, in_reply_to, references);
    console.log("Using thread_id:", threadId);

    const { data: savedEmail, error: dbError } = await supabase
      .from("emails")
      .insert({
        from_email: from_email,
        from_name: from_name || null,
        to_email: to_email,
        subject: subject || '(No Subject)',
        body_text: body_text,
        body_html: body_html || null,
        message_id: emailResponse.id || null,
        in_reply_to: in_reply_to || null,
        references: references || null,
        thread_id: threadId,
        is_sent: true,
        is_read: true,
        folder: "sent",
        received_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: emailResponse.id,
        email: savedEmail 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
