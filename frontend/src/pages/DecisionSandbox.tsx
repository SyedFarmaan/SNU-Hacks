import { useState } from 'react';
import { AlertTriangle, Sparkles, Shield, PenTool, Cloud, Building2, Megaphone, Info } from 'lucide-react';

export default function DecisionSandbox() {
    const [selected, setSelected] = useState({
        aws: true,
        rent: true,
        meta: false
    });

    const toggle = (key: keyof typeof selected) => {
        setSelected(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    }

    return (
        <div className="max-w-7xl mx-auto px-8 py-10 animate-in fade-in duration-500">
            <header className="mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffdad6] text-[#93000a] mb-4">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-bold tracking-wider uppercase">Critical Alert</span>
                </div>
                <h1 className="text-4xl font-sans font-extrabold tracking-tight-custom text-primary mb-2">
                    Liquidity Crisis Detected — Choose Your Path.
                </h1>
                <p className="text-on-surface-variant max-w-2xl leading-relaxed text-sm">
                    Projected cash shortfall in 14 days. We've analyzed 42,000 permutations to present the most viable paths forward for your treasury.
                </p>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                {/* Optimal Path Card */}
                <div className="bg-white/70 backdrop-blur-md shadow-[0_0_20px_rgba(0,82,204,0.15)] border-2 border-primary-container rounded p-6 flex flex-col h-full transition-transform hover:scale-[1.01]">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary-container block mb-1">Recommended</span>
                            <h3 className="text-xl font-bold text-on-surface">Optimal Path</h3>
                        </div>
                        <div className="bg-primary-container text-white p-2 rounded">
                            <Sparkles className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="space-y-4 flex-grow">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-on-surface-variant">Runway Extension</span>
                            <span className="text-sm font-bold text-primary-container">+22 Days Saved</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-on-surface-variant">Penalty Mitigation</span>
                            <span className="text-sm font-bold text-primary-container">₹4,500 Penalties Avoided</span>
                        </div>
                        <div className="pt-4 mt-4 border-t border-[#c3c6d6]/20">
                            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-tighter">Recalculated Runway</span>
                            <div className="h-16 w-full flex items-end gap-1 mt-2">
                                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
                                    <path d="M0,35 Q10,32 20,38 T40,30 T60,25 T80,15 T100,5" fill="none" stroke="#0052cc" strokeWidth="1.5" />
                                    <circle cx="100" cy="5" fill="#0052cc" r="2" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <button className="mt-8 w-full py-3 bg-primary text-white font-bold text-sm tracking-tight hover:brightness-110 active:scale-95 transition-all rounded-sm cursor-pointer border-none">
                        Execute Optimization
                    </button>
                </div>

                {/* Conservative Card */}
                <div className="bg-surface-container-low border border-[#c3c6d6] rounded p-6 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">Safety First</span>
                            <h3 className="text-xl font-bold text-on-surface">Conservative</h3>
                        </div>
                        <div className="bg-secondary-container text-[#51617e] p-2 rounded">
                            <Shield className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="space-y-4 flex-grow">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-on-surface-variant">Liquidity Impact</span>
                            <span className="text-sm font-bold text-[#4f5f7b]">Zero Penalties</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-on-surface-variant">Risk Level</span>
                            <span className="text-sm font-bold text-[#ba1a1a]">Low Cash Buffer</span>
                        </div>
                        <div className="pt-4 mt-4 border-t border-[#c3c6d6]/20 opacity-50">
                            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-tighter">Projected Stability</span>
                            <div className="h-16 w-full flex items-end gap-1 mt-2">
                                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
                                    <path d="M0,25 Q25,25 50,25 T100,25" fill="none" stroke="#4f5f7b" strokeWidth="1.5" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <button className="mt-8 w-full py-3 bg-surface-container-high text-on-surface font-bold text-sm tracking-tight hover:bg-[#d7e2ff] transition-all rounded-sm cursor-pointer border-none">
                        Review Strategy
                    </button>
                </div>

                {/* Custom Card */}
                <div className="border-2 border-dashed border-[#c3c6d6] rounded p-6 flex flex-col h-full group hover:border-primary-container transition-colors cursor-pointer">
                    <div className="flex-grow flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-4 group-hover:bg-[#0052cc1A] transition-colors">
                            <PenTool className="w-8 h-8 text-[#737685] group-hover:text-primary-container" />
                        </div>
                        <h3 className="text-xl font-bold text-on-surface">Build Your Own</h3>
                        <p className="text-sm text-on-surface-variant mt-2 max-w-[200px]">
                            Manually toggle obligations to create a bespoke liquidity plan.
                        </p>
                    </div>
                    <div className="mt-auto pt-8">
                        <div className="h-[1px] bg-[#c3c6d6] w-full mb-4 opacity-30"></div>
                        <span className="text-[10px] font-bold text-[#737685] uppercase tracking-widest block text-center">No Strategy Selected</span>
                    </div>
                </div>
            </section>

            {/* Bill List Section */}
            <section className="bg-surface-container-lowest rounded-sm p-8 shadow-sm">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-2xl font-sans font-bold text-primary tracking-tight-custom">Obligations Ledger</h2>
                        <p className="text-sm text-on-surface-variant mt-1">Toggle bills to see live impact on the engine above.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-sm">
                            <span className="text-xs font-semibold text-on-surface-variant">Total Selected:</span>
                            <span className="text-sm font-bold text-primary">₹{((selected.aws ? 145000 : 0) + (selected.rent ? 420000 : 0) + (selected.meta ? 277000 : 0)).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-secondary-container text-[#51617e]">
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest rounded-tl-sm">Vendor / Service</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest">Due Date</th>
                                <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-widest">Amount</th>
                                <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-widest">Priority</th>
                                <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-widest rounded-tr-sm">Payment Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#c3c6d6]/10">
                            <tr className="bg-white hover:bg-surface transition-colors">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-surface-container-low rounded flex items-center justify-center text-primary">
                                            <Cloud className="w-4 h-4" />
                                        </div>
                                        <span className="font-semibold text-sm">AWS Infrastructure</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-sm text-on-surface-variant">14 Oct, 2023</td>
                                <td className="px-6 py-5 text-right font-mono font-bold text-sm">₹1,45,000</td>
                                <td className="px-6 py-5 text-center">
                                    <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-[#ffdad6] text-[#93000a] uppercase">Critical</span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input checked={selected.aws} onChange={() => toggle('aws')} type="checkbox" className="sr-only peer" />
                                        <div className="relative w-11 h-6 bg-[#c3c6d6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                                    </label>
                                </td>
                            </tr>
                            <tr className="bg-surface-container-low hover:bg-[#e8edff] transition-colors">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[#d7e2ff] rounded flex items-center justify-center text-primary">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <span className="font-semibold text-sm">HQ Commercial Rent</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-sm text-on-surface-variant">15 Oct, 2023</td>
                                <td className="px-6 py-5 text-right font-mono font-bold text-sm">₹4,20,000</td>
                                <td className="px-6 py-5 text-center">
                                    <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-secondary-container text-[#51617e] uppercase">High</span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input checked={selected.rent} onChange={() => toggle('rent')} type="checkbox" className="sr-only peer" />
                                        <div className="relative w-11 h-6 bg-[#c3c6d6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                                    </label>
                                </td>
                            </tr>
                            <tr className="bg-white hover:bg-surface transition-colors">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-surface-container-low rounded flex items-center justify-center text-primary">
                                            <Megaphone className="w-4 h-4" />
                                        </div>
                                        <span className="font-semibold text-sm">Meta Ad Credits</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-sm text-on-surface-variant">18 Oct, 2023</td>
                                <td className="px-6 py-5 text-right font-mono font-bold text-sm">₹2,77,000</td>
                                <td className="px-6 py-5 text-center">
                                    <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-[#d7e2ff] text-on-surface-variant uppercase">Medium</span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input checked={selected.meta} onChange={() => toggle('meta')} type="checkbox" className="sr-only peer" />
                                        <div className="relative w-11 h-6 bg-[#c3c6d6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                                    </label>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="mt-8 flex justify-end gap-3">
                    <button className="px-6 py-2 border border-[#c3c6d6] text-[#041b3c] bg-transparent text-sm font-semibold hover:bg-surface-container-low transition-colors rounded-sm cursor-pointer">
                        Save Selection
                    </button>
                    <button className="px-6 py-2 bg-primary text-white border-none text-sm font-bold hover:brightness-110 transition-all rounded-sm cursor-pointer">
                        Finalize Sandbox
                    </button>
                </div>
            </section>

            {/* Contextual Information */}
            <div className="fixed bottom-8 right-8 max-w-sm pointer-events-none">
                <div className="bg-inverse-surface/90 backdrop-blur-md text-[#edf0ff] p-4 rounded-sm shadow-2xl border border-white/10 pointer-events-auto">
                    <div className="flex items-start gap-4">
                        <Info className="w-5 h-5 text-[#b2c5ff] shrink-0" />
                        <p className="text-xs leading-relaxed m-0">
                            <strong>Real-time Update:</strong> Toggling off "Meta Ad Credits" has just added <span className="text-[#b2c5ff] font-bold">4 days</span> to your projected runway in the Optimal Path model.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
