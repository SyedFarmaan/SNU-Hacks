import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Loader2, AlertTriangle, ArrowRight, Wallet } from 'lucide-react';
import { fetchBusinesses, type Business } from '../services/businessApi';
import { useBusinessContext } from '../context/BusinessContext';

function formatINR(value: number): string {
    const abs = Math.abs(Math.round(value));
    const str = abs.toString();
    if (str.length <= 3) return (value < 0 ? '-' : '') + str;
    const last3 = str.slice(-3);
    const rest = str.slice(0, -3);
    const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
    return (value < 0 ? '-' : '') + formatted;
}

export default function BusinessSelector() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { setSelectedBusiness } = useBusinessContext();
    const navigate = useNavigate();

    useEffect(() => {
        fetchBusinesses()
            .then(setBusinesses)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    function handleSelect(biz: Business) {
        setSelectedBusiness(biz);
        navigate('/document-ai');
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-xl leading-none">F</span>
                    </div>
                    <span className="text-2xl font-bold tracking-tight text-primary">Finaxis</span>
                </div>
                <h1 className="text-3xl font-bold text-on-background mt-6 mb-1">Select a Business</h1>
                <p className="text-on-surface-variant mb-8">Choose which business you want to analyse.</p>

                {loading && (
                    <div className="flex items-center gap-2 text-on-surface-variant">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading businesses…</span>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 text-error bg-error-container/30 px-4 py-3 rounded-sm">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {!loading && !error && (
                    <div className="space-y-3">
                        {businesses.map((biz) => (
                            <button
                                key={biz.id}
                                onClick={() => handleSelect(biz)}
                                className="w-full text-left bg-surface-container-low border border-transparent hover:border-primary/30 hover:bg-surface-container rounded-sm px-6 py-5 transition-all group flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                                        <Building2 className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-on-background text-base">{biz.name}</p>
                                        <p className="text-xs text-on-surface-variant mt-0.5">{biz.owner_email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden sm:block">
                                        <div className="flex items-center gap-1 text-xs text-on-surface-variant mb-0.5">
                                            <Wallet className="w-3 h-3" />
                                            <span>Cash balance</span>
                                        </div>
                                        <p className="font-bold text-on-background text-sm">
                                            ₹{formatINR(biz.current_cash_balance)}
                                        </p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors shrink-0" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
