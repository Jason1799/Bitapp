// Cloudflare Pages Function: /api/prompt
// Handles shared system prompt

interface Env {
    BITAPP_KV: KVNamespace;
}

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

// GET /api/prompt
export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const prompt = await context.env.BITAPP_KV.get("prompt");
        return new Response(JSON.stringify({ prompt: prompt || "" }), {
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Failed to read prompt" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    }
};

// PUT /api/prompt
export const onRequestPut: PagesFunction<Env> = async (context) => {
    try {
        const body: any = await context.request.json();
        await context.env.BITAPP_KV.put("prompt", body.prompt || "");
        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Failed to save prompt" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    }
};

export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, { headers: CORS_HEADERS });
};
