import React from 'react';
import { UploadCloud, FileText, ArrowRight } from 'lucide-react';

export default function DocumentIntelligence() {
    return (
        <div className="max-w-[1440px] mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start animate-in fade-in duration-500">
            {/* Left Column: Input (40%) */}
            <section className="lg:col-span-5 flex flex-col gap-8">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-on-surface">Document Intelligence</h1>
                    <p className="text-on-surface-variant text-sm">Upload and automate data extraction for tax compliance.</p>
                </div>

                {/* Upload Zone */}
                <div className="bg-surface-container-low p-12 flex flex-col items-center justify-center text-center rounded-sm transition-all hover:bg-[#e8edff] hover:cursor-pointer group relative">
                    <div className="absolute inset-0 border-2 border-dashed border-[#0052cc] opacity-50 rounded-sm"></div>
                    <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center mb-4 group-hover:scale-105 transition-transform z-10">
                        <UploadCloud className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-on-surface mb-1 z-10">Drag and drop invoice here</h3>
                    <p className="text-sm text-on-surface-variant z-10">Support PDF, PNG, JPG (Max 10MB)</p>
                    <button className="mt-4 px-4 py-2 bg-white border-none text-primary text-sm font-semibold rounded-sm shadow-sm hover:bg-gray-50 cursor-pointer transition-all z-10">
                        Browse Files
                    </button>
                </div>

                {/* Invoice Thumbnail */}
                <div className="bg-surface-container-low rounded-sm p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Active Document</span>
                        <span className="text-xs text-primary font-medium hover:underline cursor-pointer">Preview Fullscreen</span>
                    </div>
                    <div className="relative group overflow-hidden rounded-sm bg-white border border-[#c3c6d6]/30">
                        <img
                            alt="GST Invoice"
                            className="w-full h-64 object-cover object-top opacity-90 group-hover:scale-[1.02] transition-transform duration-500"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCPZqLiTvk2UoKh66ZcxF83KcmeRGJWTMwJb4dB0RCf-Fn1Vx2f2MUcR60xeZF2OuH5lB4n8W8pB_AZm1MTVwb8uI-sOPNUegDuVqRaxQSZ4AXuUMqgAKyDm3AiuHu4HM3Adag5z9C3cAd7CE_sWj07LlK1mD3rJeEPx2eHmx7F-nDc-uJeJRBfYBjYxX9BYM_-J9Fb2H5r7-EmbVz1T0QhgRRIyDrhrAOhxgz50Lmdl2zlvd1Oc7JewNCMR81mywGA_ur153EajjQ"
                        />
                        <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-on-surface-variant" />
                            <span className="font-medium text-on-surface">GST_INV_2024_082.pdf</span>
                        </div>
                        <span className="text-on-surface-variant">1.2 MB</span>
                    </div>
                </div>
            </section>

            {/* Right Column: Data (60%) */}
            <section className="lg:col-span-7 bg-white rounded-lg overflow-hidden border border-[#c3c6d6]/10 shadow-sm flex flex-col h-full min-h-[700px]">
                <div className="p-6 border-b border-[#e8edff] flex justify-between items-center">
                    <h2 className="text-xl font-bold tracking-tight text-on-surface">Parsed Results</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-on-surface-variant">Confidence Score:</span>
                        <div className="w-16 bg-[#e8edff] h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#36B37E] h-full w-[94%]"></div>
                        </div>
                        <span className="text-xs font-bold text-[#36B37E]">94%</span>
                    </div>
                </div>

                {/* Data Table */}
                <div className="flex-grow overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-secondary-container">
                                <th className="px-6 py-4 text-left text-xs font-bold text-[#51617e] uppercase tracking-wider">Vendor</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[#51617e] uppercase tracking-wider">Amount (₹)</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[#51617e] uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[#51617e] uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[#51617e] uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e8edff]">
                            {/* Row 1 */}
                            <tr className="hover:bg-surface-container-low group transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-sm bg-[#e8edff] flex items-center justify-center font-bold text-primary text-xs">TI</div>
                                        <div className="flex flex-col cursor-text p-1 rounded-sm border border-transparent hover:border-primary-container transition-all">
                                            <span className="text-sm font-semibold text-on-surface">Tech-Innovate Pvt Ltd</span>
                                            <span className="text-[10px] text-on-surface-variant">GSTIN: 27AAACT9832R1Z1</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="cursor-text p-1 rounded-sm border border-transparent hover:border-primary-container transition-all">
                                        <span className="text-sm font-medium text-on-surface">42,500.00</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-on-surface-variant">14 Aug 2024</td>
                                <td className="px-6 py-4 text-sm text-on-surface">Service Invoice</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-tight bg-purple-100 text-purple-700">AI Extracted</span>
                                </td>
                            </tr>
                            {/* Row 2 */}
                            <tr className="hover:bg-surface-container-low group transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-sm bg-[#e8edff] flex items-center justify-center font-bold text-primary text-xs">AS</div>
                                        <div className="flex flex-col cursor-text p-1 rounded-sm border border-transparent hover:border-primary-container transition-all">
                                            <span className="text-sm font-semibold text-on-surface">Azure Systems Inc</span>
                                            <span className="text-[10px] text-on-surface-variant">GSTIN: 07AABCU1234F1Z5</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="cursor-text p-1 rounded-sm border border-transparent hover:border-primary-container transition-all">
                                        <span className="text-sm font-medium text-on-surface">12,890.50</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-on-surface-variant">12 Aug 2024</td>
                                <td className="px-6 py-4 text-sm text-on-surface">Subscription</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-tight bg-amber-50 text-[#FFAB00] border border-amber-100">Needs Review</span>
                                </td>
                            </tr>
                            {/* Row 3 */}
                            <tr className="hover:bg-surface-container-low group transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-sm bg-[#e8edff] flex items-center justify-center font-bold text-primary text-xs">RC</div>
                                        <div className="flex flex-col cursor-text p-1 rounded-sm border border-transparent hover:border-primary-container transition-all">
                                            <span className="text-sm font-semibold text-on-surface">Reliance Corp Ltd</span>
                                            <span className="text-[10px] text-on-surface-variant">GSTIN: 27BCCDE9999K1Z2</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="cursor-text p-1 rounded-sm border border-transparent hover:border-primary-container transition-all">
                                        <span className="text-sm font-medium text-on-surface">1,05,200.00</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-on-surface-variant">10 Aug 2024</td>
                                <td className="px-6 py-4 text-sm text-on-surface">Raw Material</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-tight bg-emerald-50 text-[#36B37E] border border-emerald-100">Confirmed</span>
                                </td>
                            </tr>
                            {/* Row 4 */}
                            <tr className="bg-surface-container-low/30 hover:bg-surface-container-low transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3 opacity-60">
                                        <div className="w-8 h-8 rounded-sm bg-[#e8edff] flex items-center justify-center font-bold text-primary text-xs">MS</div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-on-surface">MacroSoft Logistics</span>
                                            <span className="text-[10px] text-on-surface-variant">GSTIN: 29AABBB0000A1Z0</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-on-surface opacity-60">5,400.00</td>
                                <td className="px-6 py-4 text-sm text-on-surface-variant opacity-60">08 Aug 2024</td>
                                <td className="px-6 py-4 text-sm text-on-surface opacity-60">Logistics</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-tight bg-emerald-50 text-[#36B37E] border border-emerald-100 opacity-60">Confirmed</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer Action Panel */}
                <div className="p-6 bg-surface-container-low flex items-center justify-between border-t border-[#c3c6d6]/10">
                    <div className="flex gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Total Extracted</span>
                            <span className="text-lg font-bold text-on-surface">₹ 1,75,990.50</span>
                        </div>
                        <div className="w-[1px] h-10 bg-[#c3c6d6]/30"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Pending Review</span>
                            <span className="text-lg font-bold text-[#FFAB00]">01</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="px-6 py-2.5 bg-[#d7e2ff] border-none text-primary font-semibold text-sm rounded shadow-sm hover:brightness-95 active:scale-95 transition-all cursor-pointer">
                            Cancel
                        </button>
                        <button className="px-6 py-2.5 bg-[#0052cc] border-none text-white font-semibold text-sm rounded shadow-md hover:bg-primary transition-all active:scale-95 flex items-center gap-2 cursor-pointer">
                            <span>Confirm &amp; Add to Ledger</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
