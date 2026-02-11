// Cloudflare Pages Function: /api/config
// Handles shared API configuration (key, base URL, model, extra JSON)

interface Env {
    BITAPP_KV: KVNamespace;
}

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

// GET /api/config - Read shared config
export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const config = await context.env.BITAPP_KV.get("config", "json");
        return new Response(JSON.stringify(config || {}), {
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Failed to read config" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    }
};

// PUT /api/config - Save shared config
export const onRequestPut: PagesFunction<Env> = async (context) => {
    try {
        const body = await context.request.json();
        await context.env.BITAPP_KV.put("config", JSON.stringify(body));
        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Failed to save config" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    }
};

// OPTIONS - CORS preflight
export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, { headers: CORS_HEADERS });
};
