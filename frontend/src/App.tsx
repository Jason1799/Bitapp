import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ListingGenerator } from "./components/ListingGenerator"
import { KYCGenerator } from "./components/KYCGenerator"
import { APIManager } from "./components/APIManager"

function App() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 font-sans text-slate-900">
            <div className="max-w-[1600px] mx-auto space-y-6">
                <header className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 text-white px-3 py-1.5 rounded-md font-bold text-lg tracking-tight">
                            BitMart
                        </div>
                        <h1 className="text-lg font-medium text-slate-600">Agreement Generator</h1>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                        Client-Side Secure Processing
                    </div>
                </header>

                <main>
                    <Tabs defaultValue="listing" className="w-full space-y-8">
                        <div className="flex justify-center">
                            <TabsList className="grid w-[600px] grid-cols-3 h-12 bg-slate-100 p-1 rounded-xl">
                                <TabsTrigger value="listing" className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all duration-200">Listing Agreement</TabsTrigger>
                                <TabsTrigger value="kyc" className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all duration-200">KYC Generator</TabsTrigger>
                                <TabsTrigger value="api" className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all duration-200">API Manager</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="listing" className="outline-none animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
                            <ListingGenerator />
                        </TabsContent>
                        <TabsContent value="kyc" className="outline-none animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
                            <KYCGenerator />
                        </TabsContent>
                        <TabsContent value="api" className="outline-none animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
                            <APIManager />
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
        </div>
    )
}

export default App
