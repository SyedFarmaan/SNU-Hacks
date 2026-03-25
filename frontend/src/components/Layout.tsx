import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, FileText, Wallet, LineChart } from 'lucide-react';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: 'Decision Sandbox', path: '/sandbox', icon: LayoutDashboard },
    { name: 'Action & Execution', path: '/execution', icon: Receipt },
    { name: 'Document Intelligence', path: '/document-ai', icon: FileText },
    { name: 'Obligations Ledger', path: '/obligations-ledger', icon: Wallet },
    { name: 'Cash Flow Forecast', path: '/forecast', icon: LineChart },
];

export default function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-background text-on-background flex font-sans">
            {/* Sidebar Layout */}
            <aside className="w-64 bg-surface-container-low h-screen flex flex-col shrink-0 overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-8 cursor-default">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-sm">
                            <span className="text-white font-bold text-lg leading-none tracking-tight">F</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight-custom text-primary select-none">Finaxis</span>
                    </div>

                    <nav className="space-y-1">
                        {navItems.map((item) => {
                            const active = location.pathname === item.path || (location.pathname === '/' && item.path === '/sandbox');
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors",
                                        active
                                            ? "bg-surface-container-highest bg-white text-primary shadow-sm"
                                            : "text-on-surface-variant hover:bg-white/50 hover:text-on-surface"
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4", active ? "text-primary" : "text-on-surface-variant/70")} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className="mt-auto p-6">
                    <div className="bg-surface p-4 rounded-sm flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold">
                            SA
                        </div>
                        <div>
                            <p className="text-sm font-bold m-0 leading-tight">System Admin</p>
                            <p className="text-xs text-on-surface-variant m-0">Finaxis HQ</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 bg-surface h-screen overflow-y-auto w-full max-w-full relative">
                {children}
            </main>
        </div>
    );
}
