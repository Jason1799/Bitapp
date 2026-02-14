import { useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ListingGenerator } from "./components/ListingGenerator"
import { KYCGenerator } from "./components/KYCGenerator"
import { APIManager } from "./components/APIManager"
import { getCloudConfig, getCloudPrompt } from "./lib/cloud-store"
import { PROMPT_STORAGE_KEY } from "./lib/ai"

function App() {
    // Global cloud config loading — runs on every page load
    // This ensures that API config saved by one user is available to all users
    useEffect(() => {
        (async () => {
            try {
                const cloudConfig = await getCloudConfig();
                if (cloudConfig && cloudConfig.apiKey) {
                    localStorage.setItem('openai_key', cloudConfig.apiKey);
                    localStorage.setItem('openai_base_url', cloudConfig.baseUrl || 'https://api.openai.com/v1');
                    localStorage.setItem('openai_model', cloudConfig.model || 'gpt-4o');
                    localStorage.setItem('openai_extra_json', cloudConfig.extraJson || '{}');
                    window.dispatchEvent(new Event('local-storage-update'));
                    console.log('[App] Cloud config loaded successfully');
                }

                const cloudPrompt = await getCloudPrompt();
                if (cloudPrompt) {
                    localStorage.setItem(PROMPT_STORAGE_KEY, cloudPrompt);
                    console.log('[App] Cloud prompt loaded successfully');
                }
            } catch {
                console.warn('[App] Cloud sync failed on startup, using local data.');
            }
        })();
    }, []);
    return (
        <Tabs defaultValue="listing" orientation="vertical" className="min-h-screen bg-secondary/30 flex font-sans text-foreground">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-border flex flex-col fixed h-full z-10">
                <div className="h-16 flex items-center px-6 border-b border-border">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary text-primary-foreground px-2 py-1 rounded-md font-bold text-lg tracking-tight">
                            BitMart
                        </div>
                        <span className="font-semibold text-lg tracking-tight">Generator</span>
                    </div>
                </div>

                <div className="p-4 flex-1">
                    <TabsList className="flex flex-col h-auto bg-transparent gap-2 p-0 w-full items-stretch">
                        <TabsTrigger
                            value="listing"
                            className="justify-start px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                        >
                            Listing Agreement
                        </TabsTrigger>
                        <TabsTrigger
                            value="kyc"
                            className="justify-start px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                        >
                            KYC Generator
                        </TabsTrigger>
                        <TabsTrigger
                            value="api"
                            className="justify-start px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                        >
                            API Manager
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-auto pb-4">
                        <div className="px-4 py-3 rounded-xl bg-secondary/50 text-xs text-muted-foreground font-mono">
                            <p>Secure Environment</p>
                            <p className="mt-1 opacity-70">Client-Side Processing</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 overflow-y-auto h-screen w-full bg-secondary/30">
                <TabsContent value="listing" className="mt-0 outline-none animate-in fade-in-50 duration-300 slide-in-from-bottom-2 p-8">
                    <div className="max-w-[1600px] mx-auto">
                        <ListingGenerator />
                    </div>
                </TabsContent>
                <TabsContent value="kyc" className="mt-0 outline-none animate-in fade-in-50 duration-300 slide-in-from-bottom-2 p-8">
                    <div className="max-w-[1600px] mx-auto">
                        <KYCGenerator />
                    </div>
                </TabsContent>
                <TabsContent value="api" className="mt-0 h-full outline-none animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
                    <APIManager />
                </TabsContent>
            </main>
        </Tabs>
    )
}

export default App
