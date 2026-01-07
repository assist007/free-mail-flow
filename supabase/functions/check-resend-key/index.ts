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
    console.log("check-resend-key function called");
    
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const hasKey = !!resendApiKey && resendApiKey.trim().length > 0;

    console.log("Check Resend key status:", hasKey ? "Key exists (length: " + resendApiKey?.length + ")" : "No key");

    // If key exists, also verify it's valid by testing with Resend API
    if (hasKey) {
      try {
        const response = await fetch("https://api.resend.com/domains", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
        });
        
        console.log("Resend validation response:", response.status);
        
        if (response.ok) {
          const domains = await response.json();
          return new Response(
            JSON.stringify({ 
              hasKey: true, 
              isValid: true,
              domains: domains.data || []
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        } else {
          console.log("Resend key exists but is invalid");
          return new Response(
            JSON.stringify({ hasKey: true, isValid: false }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
      } catch (e) {
        console.error("Error validating with Resend:", e);
        return new Response(
          JSON.stringify({ hasKey: true, isValid: false }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ hasKey: false }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error checking Resend key:", error);
    return new Response(
      JSON.stringify({ error: error.message, hasKey: false }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
