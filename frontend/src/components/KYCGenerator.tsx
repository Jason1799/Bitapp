import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { saveAs } from 'file-saver';
import { Download, FileText, Wand2, RefreshCw, Upload, X, History as HistoryIcon, Trash2 } from 'lucide-react';
import { saveHistory, getHistory, clearHistory, HistoryItem } from '../lib/memory';

const KYC_FIELDS = [
    { key: "name", label: "Name" },
    { key: "country", label: "Country" },
    { key: "gender", label: "Gender" },
    { key: "id_expired", label: "ID Expiry Status" }, // Renamed to ID Expiry Status to match screenshot slightly better
    { key: "id_expiry", label: "ID Expiry Date" },
    { key: "id_type", label: "ID Type" },
    { key: "id_number", label: "ID Number" },
    { key: "dob", label: "Date of Birth" },
    { key: "submit_time", label: "Submit Time" },
    { key: "review_time", label: "Review Time" },
    { key: "submit_ip", label: "Submit IP" },
    { key: "ip_location", label: "IP Location" },
    { key: "device_id", label: "Submit Device ID" },
    { key: "device_type", label: "Device Type" },
];

export const KYCGenerator: React.FC = () => {
    const [emailText, setEmailText] = useState("");
    const [accountId, setAccountId] = useState("");
    const [data, setData] = useState<Record<string, string>>({});
    const [images, setImages] = useState<File[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showHistory, setShowHistory] = useState(false);
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

    useEffect(() => {
        setHistoryItems(getHistory().filter(item => item.type === 'kyc'));
    }, [showHistory]);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const { runKYCExtraction } = await import('../lib/pyodide');
            const extracted = await runKYCExtraction(emailText);
            setData(prev => ({ ...prev, ...extracted }));
        } catch (e) {
            console.error(e);
            alert("Analysis failed. Ensure Pyodide is loaded.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleClear = () => {
        setEmailText("");
        setData({});
        setImages([]);
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch(`/templates/KYC.docx`);
            if (!response.ok) throw new Error("Template not found");
            const buf = await response.arrayBuffer();
            const templateBytes = new Uint8Array(buf);

            // Save History
            saveHistory({
                inputText: emailText,
                outputData: { ...data, accountId },
                type: 'kyc'
            });
            setHistoryItems(getHistory().filter(item => item.type === 'kyc'));

            // Process images
            const imageBytesList: Uint8Array[] = [];
            for (const file of images) {
                const buffer = await file.arrayBuffer();
                imageBytesList.push(new Uint8Array(buffer));
            }

            const { runKYCGeneration } = await import('../lib/pyodide');
            const resultBytes = await runKYCGeneration(templateBytes, data, accountId, imageBytesList);

            const blob = new Blob([resultBytes as unknown as BlobPart], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
            saveAs(blob, `KYC_${accountId || "Report"}.docx`);

        } catch (e) {
            console.error(e);
            alert("Generation failed. See console.");
        } finally {
            setIsGenerating(false);
        }
    };

    const loadHistoryItem = (item: HistoryItem) => {
        if (item.inputText) setEmailText(item.inputText);
        if (item.outputData) {
            const { accountId: storedAccountId, ...rest } = item.outputData;
            setData(rest);
            setAccountId(storedAccountId || "");
        }
        setShowHistory(false);
    };

    const handleChange = (key: string, value: string) => {
        setData(prev => ({ ...prev, [key]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setImages(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-[35%_65%] gap-6 h-[calc(100vh-140px)]">
            {/* Left Column: Input (35%) */}
            <div className="flex flex-col gap-6">
                <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm h-full flex flex-col">
                    <CardHeader className="pb-3 pt-4 px-4">
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <FileText className="w-4 h-4 text-blue-600" />
                                KYC Raw Text
                            </CardTitle>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHistory(!showHistory)} title="History">
                                <HistoryIcon className="w-3.5 h-3.5 text-slate-500" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col relative overflow-hidden gap-4 p-4 pt-0">
                        {showHistory ? (
                            <div className="absolute inset-0 bg-white z-10 p-4 overflow-y-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-sm">KYC History</h3>
                                    <Button variant="ghost" size="sm" onClick={() => { clearHistory(); setHistoryItems([]) }} className="text-red-500 h-8 px-2"><Trash2 className="w-3 h-3 mr-1" /> Clear</Button>
                                </div>
                                <div className="space-y-2">
                                    {historyItems.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No history yet.</p>}
                                    {historyItems.map(item => (
                                        <div key={item.id} onClick={() => loadHistoryItem(item)} className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group">
                                            <div className="flex justify-between">
                                                <span className="text-xs font-mono text-gray-500">{new Date(item.timestamp).toLocaleString()}</span>
                                                <span className="text-xs font-bold text-blue-600 group-hover:block hidden">Load</span>
                                            </div>
                                            <p className="text-sm truncate mt-1 text-gray-700 font-medium">{item.outputData.accountId || item.outputData.name || "Unknown User"}</p>
                                            <p className="text-xs text-gray-400 truncate w-full">{item.inputText.substring(0, 50)}...</p>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setShowHistory(false)}>Close History</Button>
                            </div>
                        ) : null}

                        <Textarea
                            className="flex-1 min-h-[200px] font-mono text-sm leading-relaxed resize-none bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                            placeholder="Paste KYC raw text here..."
                            value={emailText}
                            onChange={(e) => setEmailText(e.target.value)}
                        />

                        {/* File Upload Area */}
                        <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 bg-gray-50/30"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="flex items-center gap-2 text-gray-500">
                                <Upload className="w-4 h-4" />
                                <span className="text-xs font-medium">Drag and drop files</span>
                            </div>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                        </div>

                        {/* Image Previews */}
                        {images.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto py-2 min-h-[80px]">
                                {images.map((file, idx) => (
                                    <div key={idx} className="relative group w-16 h-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden border shadow-sm">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt="preview"
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-bl"
                                            onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Button
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm mt-auto"
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                        >
                            {isAnalyzing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                            Smart Analyze
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Form (65%) */}
            <div className="flex flex-col gap-6 overflow-y-auto pr-2">
                <Card className="border-none shadow-md bg-white/80 backdrop-blur-md h-full flex flex-col">
                    <CardHeader className="pb-4">
                        <CardTitle>KYC Data Fields</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-6">
                        <div className="space-y-6">
                            {/* Account ID standalone */}
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Account ID (CID)</Label>
                                <Input value={accountId} onChange={e => setAccountId(e.target.value)} placeholder="e.g. 1234567" className="font-mono" />
                            </div>

                            {/* 3 Column Grid for fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {KYC_FIELDS.map(field => (
                                    <div key={field.key} className="space-y-1">
                                        <Label className="text-xs text-gray-500">{field.label}</Label>
                                        <Input
                                            value={data[field.key] || ""}
                                            onChange={e => handleChange(field.key, e.target.value)}
                                            className="bg-white"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Generate Button at bottom right */}
                        <div className="flex items-center justify-end pt-4 border-t mt-auto gap-3">
                            <Button
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-10 px-4 text-sm"
                                onClick={handleClear}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear All
                            </Button>
                            <Button
                                className="bg-black hover:bg-gray-800 text-white h-10 px-6 text-sm shadow-lg rounded-md"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                                Generate KYC Document
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
