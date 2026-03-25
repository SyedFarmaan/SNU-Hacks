import React from 'react';
import { Plus, ArrowUp, ArrowDown, Search, Filter, ChevronLeft, ChevronRight, TrendingUp, AlertCircle } from 'lucide-react';

export default function ObligationsLedger() {
    return (
        <div className="max-w-[1440px] mx-auto px-8 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Header & Action Row */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-on-surface mb-1">Obligations Ledger</h1>
                    <p className="text-sm text-on-surface-variant">Centralized tracking for all liabilities and expected credits.</p>
                </div>
                <button className="bg-primary-container text-white px-4 py-2 text-sm font-semibold rounded-sm flex items-center gap-2 hover:bg-primary transition-all active:scale-95 shadow-sm border-none cursor-pointer">
                    <Plus size={18} />
                    Add Obligation
                </button>
            </div>

            {/* Summary Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 bg-white border-none shadow-sm rounded-lg overflow-hidden">
                <div className="p-6 border-r border-[#c3c6d6]/15 flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">Payables</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tighter text-on-surface">₹5.2L</span>
                        <span className="text-xs text-[#ba1a1a] font-medium flex items-center">
                            <ArrowUp size={14} className="mr-1" /> 12%
                        </span>
                    </div>
                </div>
                <div className="p-6 border-r border-[#c3c6d6]/15 flex flex-col bg-[#f1f3ff]/30">
                    <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">Receivables</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tighter text-on-surface">₹3.1L</span>
                        <span className="text-xs text-primary font-medium flex items-center">
                            <ArrowDown size={14} className="mr-1" /> 5%
                        </span>
                    </div>
                </div>
                <div className="p-6 flex flex-col bg-[#e0e8ff]/20">
                    <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">Net Balance</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tighter text-[#ba1a1a]">-₹2.1L</span>
                        <span className="text-xs text-on-surface-variant font-medium">Critical Threshold</span>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex bg-surface-container-low p-1 rounded-sm">
                    <button className="px-4 py-1.5 text-xs font-semibold border-none rounded-sm bg-white text-primary shadow-sm cursor-pointer">All</button>
                    <button className="px-4 py-1.5 text-xs font-medium border-none bg-transparent text-on-surface-variant hover:text-on-surface cursor-pointer">Payables</button>
                    <button className="px-4 py-1.5 text-xs font-medium border-none bg-transparent text-on-surface-variant hover:text-on-surface cursor-pointer">Receivables</button>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                        <input
                            className="bg-white border-none text-sm pl-10 pr-4 py-2 w-64 rounded-sm focus:outline-none focus:ring-1 focus:ring-primary-container/30"
                            placeholder="Search vendor or category..."
                            type="text"
                        />
                    </div>
                    <button className="bg-surface-container-low p-2 rounded-sm border-none cursor-pointer text-on-surface-variant hover:bg-[#e0e8ff] transition-all">
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            {/* High-Density Ledger Table */}
            <div className="bg-white rounded-lg shadow-sm border-none overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#cdddff]/30 border-b border-[#c3c6d6]/20">
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#51617e]">Vendor / Entity</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#51617e]">Category</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#51617e] text-right">Amount</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#51617e]">Due Date</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#51617e]">Flexibility</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#51617e]">Status</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#51617e] w-32"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#c3c6d6]/10">
                            {/* Row 1 */}
                            <tr className="group hover:bg-[#f1f3ff]/40 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-sm bg-[#e0e8ff] flex items-center justify-center font-bold text-primary text-xs">AS</div>
                                        <div>
                                            <p className="text-sm font-semibold text-on-surface m-0">Amazon Web Services</p>
                                            <p className="text-[11px] text-on-surface-variant m-0">INV-882910</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-[#d6e3ff] text-[#091c35] text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase">SaaS</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <p className="text-sm font-bold text-[#ba1a1a] m-0">₹1,42,000</p>
                                    <p className="text-[11px] text-on-surface-variant m-0">Payable</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm text-on-surface m-0">Oct 24, 2023</p>
                                    <p className="text-[11px] text-[#ba1a1a] font-medium m-0">In 2 days</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="w-24 bg-[#e0e8ff] h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-[#ba1a1a] w-1/4 h-full"></div>
                                    </div>
                                    <p className="text-[10px] mt-1 text-on-surface-variant m-0 pt-1">Low - Hard Cutoff</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-[#7b2600]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#7b2600]"></span> Pending
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="opacity-0 border-none cursor-pointer group-hover:opacity-100 transition-opacity bg-primary-container text-white text-[10px] font-bold px-3 py-1 rounded-sm hover:bg-primary">MARK PAID</button>
                                </td>
                            </tr>
                            {/* Row 2 */}
                            <tr className="group hover:bg-[#f1f3ff]/40 transition-colors bg-[#f1f3ff]/10">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-sm bg-[#e0e8ff] flex items-center justify-center font-bold text-primary text-xs">RE</div>
                                        <div>
                                            <p className="text-sm font-semibold text-on-surface m-0">Reliance Retail Ltd.</p>
                                            <p className="text-[11px] text-on-surface-variant m-0">CR-44021</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-[#ffdbcf] text-[#812800] text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase">Inventory</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <p className="text-sm font-bold text-primary m-0">₹2,10,000</p>
                                    <p className="text-[11px] text-on-surface-variant m-0">Receivable</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm text-on-surface m-0">Oct 28, 2023</p>
                                    <p className="text-[11px] text-on-surface-variant m-0">In 6 days</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="w-24 bg-[#e0e8ff] h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-primary w-3/4 h-full"></div>
                                    </div>
                                    <p className="text-[10px] mt-1 text-on-surface-variant m-0 pt-1">High - Negotiable</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Expected
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="opacity-0 border-none cursor-pointer group-hover:opacity-100 transition-opacity bg-primary-container text-white text-[10px] font-bold px-3 py-1 rounded-sm hover:bg-primary">CONFIRM</button>
                                </td>
                            </tr>
                            {/* Row 3 */}
                            <tr className="group hover:bg-[#f1f3ff]/40 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-sm bg-[#e0e8ff] flex items-center justify-center font-bold text-primary text-xs">DL</div>
                                        <div>
                                            <p className="text-sm font-semibold text-on-surface m-0">DLF Cyber City</p>
                                            <p className="text-[11px] text-on-surface-variant m-0">RENT-NOV-23</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-[#c3c6d6]/30 text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase">Rent</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <p className="text-sm font-bold text-[#ba1a1a] m-0">₹3,78,000</p>
                                    <p className="text-[11px] text-on-surface-variant m-0">Payable</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm text-on-surface m-0">Nov 01, 2023</p>
                                    <p className="text-[11px] text-on-surface-variant font-medium m-0">Next month</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="w-24 bg-[#e0e8ff] h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-[#4f5f7b] w-1/2 h-full"></div>
                                    </div>
                                    <p className="text-[10px] mt-1 text-on-surface-variant m-0 pt-1">Medium - Standard</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#737685]"></span> Scheduled
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="opacity-0 border-none cursor-pointer group-hover:opacity-100 transition-opacity bg-primary-container text-white text-[10px] font-bold px-3 py-1 rounded-sm hover:bg-primary">EDIT</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-3 border-t border-[#c3c6d6]/10 flex items-center justify-between">
                    <span className="text-xs text-on-surface-variant font-medium">Showing 1-12 of 84 items</span>
                    <div className="flex items-center gap-1">
                        <button className="p-1 hover:bg-surface-container-low rounded-sm bg-transparent border-none cursor-pointer"><ChevronLeft size={18} /></button>
                        <button className="w-6 h-6 flex items-center justify-center bg-primary text-white border-none text-xs font-bold rounded-sm cursor-pointer border-none">1</button>
                        <button className="w-6 h-6 flex items-center justify-center hover:bg-surface-container-low text-on-surface-variant bg-transparent text-xs font-medium rounded-sm border-none cursor-pointer">2</button>
                        <button className="w-6 h-6 flex items-center justify-center hover:bg-surface-container-low text-on-surface-variant bg-transparent text-xs font-medium rounded-sm border-none cursor-pointer">3</button>
                        <button className="p-1 hover:bg-surface-container-low rounded-sm bg-transparent border-none cursor-pointer"><ChevronRight size={18} /></button>
                    </div>
                </div>
            </div>

            {/* Asymmetric Insight Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 m-0">
                        <TrendingUp size={18} className="text-primary" />
                        Liquidity Projection
                    </h3>
                    <div className="h-64 bg-[#f1f3ff]/50 rounded-lg p-6 relative flex flex-col justify-end">
                        <div className="absolute inset-0 p-8 flex items-end gap-2 opacity-60">
                            <div className="flex-1 bg-primary/20 h-[30%] rounded-t-sm"></div>
                            <div className="flex-1 bg-primary/30 h-[45%] rounded-t-sm"></div>
                            <div className="flex-1 bg-primary/40 h-[60%] rounded-t-sm"></div>
                            <div className="flex-1 bg-[#ba1a1a]/40 h-[20%] rounded-t-sm"></div>
                            <div className="flex-1 bg-primary/25 h-[40%] rounded-t-sm"></div>
                            <div className="flex-1 bg-primary/50 h-[70%] rounded-t-sm"></div>
                            <div className="flex-1 bg-primary/60 h-[85%] rounded-t-sm"></div>
                        </div>
                        <div className="relative z-10 flex justify-between text-[10px] text-on-surface-variant font-bold uppercase tracking-wider border-t border-[#c3c6d6]/30 pt-4">
                            <span>W1 Oct</span>
                            <span>W2 Oct</span>
                            <span>W3 Oct</span>
                            <span>W4 Oct</span>
                            <span>W1 Nov</span>
                            <span>W2 Nov</span>
                            <span>W3 Nov</span>
                        </div>
                        <div className="absolute top-6 right-6">
                            <p className="text-xs font-bold text-on-surface flex items-center gap-2 m-0">
                                <span className="w-2 h-2 rounded-full bg-primary"></span> Cash Runway: 4.2 Months
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 m-0">
                        <AlertCircle size={18} className="text-[#7b2600]" />
                        Critical Actions
                    </h3>
                    <div className="space-y-2">
                        <div className="p-4 bg-[#ffdad6]/20 rounded-lg border-l-4 border-[#ba1a1a]">
                            <p className="text-xs font-bold text-[#93000a] m-0">Google Workspace Failed</p>
                            <p className="text-[11px] text-on-surface-variant mt-1 mb-2">Payment failed on Oct 20. Update card details immediately to avoid disruption.</p>
                            <button className="text-[10px] font-bold text-[#ba1a1a] underline uppercase tracking-tight bg-transparent border-none p-0 cursor-pointer">Resolve Now</button>
                        </div>
                        <div className="p-4 bg-white shadow-sm rounded-lg border border-[#f1f3ff]">
                            <p className="text-xs font-bold text-on-surface m-0">Confirm Receivable</p>
                            <p className="text-[11px] text-on-surface-variant mt-1 mb-2">Reliance Retail (₹2.1L) expected in 6 days. Mark as received once verified.</p>
                            <button className="text-[10px] font-bold text-primary underline uppercase tracking-tight bg-transparent border-none p-0 cursor-pointer">View Details</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
