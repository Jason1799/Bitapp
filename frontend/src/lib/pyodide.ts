declare global {
    interface Window {
        loadPyodide: any;
    }
}

let pyodide: any = null;

export async function initPyodide() {
    if (pyodide) return pyodide;

    if (!window.loadPyodide) {
        throw new Error("Pyodide script not loaded");
    }

    pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
    });

    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");

    // Install python-docx and its dependencies
    await micropip.install("python-docx");

    // Load our logic script
    const response = await fetch("/logic.py");
    const script = await response.text();
    await pyodide.runPythonAsync(script);

    return pyodide;
}

export async function runListingGeneration(templateBytes: Uint8Array, data: any): Promise<Uint8Array> {
    const p = await initPyodide();
    p.globals.set("template_bytes", templateBytes);
    p.globals.set("data_json", data);

    const result = await p.runPythonAsync(`
        import js
        data = data_json.to_py()
        generate_listing_agreement(template_bytes, data)
    `);

    return result.toJs();
}

export async function runKYCGeneration(templateBytes: Uint8Array, data: any, accountId: string, images: Uint8Array[]): Promise<Uint8Array> {
    const p = await initPyodide();

    p.globals.set("template_bytes", templateBytes);
    p.globals.set("data_json", data);
    p.globals.set("account_id", accountId);
    p.globals.set("images_list", images);

    const result = await p.runPythonAsync(`
        data = data_json.to_py()
        imgs = [bytes(x) for x in images_list]
        fill_kyc_document_logic(template_bytes, data, account_id, imgs)
    `);

    return result.toJs();
}

export async function runKYCExtraction(text: string): Promise<any> {
    const p = await initPyodide();
    p.globals.set("email_text", text);
    const result = await p.runPythonAsync(`
        extract_kyc_fields(email_text)
    `);
    const jsResult = result.toJs();
    if (jsResult instanceof Map) {
        return Object.fromEntries(jsResult.entries());
    }
    return jsResult;
}
