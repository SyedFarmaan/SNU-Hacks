import { AlertTriangle, Wallet, AlertCircle, Zap } from 'lucide-react';

export default function CashFlowForecast() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-[1440px] mx-auto px-8 py-8 relative">
            <div className="w-[100vw] relative left-1/2 -translate-x-1/2 max-w-none bg-[#ba1a1a] text-white py-2 px-8 flex items-center justify-center gap-3 shadow-md -mt-8 mb-8">
                <AlertTriangle size={14} className="text-white" />
                <p className="text-xs font-semibold tracking-tight uppercase m-0">Cash shortfall of ₹88,000 detected in 11 days — Review Decision Engine</p>
            </div>

            {/* Hero Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary-container"></div>
                    <p className="text-on-surface-variant text-xs font-semibold tracking-widest uppercase mb-4 m-0">Financial Health</p>
                    <div className="relative flex items-center justify-center w-32 h-32">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle className="text-[#f1f3ff]" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8"></circle>
                            <circle cx="64" cy="64" fill="transparent" r="58" stroke="#36B37E" strokeDasharray="364.4" strokeDashoffset="65.6" strokeLinecap="round" strokeWidth="8"></circle>
                        </svg>
                        <span className="absolute text-3xl font-extrabold tracking-tight-custom text-[#36B37E]">82</span>
                    </div>
                    <p className="mt-4 text-xs text-on-surface-variant font-medium m-0">Safe range: 75+</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border-2 border-[#ba1a1a]/10 flex flex-col items-center justify-center text-center">
                    <p className="text-on-surface-variant text-xs font-semibold tracking-widest uppercase mb-2 m-0">Days to Zero</p>
                    <div className="flex flex-col items-center">
                        <span className="text-7xl font-sans font-black text-[#bf2600] tracking-tighter leading-none m-0">11</span>
                        <span className="text-on-surface font-bold text-sm tracking-tight m-0">Days Remaining</span>
                    </div>
                    <div className="mt-6 flex items-center gap-2 px-3 py-1 bg-[#ffdad6] text-[#93000a] rounded-full text-[10px] font-bold">
                        <AlertCircle size={12} />
                        CRITICAL THRESHOLD REACHED
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg flex flex-col justify-between shadow-sm relative">
                    <div className="absolute top-4 right-4 text-primary opacity-20">
                        <Wallet size={36} />
                    </div>
                    <div>
                        <p className="text-on-surface-variant text-xs font-semibold tracking-widest uppercase mb-1 m-0">Available Cash</p>
                        <h2 className="text-4xl font-extrabold tracking-tight-custom text-on-background mt-2 m-0">₹4,12,500</h2>
                    </div>
                    <div className="mt-8 pt-4 border-t border-[#c3c6d6]/10">
                        <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-on-surface-variant">Reserve Target</span>
                            <span className="font-bold text-on-surface">₹5,00,000</span>
                        </div>
                        <div className="w-full bg-[#f1f3ff] h-1.5 rounded-full overflow-hidden">
                            <div className="bg-primary h-full w-[82.5%]"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Forecast Chart Section */}
            <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h3 className="text-lg font-bold tracking-tight-custom text-on-background m-0">Cash Flow Forecast</h3>
                        <p className="text-sm text-on-surface-variant m-0 mt-1">Liquidity projection for the next 30 days</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-[#d6e3ff] border-none text-primary text-xs font-bold rounded-sm shadow-sm hover:opacity-90 transition-opacity cursor-pointer text-[#091c35]">EXPORT PDF</button>
                        <button className="px-4 py-2 bg-primary border-none text-white text-xs font-bold rounded-sm shadow-sm hover:opacity-90 transition-opacity cursor-pointer">RUN ENGINE</button>
                    </div>
                </div>

                <div className="w-full h-72 relative mt-4">
                    <div className="absolute inset-0 flex flex-col justify-between opacity-30 pointer-events-none">
                        <div className="border-t border-[#c3c6d6]/30 w-full h-px"></div>
                        <div className="border-t border-[#c3c6d6]/30 w-full h-px"></div>
                        <div className="border-t border-[#ba1a1a]/40 w-full h-px border-dashed z-10 flex items-center justify-end px-2">
                            <span className="text-[10px] text-[#ba1a1a] font-bold uppercase tracking-widest bg-white px-1">Zero Balance Line</span>
                        </div>
                        <div className="border-t border-[#c3c6d6]/30 w-full h-px"></div>
                        <div className="border-t border-[#c3c6d6]/30 w-full h-px"></div>
                    </div>

                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 300">
                        <defs>
                            <linearGradient id="posGradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#36B37E" stopOpacity="0.4"></stop>
                                <stop offset="100%" stopColor="#36B37E" stopOpacity="0"></stop>
                            </linearGradient>
                            <linearGradient id="negGradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#BF2600" stopOpacity="0"></stop>
                                <stop offset="100%" stopColor="#BF2600" stopOpacity="0.3"></stop>
                            </linearGradient>
                        </defs>
                        <path d="M0,50 L200,60 L350,150 L380,180 L380,180 L0,180 Z" fill="url(#posGradient)"></path>
                        <path d="M380,180 L500,240 L700,260 L1000,220 L1000,180 L380,180 Z" fill="url(#negGradient)"></path>
                        <path d="M0,50 L200,60 L350,150 L500,240 L700,260 L1000,220" fill="none" stroke="#003d9b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>
                        <circle cx="366" cy="180" fill="#BF2600" r="5"></circle>
                        <line stroke="#BF2600" strokeDasharray="4,4" strokeWidth="1" x1="366" x2="366" y1="0" y2="300"></line>
                    </svg>

                    <div className="absolute bottom-[-24px] w-full flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                        <span>Today</span>
                        <span className="text-[#bf2600]">Day 11 (Deficit)</span>
                        <span>Day 20</span>
                        <span>Day 30</span>
                    </div>
                </div>
            </div>

            {/* Active Obligations Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mt-12 pb-24">
                <div className="px-8 py-5 flex justify-between items-center bg-[#cdddff]/10">
                    <h3 className="text-sm font-bold tracking-tight-custom text-on-background uppercase tracking-widest m-0">Active Obligations</h3>
                    <div className="flex gap-4">
                        <span className="text-[10px] text-on-surface-variant flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span> Urgent</span>
                        <span className="text-[10px] text-on-surface-variant flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Planned</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#cdddff] text-[#51617e] text-[11px] font-bold uppercase tracking-widest">
                                <th className="px-8 py-3">Vendor</th>
                                <th className="px-6 py-3">Amount (₹)</th>
                                <th className="px-6 py-3">Due Date</th>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3">Flexibility</th>
                                <th className="px-8 py-3 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#cfcfcf]/30">
                            <tr className="hover:bg-[#f1f3ff] transition-colors group">
                                <td className="px-8 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-sm bg-[#e0e8ff] flex items-center justify-center text-xs font-bold text-primary">AWS</div>
                                        <span className="text-sm font-semibold text-on-surface">Amazon Web Services</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-mono font-bold text-on-surface">1,42,000</td>
                                <td className="px-6 py-4 text-xs font-medium text-on-surface-variant">Nov 12, 2023</td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] px-2 py-0.5 rounded-sm bg-[#e0e8ff] font-bold uppercase text-[#041b3c]">Infrastructure</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[9px] font-black tracking-tighter px-2 py-1 bg-[#ba1a1a]/10 text-[#ba1a1a] rounded-sm uppercase">MUST PAY</span>
                                </td>
                                <td className="px-8 py-4 text-right">
                                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">Pending</span>
                                </td>
                            </tr>
                            <tr className="hover:bg-[#f1f3ff] transition-colors group">
                                <td className="px-8 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-sm bg-[#e0e8ff] flex items-center justify-center text-xs font-bold text-primary">SLK</div>
                                        <span className="text-sm font-semibold text-on-surface">Slack Technologies</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-mono font-bold text-on-surface">12,500</td>
                                <td className="px-6 py-4 text-xs font-medium text-on-surface-variant">Nov 15, 2023</td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] px-2 py-0.5 rounded-sm bg-[#e0e8ff] font-bold uppercase text-[#041b3c]">SaaS</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[9px] font-black tracking-tighter px-2 py-1 bg-slate-200 text-slate-600 rounded-sm uppercase">NEGOTIABLE</span>
                                </td>
                                <td className="px-8 py-4 text-right">
                                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">Scheduled</span>
                                </td>
                            </tr>
                            <tr className="hover:bg-[#f1f3ff] transition-colors group">
                                <td className="px-8 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-sm bg-[#e0e8ff] flex items-center justify-center text-xs font-bold text-primary">RE</div>
                                        <span className="text-sm font-semibold text-on-surface">Regus Properties</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-mono font-bold text-on-surface">2,10,000</td>
                                <td className="px-6 py-4 text-xs font-medium text-on-surface-variant">Nov 18, 2023</td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] px-2 py-0.5 rounded-sm bg-[#e0e8ff] font-bold uppercase text-[#041b3c]">Rent</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[9px] font-black tracking-tighter px-2 py-1 bg-[#ba1a1a]/10 text-[#ba1a1a] rounded-sm uppercase">MUST PAY</span>
                                </td>
                                <td className="px-8 py-4 text-right">
                                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">Pending</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-transparent border-t border-[#cfcfcf]/30 flex justify-center">
                    <button className="text-[10px] font-bold text-primary tracking-widest uppercase hover:underline border-none bg-transparent cursor-pointer disabled:opacity-50">View All 24 Obligations</button>
                </div>
            </div>

            <button className="fixed bottom-8 right-8 w-14 h-14 border-none cursor-pointer bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform group z-50">
                <Zap size={24} />
            </button>
        </div>
    );
}
