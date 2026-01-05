import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to_email: string;
  subject: string;
  body_text: string;
  body_html?: string;
  from_email: string;
  from_name?: string;
  in_reply_to?: string;
  references?: string[];
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

    // Send email via Resend REST API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
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
