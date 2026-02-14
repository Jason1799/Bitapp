
export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Target-Url",
        },
    });
};

export const onRequestPost: PagesFunction = async (context) => {
    const request = context.request;
    const targetUrl = request.headers.get("X-Target-Url");

    if (!targetUrl) {
        return new Response(JSON.stringify({ error: "Missing X-Target-Url header" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        // Clone the request to modify it
        const originalBody = await request.blob();

        // Prepare headers for the target request
        const headers = new Headers(request.headers);
        headers.delete("X-Target-Url");
        headers.delete("Host");
        headers.delete("CF-Connecting-IP");
        // Ensure proper content type if not set (though usually it is)
        if (!headers.get("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }

        const response = await fetch(targetUrl, {
            method: "POST",
            headers: headers,
            body: originalBody,
        });

        // Create a new response from the target response
        // This preserves streaming and headers
        const newResponse = new Response(response.body, response);

        // Add CORS headers to the response so the browser accepts it
        newResponse.headers.set("Access-Control-Allow-Origin", "*");

        return newResponse;

    } catch (e) {
        return new Response(JSON.stringify({ error: `Proxy Error: ${(e as Error).message}` }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
        });
    }
};
