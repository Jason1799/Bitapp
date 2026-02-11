// Cloudflare Pages Function: /api/optimization-log
// Stores prompt optimization logs

interface Env {
    BITAPP_KV: KVNamespace;
}

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_LOGS = 100;

// GET /api/optimization-log
export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const logs = await context.env.BITAPP_KV.get("optimization_logs", "json");
        return new Response(JSON.stringify(logs || []), {
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    } catch (e) {
        return new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    }
};

// POST /api/optimization-log - Add new log entry
export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const newEntry: any = await context.request.json();
        const existing: any[] = (await context.env.BITAPP_KV.get("optimization_logs", "json")) || [];

        existing.unshift(newEntry);
        if (existing.length > MAX_LOGS) {
            existing.length = MAX_LOGS;
        }

        await context.env.BITAPP_KV.put("optimization_logs", JSON.stringify(existing));
        return new Response(JSON.stringify({ success: true, count: existing.length }), {
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Failed to save log" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    }
};

// DELETE /api/optimization-log - Clear all logs
export const onRequestDelete: PagesFunction<Env> = async (context) => {
    try {
        await context.env.BITAPP_KV.put("optimization_logs", JSON.stringify([]));
        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Failed to clear logs" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
    }
};

export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, { headers: CORS_HEADERS });
};
