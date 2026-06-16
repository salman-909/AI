/**
 * Cloudflare Worker Backend - Uncensored AI Chats persistence & Auth gateway
 * 
 * To deploy this on Cloudflare:
 * 1. Create a Worker at dashboard.cloudflare.com.
 * 2. Create a KV Namespace named "CHATS_KV" and bind it to this worker as "CHATS_KV".
 * 3. Set an Environment Variable named "ACCESS_KEY" in the worker settings.
 *    - To support multiple users, you can enter a single passcode OR a comma-separated list of passcodes.
 *    - Example: ACCESS_KEY = "salman@admin, user1, user2"
 * 4. Paste this code into the Worker editor and save/deploy.
 */

// Helper headers for CORS support
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Access-Key",
  "Access-Control-Max-Age": "86400",
};

// SHA-256 hashing helper to securely partition storage keys in KV without exposing plain passcodes
async function hashPasscode(passcode) {
  const msgBuffer = new TextEncoder().encode(passcode);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle OPTIONS preflight request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    try {
      // Parse allowed passcodes from the environment variable (supports single keys or comma-separated lists)
      const allowedStr = env.ACCESS_KEY || "admin123";
      const allowedList = allowedStr.split(",").map(p => p.trim());

      // 1. Auth Endpoint (allows validating the passcode before entering the app)
      if (url.pathname === "/api/auth" && request.method === "POST") {
        const body = await request.json();
        const passcode = body.passcode || "";

        if (allowedList.includes(passcode)) {
          return new Response(JSON.stringify({ success: true, message: "Authenticated successfully" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } else {
          return new Response(JSON.stringify({ success: false, error: "Invalid passcode" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      // 2. Validate Access Key for all other API endpoints
      const accessHeader = request.headers.get("X-Access-Key") || request.headers.get("Authorization")?.replace("Bearer ", "");

      if (!accessHeader || !allowedList.includes(accessHeader)) {
        return new Response(JSON.stringify({ error: "Unauthorized access key" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Check if CHATS_KV binding exists
      if (!env.CHATS_KV) {
        return new Response(JSON.stringify({ error: "CHATS_KV namespace not bound. Please bind a KV Namespace to your worker." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Generate a secure, user-specific key using the hash of their passcode
      const userHash = await hashPasscode(accessHeader);
      const STORAGE_KEY = `chats_${userHash}`;

      // 3. GET Chats Endpoint
      if (url.pathname === "/api/chats" && request.method === "GET") {
        const savedChats = await env.CHATS_KV.get(STORAGE_KEY);
        return new Response(savedChats || "[]", {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 4. POST Save Chats Endpoint
      if (url.pathname === "/api/chats" && request.method === "POST") {
        const body = await request.json();
        
        // Save the raw JSON array string directly into KV
        await env.CHATS_KV.put(STORAGE_KEY, JSON.stringify(body.chats || []));
        
        return new Response(JSON.stringify({ success: true, message: "Chats saved to online server" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 5. DELETE Clear Chats Endpoint
      if (url.pathname === "/api/chats" && request.method === "DELETE") {
        await env.CHATS_KV.delete(STORAGE_KEY);
        return new Response(JSON.stringify({ success: true, message: "All online conversations cleared" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 404 Route Not Found
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: "Server Error: " + err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
