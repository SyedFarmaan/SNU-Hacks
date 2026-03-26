import { useState } from 'react';
import { Brain, ListTodo, Landmark, Eye, PlayCircle, X, CheckCircle2 } from 'lucide-react';

export default function ActionExecution() {
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <div className="flex-grow p-8 max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
            {/* Column 1: Decision Logic (Left) */}
            <section className="space-y-6">
                <div className="bg-[#f4f5f7] p-6 rounded-sm border border-[#c3c6d6]/50 h-full">
                    <div className="flex items-center gap-2 mb-6">
                        <Brain className="w-5 h-5 text-primary" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant">Decision Logic</h2>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-bold text-on-surface mb-3">Chain-of-Thought Reasoning</p>
                            <ul className="space-y-4 text-sm text-on-surface-variant leading-relaxed">
                                <li className="flex gap-3">
                                    <span className="text-primary font-bold">01.</span>
                                    <span>Detected ₹1.2M tax obligation due in 7 days. prioritizing liquidity preservation.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-primary font-bold">02.</span>
                                    <span>Analyzed vendor "BuildMart" contract terms: No late fees applicable for 15-day grace period.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-primary font-bold">03.</span>
                                    <span>Strategy: Defer BuildMart non-critical supply payment by 10 days to optimize interest yields in sweep account.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="text-primary font-bold">04.</span>
                                    <span>Executing partial payment of ₹28,000 to maintain tier-1 credit status while holding remaining balance.</span>
                                </li>
                            </ul>
                        </div>
                        <div className="pt-6 border-t border-[#c3c6d6]/20">
                            <div className="flex items-center justify-between text-xs mb-2">
                                <span className="text-on-surface-variant">AI Confidence Score</span>
                                <span className="font-bold text-primary">98.4%</span>
                            </div>
                            <div className="w-full bg-[#e8edff] h-1.5 rounded-full overflow-hidden">
                                <div className="bg-primary h-full w-[98%]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Column 2: Checklist & Execution (Right) */}
            <section className="space-y-6">
                <div className="bg-white p-6 rounded-sm border border-[#c3c6d6]/50 shadow-sm h-full flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <ListTodo className="w-5 h-5 text-primary" />
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant">Execution Queue</h2>
                        </div>
                        <span className="text-xs text-on-surface-variant bg-surface-container-low px-2 py-1 rounded">3 Tasks Pending</span>
                    </div>

                    <div className="space-y-4 flex-grow">
                        {/* Task Item 1 */}
                        <div className="group p-4 bg-surface-container-low border-l-4 border-primary rounded-sm transition-all hover:bg-[#e8edff]">
                            <div className="flex items-start gap-4">
                                <input className="mt-1 rounded-sm border-[#737685] text-primary focus:ring-primary h-4 w-4" type="checkbox" />
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold text-on-surface">Transfer ₹28,000 to BuildMart</p>
                                        <span className="text-xs font-bold text-primary">HIGH PRIORITY</span>
                                    </div>
                                    <p className="text-xs text-on-surface-variant mt-1">Partial payment for Invoice #BM-99281. Preserves credit score.</p>
                                    <div className="mt-3 flex items-center gap-4">
                                        <button onClick={() => setModalOpen(true)} className="bg-transparent border-none text-xs font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer">
                                            <Landmark className="w-4 h-4" /> Pay Now
                                        </button>
                                        <button className="bg-transparent border-none text-xs font-bold text-on-surface-variant flex items-center gap-1 hover:text-on-surface cursor-pointer">
                                            <Eye className="w-4 h-4" /> View Invoice
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Task Item 2 */}
                        <div className="group p-4 bg-white border border-[#c3c6d6]/30 rounded-sm transition-all hover:bg-surface-container-low">
                            <div className="flex items-start gap-4">
                                <input className="mt-1 rounded-sm border-[#737685] text-primary focus:ring-primary h-4 w-4" type="checkbox" />
                                <div className="flex-grow">
                                    <p className="font-semibold text-on-surface">Send Deferral Notice to Apex Logistics</p>
                                    <p className="text-xs text-on-surface-variant mt-1">Automated outreach for 12-day payment extension on Q3 services.</p>
                                    <div className="mt-3 flex items-center gap-4">
                                        <span className="text-xs text-[#51617e] bg-secondary-container px-2 py-0.5 rounded-sm">Communication Drafted</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Task Item 3 */}
                        <div className="group p-4 bg-white border border-[#c3c6d6]/30 rounded-sm transition-all hover:bg-surface-container-low">
                            <div className="flex items-start gap-4">
                                <input className="mt-1 rounded-sm border-[#737685] text-primary focus:ring-primary h-4 w-4" type="checkbox" />
                                <div className="flex-grow">
                                    <p className="font-semibold text-on-surface">Update Cash Flow Projection</p>
                                    <p className="text-xs text-on-surface-variant mt-1">Sync new deferral timelines with the master financial dashboard.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-[#c3c6d6]/20 flex justify-center">
                        <button className="w-full bg-[#0052cc] text-white py-4 px-8 rounded-sm font-bold tracking-tight hover:bg-primary active:scale-[0.98] transition-all flex items-center justify-center gap-3 border-none cursor-pointer">
                            <PlayCircle className="w-5 h-5" />
                            Execute Approved Plan
                        </button>
                    </div>
                </div>
            </section>

            {/* UPI / Bank Modal Context Overlay */}
            {modalOpen && (
                <div className="fixed inset-0 bg-[#041b3c]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-sm border border-[#c3c6d6] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-on-surface">Confirm Transfer</h3>
                                    <p className="text-sm text-on-surface-variant">Vendor: BuildMart Solutions</p>
                                </div>
                                <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-[#e8edff] rounded-sm cursor-pointer border-none bg-transparent">
                                    <X className="w-5 h-5 text-on-surface-variant" />
                                </button>
                            </div>

                            <div className="bg-surface-container-low p-4 rounded-sm mb-6 flex flex-col items-center">
                                <span className="text-xs text-on-surface-variant font-medium mb-1">Total Amount</span>
                                <span className="text-3xl font-extrabold text-[#003d9b]">₹28,000.00</span>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-4 p-3 border border-primary bg-[#e0e8ff]/30 rounded-sm">
                                    <Landmark className="w-5 h-5 text-primary" />
                                    <div className="flex-grow">
                                        <p className="text-sm font-bold m-0">Standard Chartered - Corporate</p>
                                        <p className="text-xs text-on-surface-variant m-0">Ending in 8892 • Bal: ₹14.2M</p>
                                    </div>
                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                </div>
                            </div>

                            <button
                                onClick={() => setModalOpen(false)}
                                className="w-full bg-primary text-white border-none py-3 rounded-sm font-bold hover:bg-[#002f7a] cursor-pointer transition-all"
                            >
                                Authorize with Finaxis Key
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
