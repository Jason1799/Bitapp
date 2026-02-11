// Cloudflare Pages Function: /api/history
// Handles shared history records

interface Env {
    BITAPP_KV: KVNamespace;
}

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_HISTORY = 50;

// GET /api/history
export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const history = await context.env.BITAPP_KV.get("history", "json");
        return new Response(JSON.stringify(history || []), {
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    } catch (e) {
        return new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    }
};

// POST /api/history - Add new history item
export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const newItem: any = await context.request.json();
        const existing: any[] = (await context.env.BITAPP_KV.get("history", "json")) || [];

        // Add to front, cap at MAX_HISTORY
        existing.unshift(newItem);
        if (existing.length > MAX_HISTORY) {
            existing.length = MAX_HISTORY;
        }

        await context.env.BITAPP_KV.put("history", JSON.stringify(existing));
        return new Response(JSON.stringify({ success: true, count: existing.length }), {
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Failed to save history" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    }
};

// DELETE /api/history - Clear all history
export const onRequestDelete: PagesFunction<Env> = async (context) => {
    try {
        await context.env.BITAPP_KV.put("history", JSON.stringify([]));
        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Failed to clear history" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    }
};

export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, { headers: CORS_HEADERS });
};
