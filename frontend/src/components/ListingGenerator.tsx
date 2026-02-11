import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Wand2, RefreshCw, Trash2, History as HistoryIcon, FileText, Settings } from 'lucide-react';
import { ListingAgreementData } from '../lib/types';
import { analyzeWithAI } from '../lib/ai';
import { extractFields, detectTechnicalFee } from '../lib/extraction';
import { saveAs } from 'file-saver';
import { cn } from '../lib/utils';
import { saveHistory, getHistory, clearHistory, HistoryItem } from '../lib/history';
import { DatePickerInput } from './ui/date-picker-input';
import { getAllTemplates, getTemplateData, getOutputPattern, formatOutputName, type TemplateInfo } from '../lib/template-store';
import { getCloudHistory, addCloudHistory, clearCloudHistory, type CloudHistoryItem } from '../lib/cloud-store';


const INITIAL_DATA: ListingAgreementData = {
    company: "",
    jurisdiction: "",
    address: "",
    listingdate: "",
    amount: "",
    amountInWords: "",
    token: "",
    signdate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    signname: "",
    marketingamount: "",
    marketinginwords: "",
    tradingpair: "",
    wallets: "",
    includeTechnicalFee: true
};

// Regex for Validation (sourced from Excel)
const VALIDATION_RULES: Record<keyof ListingAgreementData, RegExp | null> = {
    address: /^[\u4e00-\u9fa5a-zA-Z0-9\s#\-\.,\(\)（）]{5,150}$/,
    company: /^[\u4e00-\u9fa5a-zA-Z\(\)（）\s\.&,]{2,100}$/,
    jurisdiction: /^[\u4e00-\u9fa5a-zA-Z\s,]{2,50}$/,
    listingdate: /^(January|February|March|April|May|June|July|August|September|October|November|December)\s(0?[1-9]|[12][0-9]|3[01]),\s\d{4}$/,
    amountInWords: /^[A-Z\s\-]+$/,
    amount: /^[\d,]+(\.\d{1,2})?$/,
    token: /^[A-Z0-9]{2,10}$/,
    signdate: /^(January|February|March|April|May|June|July|August|September|October|November|December)\s(0?[1-9]|[12][0-9]|3[01]),\s\d{4}$/,
    signname: /^[\u4e00-\u9fa5a-zA-Z\s\.]{2,50}$/,
    marketingamount: /^[\d,]+(\.\d{1,2})?$/,
    marketinginwords: /^[A-Z\s\-]+$/,
    tradingpair: /^[A-Z0-9]+\/[A-Z0-9]+$/,
    wallets: /^[\w\s:\n,.\-]{10,500}$/,
    includeTechnicalFee: null
};

// Date range warning: past dates or >12 months from today
function getDateWarning(dateStr: string): string | undefined {
    if (!dateStr) return undefined;
    const MONTHS: Record<string, number> = {
        January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
        July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
    };
    const m = dateStr.match(/^(\w+)\s+(\d{1,2}),\s*(\d{4})$/);
    if (!m) return undefined;
    const monthIdx = MONTHS[m[1]];
    if (monthIdx === undefined) return undefined;
    const parsed = new Date(parseInt(m[3]), monthIdx, parseInt(m[2]));
    if (isNaN(parsed.getTime())) return undefined;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (parsed < today) {
        return `日期已过期（${dateStr}），请手动修改为正确日期`;
    }

    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + 12);
    if (parsed > maxDate) {
        return `日期超过 12 个月（${dateStr}），请确认是否正确`;
    }

    return undefined;
}

// Number to uppercase English words
function numberToWords(numStr: string): string {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
        'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const scales = ['', 'THOUSAND', 'MILLION', 'BILLION'];

    const num = parseInt(String(numStr).replace(/,/g, ''), 10);
    if (isNaN(num) || num === 0) return '';

    if (num < 0) return 'NEGATIVE ' + numberToWords(String(-num));

    function convertChunk(n: number): string {
        if (n === 0) return '';
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 ? ' ' + convertChunk(n % 100) : '');
    }

    const parts: string[] = [];
    let remaining = num;
    let scaleIdx = 0;

    while (remaining > 0) {
        const chunk = remaining % 1000;
        if (chunk > 0) {
            const word = convertChunk(chunk);
            parts.unshift(scales[scaleIdx] ? word + ' ' + scales[scaleIdx] : word);
        }
        remaining = Math.floor(remaining / 1000);
        scaleIdx++;
    }

    return parts.join(' ');
}

export const ListingGenerator: React.FC = () => {
    const [emailText, setEmailText] = useState("");
    const [data, setData] = useState<ListingAgreementData>(INITIAL_DATA);
    const [templateId, setTemplateId] = useState('__builtin_company');
    const [availableTemplates, setAvailableTemplates] = useState<TemplateInfo[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

    // AI & Memory State
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [apiKey, setApiKey] = useState(localStorage.getItem('openai_key') || import.meta.env.VITE_API_KEY || "");
    const [baseUrl, setBaseUrl] = useState(localStorage.getItem('openai_base_url') || import.meta.env.VITE_API_BASE_URL || "https://api.openai.com/v1");
    const [model, setModel] = useState(localStorage.getItem('openai_model') || import.meta.env.VITE_API_MODEL || "gpt-4o");

    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

    // Sync with local storage events
    useEffect(() => {
        const handleStorageChange = () => {
            setApiKey(localStorage.getItem('openai_key') || import.meta.env.VITE_API_KEY || "");
            setBaseUrl(localStorage.getItem('openai_base_url') || import.meta.env.VITE_API_BASE_URL || "https://api.openai.com/v1");
            setModel(localStorage.getItem('openai_model') || import.meta.env.VITE_API_MODEL || "gpt-4o");
        };
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('local-storage-update', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('local-storage-update', handleStorageChange);
        }
    }, []);

    useEffect(() => {
        // Load history from cloud first, then local as fallback
        (async () => {
            try {
                const cloudHistory = await getCloudHistory();
                if (cloudHistory && cloudHistory.length > 0) {
                    // Map cloud items to local HistoryItem format
                    const mapped = cloudHistory
                        .filter((item: any) => item.type === 'listing')
                        .map((item: any) => ({
                            id: item.id || Date.now().toString(),
                            timestamp: typeof item.timestamp === 'number' ? new Date(item.timestamp).toISOString() : item.timestamp,
                            type: item.type,
                            inputText: item.inputText,
                            outputData: item.outputData,
                        } as HistoryItem));
                    setHistoryItems(mapped);
                    return;
                }
            } catch {
                console.warn('[ListingGenerator] Cloud history load failed.');
            }
            // Fallback to local
            setHistoryItems(getHistory().filter(item => item.type === 'listing'));
        })();
    }, [showHistory]);

    // Validation Logic
    useEffect(() => {
        const errors: Record<string, boolean> = {};
        for (const key in VALIDATION_RULES) {
            const k = key as keyof ListingAgreementData;
            const rule = VALIDATION_RULES[k];
            const value = data[k];
            if (rule && typeof value === 'string' && value.trim() !== "") {
                if (!rule.test(value)) {
                    errors[k] = true;
                }
            }
        }
        setValidationErrors(errors);
    }, [data]);


    const handleBaseUrlChange = (url: string) => {
        setBaseUrl(url);
        localStorage.setItem('openai_base_url', url);
        window.dispatchEvent(new Event('local-storage-update'));
    };

    const handleModelChange = (m: string) => {
        setModel(m);
        localStorage.setItem('openai_model', m);
        window.dispatchEvent(new Event('local-storage-update'));
    };

    const applyPreset = (preset: "openai" | "kimi" | "nvidia" | "gemini" | "deepseek" | "claude" | "grok") => {
        if (preset === "openai") {
            handleBaseUrlChange("https://api.openai.com/v1");
            handleModelChange("gpt-4o");
        } else if (preset === "kimi") {
            handleBaseUrlChange("https://api.moonshot.cn/v1");
            handleModelChange("moonshot-v1-8k");
        } else if (preset === "nvidia") {
            handleBaseUrlChange("https://integrate.api.nvidia.com/v1");
            handleModelChange("moonshotai/kimi-k2.5");
        } else if (preset === "gemini") {
            handleBaseUrlChange("https://generativelanguage.googleapis.com/v1beta/openai");
            handleModelChange("gemini-1.5-flash");
        } else if (preset === "deepseek") {
            handleBaseUrlChange("https://api.deepseek.com");
            handleModelChange("deepseek-chat");
        } else if (preset === "claude") {
            handleBaseUrlChange("https://api.anthropic.com");
            handleModelChange("claude-3-5-sonnet-20240620");
        } else if (preset === "grok") {
            handleBaseUrlChange("https://api.x.ai/v1");
            handleModelChange("grok-beta");
        }
    };

    const handleAnalyze = async (mode: 'regex' | 'ai') => {
        setIsAnalyzing(true);
        try {
            let extracted: Partial<ListingAgreementData> = {};
            let hasTechnicalFee = true;

            const cleanApiKey = apiKey.trim();
            const cleanBaseUrl = baseUrl.trim();

            if (mode === 'ai') {
                if (!cleanApiKey) {
                    alert("Please enter an API Key in Settings for AI extraction.");
                    setIsAnalyzing(false);
                    return;
                }
                try {
                    const aiResult = await analyzeWithAI(emailText, { apiKey: cleanApiKey, baseUrl: cleanBaseUrl, model: model.trim() });
                    extracted = aiResult;
                } catch (e) {
                    console.error("AI Error, falling back to regex", e);
                    alert("AI Analysis failed. Falling back to Regex.");
                    extracted = extractFields(emailText);
                }
            } else {
                extracted = extractFields(emailText);
            }

            hasTechnicalFee = detectTechnicalFee(emailText);

            setData(prev => ({
                ...prev,
                ...extracted,
                includeTechnicalFee: hasTechnicalFee,
            }));

            if (!hasTechnicalFee) {
                setTemplateId("__builtin_company_waive");
            } else {
                setTemplateId("__builtin_company");
            }

            // Auto-save after analysis
            const mergedData = { ...data, ...extracted, includeTechnicalFee: hasTechnicalFee };
            const historyItem: CloudHistoryItem = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                type: 'listing',
                inputText: emailText,
                outputData: mergedData as ListingAgreementData,
            };
            // Save locally
            saveHistory({
                inputText: emailText,
                outputData: mergedData as ListingAgreementData,
                type: 'listing'
            });
            // Save to cloud
            addCloudHistory(historyItem).catch(() => { });
            setHistoryItems(prev => [historyItem as any, ...prev]);

        } catch (e) {
            console.error(e);
            alert("Analysis failed. See console.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleClear = () => {
        setData(INITIAL_DATA);
        setEmailText("");
    };


    // Load available templates
    useEffect(() => {
        getAllTemplates().then(setAvailableTemplates);
    }, []);

    // Auto-select correct built-in based on technical fee toggle
    useEffect(() => {
        if (templateId === '__builtin_company' && !data.includeTechnicalFee) {
            setTemplateId('__builtin_company_waive');
        } else if (templateId === '__builtin_company_waive' && data.includeTechnicalFee) {
            setTemplateId('__builtin_company');
        }
    }, [data.includeTechnicalFee]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const templateBytes = await getTemplateData(templateId);

            saveHistory({
                inputText: emailText,
                outputData: data,
                type: 'listing'
            });
            setHistoryItems(getHistory().filter(item => item.type === 'listing'));

            const { runListingGeneration } = await import('../lib/pyodide');

            const logicData = {
                ...data,
                walletText: data.wallets,
                wallets: {}
            };

            const resultBytes = await runListingGeneration(templateBytes, logicData);

            // Use configurable output naming
            const selectedTemplate = availableTemplates.find(t => t.id === templateId);
            const outputPattern = getOutputPattern();
            const outputName = formatOutputName(outputPattern, {
                token: data.token || 'Draft',
                company: data.company || 'Unknown',
                date: new Date().toISOString().slice(0, 10),
                template: selectedTemplate?.name || 'Template'
            });

            const blob = new Blob([resultBytes as unknown as BlobPart], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
            saveAs(blob, `${outputName}.docx`);

        } catch (e) {
            console.error(e);
            alert("Generation failed. Please check console (F12) for details. Ensure Pyodide is loaded.");
        } finally {
            setIsGenerating(false);
        }
    };

    const loadHistoryItem = (item: HistoryItem) => {
        if (item.inputText) setEmailText(item.inputText);
        if (item.outputData) setData(item.outputData as ListingAgreementData);
        setShowHistory(false);
    }

    const handleChange = (key: keyof ListingAgreementData, value: any) => {
        setData(prev => {
            const updated = { ...prev, [key]: value };
            // Auto-sync amount → amountInWords
            if (key === 'amount') {
                const words = numberToWords(value);
                if (words) updated.amountInWords = words;
            }
            // Auto-sync marketingamount → marketinginwords
            if (key === 'marketingamount') {
                const words = numberToWords(value);
                if (words) updated.marketinginwords = words;
            }
            return updated;
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-[35%_65%] gap-6 h-[calc(100vh-140px)]">

            {/* Settings Overlay */}
            {showSettings && (
                <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex items-center justify-center p-4 rounded-xl shadow-2xl border">
                    <div className="bg-white p-6 rounded-lg border shadow-lg w-full max-w-md space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-lg flex items-center gap-2"><Settings className="w-5 h-5" /> Settings</h3>
                            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <Label>Select AI Provider</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant={model.includes('gpt') ? "default" : "outline"} size="sm" onClick={() => applyPreset("openai")} className={cn(model.includes('gpt') ? "bg-black hover:bg-gray-800 text-white" : "")}>OpenAI</Button>
                                    <Button variant={model.includes('moonshot') && !model.includes('kimi-k2.5') ? "default" : "outline"} size="sm" onClick={() => applyPreset("kimi")} className={cn(model.includes('moonshot') && !model.includes('kimi-k2.5') ? "bg-black hover:bg-gray-800" : "")}>Kimi</Button>
                                    <Button variant={model.includes('llama') || model.includes('kimi-k2.5') ? "default" : "outline"} size="sm" onClick={() => applyPreset("nvidia")} className={cn(model.includes('llama') || model.includes('kimi-k2.5') ? "bg-green-600 hover:bg-green-700 text-white" : "text-green-700 border-green-200")}>NVIDIA</Button>
                                    <Button variant={model.includes('gemini') ? "default" : "outline"} size="sm" onClick={() => applyPreset("gemini")} className={cn(model.includes('gemini') ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-blue-700 border-blue-200")}>Gemini</Button>
                                    <Button variant={model.includes('deepseek') ? "default" : "outline"} size="sm" onClick={() => applyPreset("deepseek")} className={cn(model.includes('deepseek') ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-purple-700 border-purple-200")}>DeepSeek</Button>
                                    <Button variant={model.includes('claude') ? "default" : "outline"} size="sm" onClick={() => applyPreset("claude")} className={cn(model.includes('claude') ? "bg-orange-600 hover:bg-orange-700 text-white" : "text-orange-700 border-orange-200")}>Claude</Button>
                                    <Button variant={model.includes('grok') ? "default" : "outline"} size="sm" onClick={() => applyPreset("grok")} className={cn(model.includes('grok') ? "bg-gray-800 hover:bg-gray-900 text-white" : "")}>Grok</Button>
                                </div>
                                <div className="space-y-1 pt-2">
                                    <Label className="text-xs text-gray-500 font-mono">Specific Model</Label>
                                    <select
                                        className="w-full h-9 text-sm border rounded-md px-3 bg-white"
                                        value={model}
                                        onChange={(e) => {
                                            const m = e.target.value;
                                            handleModelChange(m);
                                            if (m.includes('gemini')) handleBaseUrlChange("https://generativelanguage.googleapis.com/v1beta/openai");
                                            else if (m.includes('deepseek')) handleBaseUrlChange("https://api.deepseek.com");
                                            else if (m.includes('claude')) handleBaseUrlChange("https://api.anthropic.com");
                                            else if (m.includes('grok')) handleBaseUrlChange("https://api.x.ai/v1");
                                            else if (m.includes('gpt')) handleBaseUrlChange("https://api.openai.com/v1");
                                            else if (m.includes('moonshot-v1')) handleBaseUrlChange("https://api.moonshot.cn/v1");
                                            else if (m.includes('llama') || m.includes('kimi-k2.5')) handleBaseUrlChange("https://integrate.api.nvidia.com/v1");
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
                                <div className="bg-slate-50 p-3 rounded-md border text-xs space-y-1 mt-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Current Model:</span>
                                        <span className="font-mono">{model}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Base URL:</span>
                                        <span className="font-mono text-[10px] truncate max-w-[180px]">{baseUrl}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 pt-1">
                                        Use the <strong>API Manager</strong> tab.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-4 border-t mt-2">
                                <Button onClick={() => setShowSettings(false)} className="w-full bg-black text-white hover:bg-gray-800">Save & Close</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Column: Input (35%) */}
            <div className="flex flex-col gap-6">
                <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm h-full flex flex-col">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    Email Input
                                </CardTitle>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setShowHistory(!showHistory)} title="History">
                                    <HistoryIcon className="w-4 h-4 text-gray-600" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} title="Settings">
                                    <Settings className={cn("w-4 h-4 text-gray-600", !apiKey && "text-amber-500 animate-pulse")} />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col relative overflow-hidden gap-4">
                        {showHistory ? (
                            <div className="absolute inset-0 bg-white z-10 p-4 overflow-y-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-sm">Execution History</h3>
                                    <Button variant="ghost" size="sm" onClick={() => { clearHistory(); clearCloudHistory(); setHistoryItems([]) }} className="text-red-500 h-8 px-2"><Trash2 className="w-3 h-3 mr-1" /> Clear</Button>
                                </div>
                                <div className="space-y-2">
                                    {historyItems.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No history yet.</p>}
                                    {historyItems.map(item => (
                                        <div key={item.id} onClick={() => loadHistoryItem(item)} className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group">
                                            <div className="flex justify-between">
                                                <span className="text-xs font-mono text-gray-500">{new Date(item.timestamp).toLocaleString()}</span>
                                                <span className="text-xs font-bold text-blue-600 group-hover:block hidden">Load</span>
                                            </div>
                                            <p className="text-sm truncate mt-1 text-gray-700 font-medium">{item.outputData.token || "Unknown Token"}</p>
                                            <p className="text-xs text-gray-400 truncate w-full">{item.inputText.substring(0, 50)}...</p>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setShowHistory(false)}>Close History</Button>
                            </div>
                        ) : null}

                        <Textarea
                            className="flex-1 min-h-[400px] font-mono text-sm leading-relaxed resize-none bg-gray-50 border-gray-200"
                            placeholder="Paste email content here based on BitMart format..."
                            value={emailText}
                            onChange={(e) => setEmailText(e.target.value)}
                        />

                        <div className="flex gap-2 mt-auto">
                            <Button
                                className="flex-1 bg-gray-800 hover:bg-gray-900 text-white shadow-sm"
                                onClick={() => handleAnalyze('regex')}
                                disabled={isAnalyzing}
                            >
                                Fast Analyze (Regex)
                            </Button>
                            <Button
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                onClick={() => handleAnalyze('ai')}
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                                Smart Analyze (AI)
                            </Button>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full text-xs text-gray-500 border-none shadow-sm h-6"
                            onClick={handleClear}
                        >
                            Clear All
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Form (65%) */}
            <div className="flex flex-col gap-6 overflow-y-auto pr-2">
                <Card className="border-none shadow-md bg-white/80 backdrop-blur-md h-full flex flex-col">
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-center">
                            <CardTitle>Agreement Fields</CardTitle>
                            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto max-w-[400px]">
                                {availableTemplates.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTemplateId(t.id)}
                                        className={cn("px-3 py-1 text-sm font-medium rounded-md transition-all whitespace-nowrap", templateId === t.id ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700")}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-6">
                        {/* 3 Column Grid for Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                            {/* 1. Address */}
                            <div className="space-y-1">
                                <Label className={cn("text-xs text-gray-500", validationErrors.address && "text-red-500")}>Address (公司注册地址)</Label>
                                <Input className={cn(validationErrors.address && "border-red-500 bg-red-50")} value={data.address} onChange={e => handleChange('address', e.target.value)} title="支持中英数、标点 (5-150 chars)" />
                            </div>

                            {/* 2. Company Name */}
                            <div className="space-y-1">
                                <Label className={cn("text-xs text-gray-500", validationErrors.company && "text-red-500")}>Company name (公司名称)</Label>
                                <Input className={cn(validationErrors.company && "border-red-500 bg-red-50")} value={data.company} onChange={e => handleChange('company', e.target.value)} title="支持中英、括号 (2-100 chars)" />
                            </div>

                            {/* 3. Jurisdiction */}
                            <div className="space-y-1">
                                <Label className={cn("text-xs text-gray-500", validationErrors.jurisdiction && "text-red-500")}>Jurisdiction (管辖地)</Label>
                                <Input className={cn(validationErrors.jurisdiction && "border-red-500 bg-red-50")} value={data.jurisdiction} onChange={e => handleChange('jurisdiction', e.target.value)} title="纯中英文字符" />
                            </div>

                            {/* 4. Listing Date */}
                            <div className="space-y-1">
                                <Label className={cn("text-xs text-gray-500", validationErrors.listingdate && "text-red-500")}>Listing date (上市日期)</Label>
                                <DatePickerInput
                                    value={data.listingdate}
                                    onChange={val => handleChange('listingdate', val)}
                                    hasError={!!validationErrors.listingdate}
                                    warningMessage={getDateWarning(data.listingdate)}
                                />
                            </div>

                            {/* 5. Listing Fee amount */}
                            <div className="space-y-1">
                                <Label className={cn("text-xs text-gray-500", validationErrors.amount && "text-red-500")}>Listing Fee amount</Label>
                                <Input className={cn(validationErrors.amount && "border-red-500 bg-red-50")} value={data.amount} onChange={e => handleChange('amount', e.target.value)} title="Number Only" />
                            </div>

                            {/* 6. Listing Fee in words */}
                            <div className="space-y-1">
                                <Label className={cn("text-xs text-gray-500", validationErrors.amountInWords && "text-red-500")}>Listing Fee (Words)</Label>
                                <Input className={cn(validationErrors.amountInWords && "border-red-500 bg-red-50")} value={data.amountInWords} onChange={e => handleChange('amountInWords', e.target.value)} title="ALL CAPS" />
                            </div>

                            {/* 7. Ticker name */}
                            <div className="space-y-1">
                                <Label className={cn("text-xs text-gray-500", validationErrors.token && "text-red-500")}>Ticker name (代币符号)</Label>
                                <Input className={cn(validationErrors.token && "border-red-500 bg-red-50")} value={data.token} onChange={e => handleChange('token', e.target.value)} title="UPPERCASE" />
                            </div>

                            {/* 8. Sign date */}
                            <div className="space-y-1">
                                <Label className={cn("text-xs text-gray-500", validationErrors.signdate && "text-red-500")}>Sign date (签署日期)</Label>
                                <DatePickerInput
                                    value={data.signdate}
                                    onChange={val => handleChange('signdate', val)}
                                    hasError={!!validationErrors.signdate}
                                    warningMessage={getDateWarning(data.signdate)}
                                />
                            </div>

                            {/* 9. Sign name */}
                            <div className="space-y-1">
                                <Label className={cn("text-xs text-gray-500", validationErrors.signname && "text-red-500")}>Sign name (签署人)</Label>
                                <Input className={cn(validationErrors.signname && "border-red-500 bg-red-50")} value={data.signname} onChange={e => handleChange('signname', e.target.value)} />
                            </div>

                            {/* 10. Marketing amount */}
                            <div className="space-y-1">
                                <Label className={cn("text-xs text-gray-500", validationErrors.marketingamount && "text-red-500")}>Marketing amount</Label>
                                <Input className={cn(validationErrors.marketingamount && "border-red-500 bg-red-50")} value={data.marketingamount} onChange={e => handleChange('marketingamount', e.target.value)} />
                            </div>

                            {/* 11. Marketing in words */}
                            <div className="space-y-1">
                                <Label className={cn("text-xs text-gray-500", validationErrors.marketinginwords && "text-red-500")}>Marketing in words</Label>
                                <Input className={cn(validationErrors.marketinginwords && "border-red-500 bg-red-50")} value={data.marketinginwords} onChange={e => handleChange('marketinginwords', e.target.value)} title="ALL CAPS" />
                            </div>

                            {/* 12. Trading pair */}
                            <div className="space-y-1">
                                <Label className={cn("text-xs text-gray-500", validationErrors.tradingpair && "text-red-500")}>Trading pair (交易对)</Label>
                                <Input className={cn(validationErrors.tradingpair && "border-red-500 bg-red-50")} value={data.tradingpair} onChange={e => handleChange('tradingpair', e.target.value)} placeholder="XXX/USDT" />
                            </div>

                        </div>

                        {/* 13. Wallet Address (Textarea) */}
                        <div className="space-y-1">
                            <Label className={cn("text-xs text-gray-500", validationErrors.wallets && "text-red-500")}>Wallet address (钱包地址)</Label>
                            <Textarea
                                className={cn("font-mono text-xs min-h-[100px] bg-white", validationErrors.wallets && "border-red-500 bg-red-50")}
                                placeholder={"ERC20: 0x...\nTRC20: T..."}
                                value={data.wallets}
                                onChange={e => handleChange('wallets', e.target.value)}
                            />
                        </div>


                        {/* Technical Fee Toggle + Generate Button */}
                        <div className="flex items-center justify-between pt-2 border-t mt-4 mb-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="techFee"
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={data.includeTechnicalFee}
                                    onChange={e => handleChange('includeTechnicalFee', e.target.checked)}
                                />
                                <Label htmlFor="techFee" className="cursor-pointer">Include Technical Fee Clause</Label>
                            </div>
                            <Button
                                className="bg-black hover:bg-gray-800 text-white h-10 px-6 text-sm shadow-lg rounded-md"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Generate Listing Agreement
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
