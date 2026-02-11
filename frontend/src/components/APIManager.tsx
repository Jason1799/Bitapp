import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Lock, Play, Save, RotateCcw, Settings, FileText, RefreshCw, Upload, Trash2, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { DEFAULT_SYSTEM_PROMPT, PROMPT_STORAGE_KEY } from '../lib/ai';
import { getAllTemplates, saveTemplate, deleteTemplate, replaceBuiltInTemplate, resetBuiltInTemplate, getOutputPattern, saveOutputPattern, formatOutputName, DEFAULT_OUTPUT_PATTERN_VALUE, type TemplateInfo } from '../lib/template-store';


const DEFAULT_PASSWORD = "admin"; // Simple hardcoded password for now

export const APIManager: React.FC = () => {
    const [isLocked, setIsLocked] = useState(true);
    const [passwordInput, setPasswordInput] = useState("");
    const [unlockError, setUnlockError] = useState("");
    const [subTab, setSubTab] = useState<"config" | "prompt">("config");

    // Config State
    const [baseUrl, setBaseUrl] = useState(localStorage.getItem('openai_base_url') || "https://api.openai.com/v1");
    const [apiKey, setApiKey] = useState(localStorage.getItem('openai_key') || "");
    const [model, setModel] = useState(localStorage.getItem('openai_model') || "gpt-4o");
    const [extraJson, setExtraJson] = useState('{"chat_template_kwargs": {"thinking": true}}');

    // Test State
    const [testPrompt, setTestPrompt] = useState("Hello, who are you?");
    const [testOutput, setTestOutput] = useState("");
    const [isTesting, setIsTesting] = useState(false);

    // Prompt Editor State
    const [promptText, setPromptText] = useState("");
    const [promptSaved, setPromptSaved] = useState(false);

    // Template Management State
    const [templates, setTemplates] = useState<TemplateInfo[]>([]);
    const [outputPattern, setOutputPattern] = useState(getOutputPattern());
    const [patternSaved, setPatternSaved] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [uploadName, setUploadName] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [replacingId, setReplacingId] = useState<string | null>(null);

    useEffect(() => {
        const custom = localStorage.getItem(PROMPT_STORAGE_KEY);
        setPromptText(custom || DEFAULT_SYSTEM_PROMPT);
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        const list = await getAllTemplates();
        setTemplates(list);
    };

    const handleUploadTemplate = async () => {
        if (!uploadFile || !uploadName.trim()) return;
        setIsUploading(true);
        try {
            await saveTemplate(uploadName.trim(), uploadFile);
            await loadTemplates();
            setUploadName("");
            setUploadFile(null);
            setShowUpload(false);
        } catch (e) {
            alert('上传失败: ' + (e as Error).message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('确定要删除此模板吗？')) return;
        try {
            await deleteTemplate(id);
            await loadTemplates();
        } catch (e) {
            alert('删除失败: ' + (e as Error).message);
        }
    };

    const handleReplaceBuiltIn = async (builtInId: string, file: File) => {
        try {
            await replaceBuiltInTemplate(builtInId, file);
            await loadTemplates();
            setReplacingId(null);
        } catch (e) {
            alert('替换失败: ' + (e as Error).message);
        }
    };

    const handleResetBuiltIn = async (builtInId: string) => {
        if (!confirm('确定恢复为默认模板？')) return;
        try {
            await resetBuiltInTemplate(builtInId);
            await loadTemplates();
        } catch (e) {
            alert('恢复失败: ' + (e as Error).message);
        }
    };

    const handleSavePattern = () => {
        saveOutputPattern(outputPattern);
        setPatternSaved(true);
        setTimeout(() => setPatternSaved(false), 2000);
    };

    const handleResetPattern = () => {
        setOutputPattern(DEFAULT_OUTPUT_PATTERN_VALUE);
        saveOutputPattern(DEFAULT_OUTPUT_PATTERN_VALUE);
        setPatternSaved(true);
        setTimeout(() => setPatternSaved(false), 2000);
    };

    const handleUnlock = () => {
        if (passwordInput === DEFAULT_PASSWORD) {
            setIsLocked(false);
            setUnlockError("");
        } else {
            setUnlockError("Incorrect password");
        }
    };

    const handleSave = () => {
        localStorage.setItem('openai_base_url', baseUrl);
        localStorage.setItem('openai_key', apiKey);
        localStorage.setItem('openai_model', model);
        alert("Settings Saved!");
    };

    const handleSavePrompt = () => {
        if (promptText.trim() === DEFAULT_SYSTEM_PROMPT.trim()) {
            localStorage.removeItem(PROMPT_STORAGE_KEY);
        } else {
            localStorage.setItem(PROMPT_STORAGE_KEY, promptText);
        }
        setPromptSaved(true);
        setTimeout(() => setPromptSaved(false), 2000);
    };

    const handleResetPrompt = () => {
        setPromptText(DEFAULT_SYSTEM_PROMPT);
        localStorage.removeItem(PROMPT_STORAGE_KEY);
        setPromptSaved(true);
        setTimeout(() => setPromptSaved(false), 2000);
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestOutput("");

        try {
            let cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

            if (cleanBaseUrl.includes("integrate.api.nvidia.com")) {
                cleanBaseUrl = cleanBaseUrl.replace("https://integrate.api.nvidia.com", "/nvidia-api");
            }

            const url = `${cleanBaseUrl}/chat/completions`;

            let extraPayload = {};
            try {
                extraPayload = JSON.parse(extraJson);
            } catch (e) {
                setTestOutput("Error: Invalid JSON in Advanced Config");
                setIsTesting(false);
                return;
            }

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model || "gpt-3.5-turbo",
                    messages: [
                        { role: "user", content: testPrompt }
                    ],
                    stream: true,

                    // Filter out incompatible parameters for Google/OpenAI
                    ...(url.includes('googleapis') || url.includes('openai.com')
                        ? (({ chat_template_kwargs, ...rest }) => rest)(extraPayload as any)
                        : extraPayload)
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`API Error: ${response.status} ${response.statusText}\n${err}`);
            }

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                const chunkValue = decoder.decode(value, { stream: true });

                const lines = chunkValue.split('\n').filter(line => line.trim() !== '');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '');
                        if (dataStr === '[DONE]') break;
                        try {
                            const json = JSON.parse(dataStr);
                            const content = json.choices[0]?.delta?.content || "";
                            setTestOutput(prev => prev + content);
                        } catch (e) {
                            console.warn("Stream parse error", e);
                        }
                    }
                }
            }

        } catch (e: any) {
            setTestOutput(`Error: ${e.message}`);
        } finally {
            setIsTesting(false);
        }
    };

    const applyPreset = (preset: "nvidia" | "kimi" | "openai" | "gemini" | "deepseek" | "claude" | "grok") => {
        if (preset === "nvidia") {
            setBaseUrl("https://integrate.api.nvidia.com/v1");
            setModel("moonshotai/kimi-k2.5");
            setExtraJson('{"chat_template_kwargs": {"thinking": true}, "temperature": 0.3, "top_p": 1.0, "max_tokens": 1024}');
        } else if (preset === "kimi") {
            setBaseUrl("https://api.moonshot.cn/v1");
            setModel("moonshot-v1-8k");
            setExtraJson('{}');
        } else if (preset === "openai") {
            setBaseUrl("https://api.openai.com/v1");
            setModel("gpt-4o");
            setExtraJson('{}');
        } else if (preset === "gemini") {
            setBaseUrl("https://generativelanguage.googleapis.com/v1beta/openai");
            setModel("gemini-1.5-flash");
            setExtraJson('{}');
        } else if (preset === "deepseek") {
            setBaseUrl("https://api.deepseek.com");
            setModel("deepseek-chat");
            setExtraJson('{}');
        } else if (preset === "claude") {
            setBaseUrl("https://api.anthropic.com");
            setModel("claude-3-5-sonnet-20240620");
            setExtraJson('{}');
        } else if (preset === "grok") {
            setBaseUrl("https://api.x.ai/v1");
            setModel("grok-beta");
            setExtraJson('{}');
        }
    };

    if (isLocked) {
        return (
            <div className="flex items-center justify-center p-8 h-full min-h-[500px]">
                <Card className="w-full max-w-sm shadow-xl bg-white/80 backdrop-blur-md border border-gray-100">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto bg-gray-100 rounded-full p-3 w-12 h-12 flex items-center justify-center mb-2">
                            <Lock className="w-6 h-6 text-gray-500" />
                        </div>
                        <CardTitle>Restricted Access</CardTitle>
                        <CardDescription>Enter password to manage API settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Password"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                                className={cn("text-center", unlockError && "border-red-500 ring-red-200")}
                            />
                            {unlockError && <p className="text-xs text-red-500 text-center">{unlockError}</p>}
                        </div>
                        <Button className="w-full bg-black hover:bg-gray-800" onClick={handleUnlock}>
                            Unlock & Manage APIs
                        </Button>
                        <p className="text-xs text-center text-gray-400 mt-4">Hint: default is "admin"</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-2 space-y-4">

            {/* Sub-tab navigation */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <Button
                        variant={subTab === "config" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSubTab("config")}
                        className={cn(subTab === "config" ? "bg-black hover:bg-gray-800 text-white" : "")}
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        API Configuration
                    </Button>
                    <Button
                        variant={subTab === "prompt" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSubTab("prompt")}
                        className={cn(subTab === "prompt" ? "bg-black hover:bg-gray-800 text-white" : "")}
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Prompt & Templates
                    </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsLocked(true)} title="Logout">
                    <Lock className="w-4 h-4 text-gray-500 mr-1" /> Lock
                </Button>
            </div>

            {subTab === "config" ? (
                /* ===== API Configuration Tab ===== */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">

                    {/* Left: Configuration */}
                    <div className="flex flex-col gap-6">
                        <Card className="border-none shadow-md bg-white/90 backdrop-blur-sm h-full flex flex-col">
                            <CardHeader className="border-b bg-gray-50/50 pb-4">
                                <div className="flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-blue-600" />
                                    <CardTitle className="text-lg">API Configuration</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col gap-5 pt-6">

                                {/* Presets */}
                                <div className="space-y-3">
                                    <Label className="text-xs text-gray-500 font-mono">QUICK PRESETS</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        <Button variant={model.includes('gemini') ? "default" : "outline"} size="sm" onClick={() => applyPreset("gemini")} className={cn(model.includes('gemini') ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-blue-200 hover:bg-blue-50 text-blue-700 font-semibold")} title="Free Tier Available">Gemini</Button>
                                        <Button variant={model.includes('deepseek') ? "default" : "outline"} size="sm" onClick={() => applyPreset("deepseek")} className={cn(model.includes('deepseek') ? "bg-purple-600 hover:bg-purple-700 text-white" : "border-purple-200 hover:bg-purple-50 text-purple-700")}>DeepSeek</Button>
                                        <Button variant={model.includes('claude') ? "default" : "outline"} size="sm" onClick={() => applyPreset("claude")} className={cn(model.includes('claude') ? "bg-orange-600 hover:bg-orange-700 text-white" : "border-orange-200 hover:bg-orange-50 text-orange-700")}>Claude</Button>
                                        <Button variant={model.includes('grok') ? "default" : "outline"} size="sm" onClick={() => applyPreset("grok")} className={cn(model.includes('grok') ? "bg-gray-800 hover:bg-gray-900 text-white" : "border-gray-300 hover:bg-gray-100")}>Grok</Button>
                                        <Button variant={model.includes('gpt') ? "default" : "outline"} size="sm" onClick={() => applyPreset("openai")} className={cn(model.includes('gpt') ? "bg-black hover:bg-gray-800" : "")}>OpenAI</Button>
                                        <Button variant={model.includes('moonshot') && !model.includes('kimi-k2.5') ? "default" : "outline"} size="sm" onClick={() => applyPreset("kimi")} className={cn(model.includes('moonshot') && !model.includes('kimi-k2.5') ? "bg-black hover:bg-gray-800" : "")}>Kimi</Button>
                                        <Button variant={model.includes('llama') || model.includes('kimi-k2.5') ? "default" : "outline"} size="sm" onClick={() => applyPreset("nvidia")} className={cn(model.includes('llama') || model.includes('kimi-k2.5') ? "bg-green-600 hover:bg-green-700 text-white" : "border-green-200 hover:bg-green-50 text-green-700")}>NVIDIA</Button>
                                    </div>

                                    <div className="flex gap-2 items-center pt-1">
                                        <Label className="text-xs text-gray-500 font-mono w-20">Select Model</Label>
                                        <select
                                            className="flex-1 h-8 text-xs border rounded px-2 bg-white"
                                            value={model}
                                            onChange={(e) => {
                                                setModel(e.target.value);
                                                const m = e.target.value;
                                                if (m.includes('gemini')) { setBaseUrl("https://generativelanguage.googleapis.com/v1beta/openai"); setExtraJson('{}'); }
                                                else if (m.includes('deepseek')) { setBaseUrl("https://api.deepseek.com"); setExtraJson('{}'); }
                                                else if (m.includes('claude')) { setBaseUrl("https://api.anthropic.com"); setExtraJson('{}'); }
                                                else if (m.includes('grok')) { setBaseUrl("https://api.x.ai/v1"); setExtraJson('{}'); }
                                                else if (m.includes('gpt')) { setBaseUrl("https://api.openai.com/v1"); setExtraJson('{}'); }
                                                else if (m.includes('moonshot-v1')) { setBaseUrl("https://api.moonshot.cn/v1"); setExtraJson('{}'); }
                                                else if (m.includes('llama') || m.includes('kimi-k2.5')) { setBaseUrl("https://integrate.api.nvidia.com/v1"); setExtraJson('{"chat_template_kwargs": {"thinking": true}, "temperature": 0.3, "top_p": 1.0, "max_tokens": 1024}'); }
                                            }}
                                        >
                                            <optgroup label="OpenAI">
                                                <option value="gpt-4o">gpt-4o</option>
                                                <option value="gpt-4-turbo">gpt-4-turbo</option>
                                                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                                            </optgroup>
                                            <optgroup label="Gemini (Google)">
                                                <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp (Latest Preview)</option>
                                                <option value="gemini-1.5-pro">gemini-1.5-pro (Stable)</option>
                                                <option value="gemini-1.5-flash">gemini-1.5-flash (Fast)</option>
                                                <option value="gemini-3-pro-preview">gemini-3-pro-preview</option>
                                                <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
                                                <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                                                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                                            </optgroup>
                                            <optgroup label="Claude (Anthropic)">
                                                <option value="claude-3-5-sonnet-20240620">claude-3-5-sonnet</option>
                                                <option value="claude-3-opus-20240229">claude-3-opus</option>
                                                <option value="claude-3-haiku-20240307">claude-3-haiku</option>
                                            </optgroup>
                                            <optgroup label="DeepSeek">
                                                <option value="deepseek-chat">deepseek-chat (V3)</option>
                                                <option value="deepseek-reasoner">deepseek-reasoner (R1)</option>
                                            </optgroup>
                                            <optgroup label="Grok (xAI)">
                                                <option value="grok-beta">grok-beta</option>
                                                <option value="grok-2">grok-2 (Latest)</option>
                                            </optgroup>
                                            <optgroup label="Kimi / NVIDIA">
                                                <option value="moonshot-v1-8k">moonshot-v1-8k (Kimi)</option>
                                                <option value="moonshotai/kimi-k2.5">kimi-k2.5 (NVIDIA)</option>
                                                <option value="meta/llama-3.1-405b-instruct">llama-3.1-405b (NVIDIA)</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-gray-500 font-mono">BASE URL</Label>
                                        <Input className="font-mono text-xs bg-gray-50" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-gray-500 font-mono">API KEY</Label>
                                        <div className="relative">
                                            <Input type="password" className="font-mono text-xs bg-gray-50 pr-10" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
                                            {apiKey && <div className="absolute right-2 top-2 w-2 h-2 bg-green-500 rounded-full" title="Key entered"></div>}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-gray-500 font-mono">MODEL ID</Label>
                                        <Input className="font-mono text-xs bg-gray-50" value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <Label className="text-xs text-gray-500 font-mono">ADVANCED JSON CONFIG</Label>
                                            <span className="text-[10px] text-gray-400">Payload Overrides</span>
                                        </div>
                                        <Textarea className="font-mono text-xs bg-gray-50 min-h-[100px]" value={extraJson} onChange={(e) => setExtraJson(e.target.value)} placeholder="{}" />
                                        <p className="text-[10px] text-gray-400">
                                            Example: {`{"temperature": 0.7, "max_tokens": 2048}`}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 flex gap-2">
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
                                        <Save className="w-4 h-4 mr-2" /> Save Global Configuration
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Testing Interface */}
                    <div className="flex flex-col gap-6">
                        <Card className="border-none shadow-md bg-white/90 backdrop-blur-sm h-full flex flex-col">
                            <CardHeader className="border-b bg-gray-50/50 pb-4">
                                <div className="flex items-center gap-2">
                                    <Play className="w-5 h-5 text-green-600" />
                                    <CardTitle className="text-lg">Visual Playground</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col gap-4 pt-6 relative overflow-hidden">
                                <div className="flex-1 bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 overflow-y-auto min-h-[300px] border border-gray-700 shadow-inner">
                                    {testOutput || <span className="text-gray-600 italic">// Output will appear here...</span>}
                                    {isTesting && <span className="animate-pulse">_</span>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Test Prompt</Label>
                                    <div className="flex gap-2">
                                        <Input value={testPrompt} onChange={(e) => setTestPrompt(e.target.value)} placeholder="Enter test message..." onKeyDown={(e) => e.key === 'Enter' && !isTesting && handleTest()} />
                                        <Button onClick={handleTest} disabled={isTesting || !apiKey} className={cn("min-w-[100px]", isTesting ? "bg-gray-400" : "bg-black hover:bg-gray-800")}>
                                            {isTesting ? <RotateCcw className="w-4 h-4 animate-spin" /> : "Send"}
                                        </Button>
                                    </div>
                                </div>
                                <div className="bg-yellow-50 border border-yellow-100 rounded p-3 text-xs text-yellow-800">
                                    <strong>Note:</strong> Saving configuration on the left will apply these settings to the AI features in Listing Generator/KYC.
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            ) : (
                /* ===== Prompt & Templates Tab ===== */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">

                    {/* Left: System Prompt Editor */}
                    <Card className="border-none shadow-md bg-white/90 backdrop-blur-sm flex flex-col">
                        <CardHeader className="border-b bg-gray-50/50 pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-indigo-600" />
                                    <CardTitle className="text-lg">System Prompt (提示词)</CardTitle>
                                </div>
                                {localStorage.getItem(PROMPT_STORAGE_KEY) && (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Custom</span>
                                )}
                            </div>
                            <CardDescription className="text-xs mt-1">
                                编辑 AI 分析时使用的系统提示词。修改后点击 Save 即时生效，应用于 Smart Analyze (AI) 功能。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-4 pt-4">
                            <Textarea
                                className="flex-1 font-mono text-xs bg-gray-50 min-h-[450px] leading-relaxed resize-none"
                                value={promptText}
                                onChange={(e) => setPromptText(e.target.value)}
                                placeholder="Enter system prompt..."
                            />

                            <div className="flex gap-2">
                                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSavePrompt}>
                                    <Save className="w-4 h-4 mr-2" />
                                    {promptSaved ? "✓ Saved!" : "Save Prompt"}
                                </Button>
                                <Button variant="outline" onClick={handleResetPrompt} title="恢复为默认提示词">
                                    <RefreshCw className="w-4 h-4 mr-1" /> Reset
                                </Button>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-800 space-y-1">
                                <strong>使用说明：</strong>
                                <ul className="list-disc list-inside space-y-0.5 ml-1">
                                    <li>提示词决定了 AI 如何从邮件中提取字段</li>
                                    <li>修改后点击 <strong>Save Prompt</strong> 即时生效</li>
                                    <li>点击 <strong>Reset</strong> 可恢复默认提示词</li>
                                    <li>提示词保存在浏览器本地，刷新页面不丢失</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right: Template Management */}
                    <Card className="border-none shadow-md bg-white/90 backdrop-blur-sm flex flex-col">
                        <CardHeader className="border-b bg-gray-50/50 pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-green-600" />
                                    <CardTitle className="text-lg">Word Templates (模板)</CardTitle>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => setShowUpload(!showUpload)} className="text-xs">
                                    <Plus className="w-3.5 h-3.5 mr-1" /> 新增模板
                                </Button>
                            </div>
                            <CardDescription className="text-xs mt-1">
                                管理 Word 文档模板，支持上传自定义模板
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-4 pt-4 overflow-y-auto">

                            {/* Upload Section */}
                            {showUpload && (
                                <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50/50 space-y-3 animate-in fade-in-50 duration-200">
                                    <h4 className="text-sm font-semibold text-blue-700">上传新模板</h4>
                                    <div className="space-y-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-600">模板名称</Label>
                                            <Input
                                                className="text-sm bg-white"
                                                placeholder="例如: Company Pro"
                                                value={uploadName}
                                                onChange={(e) => setUploadName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-600">.docx 文件</Label>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept=".docx"
                                                    className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-300 file:text-xs file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50 cursor-pointer"
                                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                            onClick={handleUploadTemplate}
                                            disabled={!uploadFile || !uploadName.trim() || isUploading}
                                        >
                                            <Upload className="w-3.5 h-3.5 mr-1" />
                                            {isUploading ? '上传中...' : '上传保存'}
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setShowUpload(false); setUploadName(''); setUploadFile(null); }}>
                                            取消
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Template List */}
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-500 font-mono">模板列表 ({templates.length})</Label>
                                {templates.map(t => (
                                    <div key={t.id} className="border rounded-lg p-3 bg-gray-50 space-y-2 group hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-gray-700 truncate">📄 {t.name}</span>
                                                    {t.isBuiltIn ? (
                                                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full shrink-0">内置</span>
                                                    ) : (
                                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full shrink-0">自定义</span>
                                                    )}
                                                    {t.isOverridden && (
                                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">已替换</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-mono truncate mt-0.5">
                                                    {t.fileName}{t.createdAt ? ` · ${new Date(t.createdAt).toLocaleDateString()}` : ''}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {t.isBuiltIn && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-7 px-2 text-xs"
                                                            onClick={() => setReplacingId(replacingId === t.id ? null : t.id)}
                                                            title="替换模板文件"
                                                        >
                                                            <Upload className="w-3.5 h-3.5 mr-1" /> 替换
                                                        </Button>
                                                        {t.isOverridden && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 hover:text-amber-700 hover:bg-amber-50 h-7 px-2 text-xs"
                                                                onClick={() => handleResetBuiltIn(t.id)}
                                                                title="恢复为默认模板"
                                                            >
                                                                <RefreshCw className="w-3.5 h-3.5 mr-1" /> 恢复
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                                {!t.isBuiltIn && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                                        onClick={() => handleDeleteTemplate(t.id)}
                                                        title="删除模板"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        {/* Inline replace file picker for built-in */}
                                        {replacingId === t.id && (
                                            <div className="bg-blue-50 rounded p-2 flex items-center gap-2 animate-in fade-in-50 duration-150">
                                                <input
                                                    type="file"
                                                    accept=".docx"
                                                    className="flex-1 text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-gray-300 file:text-xs file:bg-white cursor-pointer"
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0];
                                                        if (f) handleReplaceBuiltIn(t.id, f);
                                                    }}
                                                />
                                                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setReplacingId(null)}>取消</Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Output Naming Rule */}
                            <div className="border rounded-lg p-4 bg-white space-y-3 mt-2">
                                <h4 className="text-sm font-semibold text-gray-700">📝 输出命名规则</h4>
                                <div className="space-y-2">
                                    <Input
                                        className="font-mono text-xs bg-gray-50"
                                        value={outputPattern}
                                        onChange={(e) => setOutputPattern(e.target.value)}
                                        placeholder="Listing_Agreement_{token}"
                                    />
                                    <div className="text-[10px] text-gray-500 space-y-0.5">
                                        <div>可用变量: <code className="bg-gray-100 px-1 rounded">{'{token}'}</code> <code className="bg-gray-100 px-1 rounded">{'{company}'}</code> <code className="bg-gray-100 px-1 rounded">{'{date}'}</code> <code className="bg-gray-100 px-1 rounded">{'{template}'}</code></div>
                                        <div>预览: <span className="font-mono text-gray-700">{formatOutputName(outputPattern, { token: 'ADO', company: 'Ado Network', date: new Date().toISOString().slice(0, 10), template: 'Company' })}.docx</span></div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs" onClick={handleSavePattern}>
                                            <Save className="w-3.5 h-3.5 mr-1" />
                                            {patternSaved ? '✓ Saved!' : '保存规则'}
                                        </Button>
                                        <Button size="sm" variant="outline" className="text-xs" onClick={handleResetPattern}>
                                            <RefreshCw className="w-3 h-3 mr-1" /> 重置
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Placeholders */}
                            <div className="border rounded-lg p-4 bg-white space-y-3">
                                <h4 className="text-sm font-semibold text-gray-700">模板变量 (Placeholders)</h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {["company", "jurisdiction", "address", "listingdate", "amount", "amountInWords", "token", "signdate", "signname", "marketingamount", "marketinginwords", "tradingpair", "wallets"].map(v => (
                                        <div key={v} className="bg-gray-50 rounded px-2 py-1 font-mono text-gray-600">{`{{${v}}}`}</div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            )}
        </div>
    );
};
