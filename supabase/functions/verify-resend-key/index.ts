import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("verify-resend-key function called");
    
    let apiKey: string | undefined;
    
    // Try to get API key from request body, if not provided use env
    try {
      const body = await req.json();
      apiKey = body.apiKey;
      console.log("API key provided in request body");
    } catch {
      console.log("No body provided, checking environment");
    }
    
    // If no API key in body, use the one from environment
    if (!apiKey) {
      apiKey = Deno.env.get("RESEND_API_KEY");
      console.log("Using RESEND_API_KEY from environment:", apiKey ? "exists" : "not found");
    }

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      console.log("No API key available");
      return new Response(
        JSON.stringify({ valid: false, error: "API key is required. Please add RESEND_API_KEY to your secrets." }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verify the API key by making a test request to Resend
    console.log("Verifying Resend API key...");
    
    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Resend API response status:", response.status);

    if (response.ok) {
      const domains = await response.json();
      console.log("Resend API key is valid. Domains:", JSON.stringify(domains));
      
      return new Response(
        JSON.stringify({ 
          valid: true, 
          message: "API key verified successfully",
          domains: domains.data || []
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      const errorData = await response.text();
      console.error("Resend API key verification failed:", response.status, errorData);
      
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Invalid API key (Status: ${response.status})` 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error("Error in verify-resend-key:", error.message, error.stack);
    return new Response(
      JSON.stringify({ valid: false, error: `Server error: ${error.message}` }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
