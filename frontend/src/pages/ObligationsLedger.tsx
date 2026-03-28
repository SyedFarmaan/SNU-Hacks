import { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowUp, ArrowDown, Search, Loader2, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { fetchTransactions, createTransaction } from '../services/transactionsApi';
import type { TransactionsListResponse, CreateTransactionPayload } from '../services/transactionsApi';
import { useBusinessContext } from '../context/BusinessContext';

const CATEGORY_OPTIONS = [
    'rent', 'loan_emi', 'utility', 'tax',
    'supplier_invoice', 'contractor',
    'marketing', 'subscription', 'misc',
];

const STATUS_COLORS: Record<string, { dot: string; text: string }> = {
    pending: { dot: 'bg-amber-500', text: 'text-amber-700' },
    overdue: { dot: 'bg-red-600', text: 'text-red-700' },
    paid: { dot: 'bg-green-500', text: 'text-green-700' },
};

const FLEX_BAR: Record<string, { width: string; color: string; label: string }> = {
    none: { width: 'w-1/4', color: 'bg-red-500', label: 'None — Must Pay' },
    medium: { width: 'w-1/2', color: 'bg-amber-500', label: 'Medium — Negotiable' },
    high: { width: 'w-3/4', color: 'bg-primary', label: 'High — Deferrable' },
};

function formatINR(n: number): string {
    return n.toLocaleString('en-IN');
}

function getInitials(name: string): string {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase();
}

export default function ObligationsLedger() {
    const { selectedBusiness } = useBusinessContext();
    const BUSINESS_ID = selectedBusiness?.id ?? '';

    const [data, setData] = useState<TransactionsListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'outflow' | 'inflow'>('all');
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [form, setForm] = useState({
        counterparty: '',
        amount: '',
        due_date: '',
        type: 'outflow' as 'inflow' | 'outflow',
        category: 'misc',
        penalty_rate: '0',
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchTransactions(BUSINESS_ID);
            setData(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const resetForm = () => {
        setForm({ counterparty: '', amount: '', due_date: '', type: 'outflow', category: 'misc', penalty_rate: '0' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload: CreateTransactionPayload = {
                business_id: BUSINESS_ID,
                counterparty: form.counterparty,
                amount: parseFloat(form.amount),
                due_date: form.due_date,
                type: form.type,
                category: form.category,
                penalty_rate: parseFloat(form.penalty_rate) || 0,
            };
            await createTransaction(payload);
            setModalOpen(false);
            resetForm();
            await loadData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to create');
        } finally {
            setSubmitting(false);
        }
    };

    // Filter + search
    const filtered = data
        ? data.transactions.filter(tx => {
              if (filter !== 'all' && tx.type !== filter) return false;
              if (search && !tx.counterparty.toLowerCase().includes(search.toLowerCase()) &&
                  !tx.category.toLowerCase().includes(search.toLowerCase())) return false;
              return true;
          })
        : [];

    // Loading
    if (loading) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center gap-4 p-8">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-on-surface-variant">Loading obligations...</p>
            </div>
        );
    }

    // Error
    if (error || !data) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center gap-4 p-8">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <p className="text-sm text-red-600 max-w-md text-center">{error || 'Failed to load'}</p>
                <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-sm text-sm font-medium border-none cursor-pointer hover:bg-[#002f7a]">
                    <RefreshCw className="w-4 h-4" /> Retry
                </button>
            </div>
        );
    }

    const netBalance = data.total_receivables - data.total_payables;

    return (
        <div className="max-w-[1440px] mx-auto px-8 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-on-surface mb-1">Obligations Ledger</h1>
                    <p className="text-sm text-on-surface-variant">Centralized tracking for all liabilities and expected credits.</p>
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className="bg-primary-container text-white px-4 py-2 text-sm font-semibold rounded-sm flex items-center gap-2 hover:bg-primary transition-all active:scale-95 shadow-sm border-none cursor-pointer"
                >
                    <Plus size={18} />
                    Add Obligation
                </button>
            </div>

            {/* Summary Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 bg-white border-none shadow-sm rounded-lg overflow-hidden">
                <div className="p-6 border-r border-[#c3c6d6]/15 flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">Payables</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tighter text-on-surface">₹{formatINR(data.total_payables)}</span>
                        <span className="text-xs text-[#ba1a1a] font-medium flex items-center">
                            <ArrowUp size={14} className="mr-1" /> Outflow
                        </span>
                    </div>
                </div>
                <div className="p-6 border-r border-[#c3c6d6]/15 flex flex-col bg-[#f1f3ff]/30">
                    <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">Receivables</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tighter text-on-surface">₹{formatINR(data.total_receivables)}</span>
                        <span className="text-xs text-primary font-medium flex items-center">
                            <ArrowDown size={14} className="mr-1" /> Inflow
                        </span>
                    </div>
                </div>
                <div className="p-6 flex flex-col bg-[#e0e8ff]/20">
                    <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">Net Balance</span>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-bold tracking-tighter ${netBalance >= 0 ? 'text-green-600' : 'text-[#ba1a1a]'}`}>
                            {netBalance < 0 ? '-' : ''}₹{formatINR(Math.abs(netBalance))}
                        </span>
                        <span className="text-xs text-on-surface-variant font-medium">
                            {netBalance < 0 ? 'Deficit' : 'Surplus'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex bg-surface-container-low p-1 rounded-sm">
                    {(['all', 'outflow', 'inflow'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 text-xs font-semibold border-none rounded-sm cursor-pointer ${
                                filter === f
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'bg-transparent text-on-surface-variant hover:text-on-surface'
                            }`}
                        >
                            {f === 'all' ? 'All' : f === 'outflow' ? 'Payables' : 'Receivables'}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                        className="bg-white border-none text-sm pl-10 pr-4 py-2 w-64 rounded-sm focus:outline-none focus:ring-1 focus:ring-primary-container/30"
                        placeholder="Search vendor or category..."
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Ledger Table */}
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
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#c3c6d6]/10">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-on-surface-variant">
                                        No transactions found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((tx, idx) => {
                                    const flex = FLEX_BAR[tx.flexibility] || FLEX_BAR.medium;
                                    const statusStyle = STATUS_COLORS[tx.status] || STATUS_COLORS.pending;
                                    return (
                                        <tr key={tx.id} className={`group hover:bg-[#f1f3ff]/40 transition-colors ${idx % 2 === 1 ? 'bg-[#f1f3ff]/10' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-sm bg-[#e0e8ff] flex items-center justify-center font-bold text-primary text-xs shrink-0">
                                                        {getInitials(tx.counterparty)}
                                                    </div>
                                                    <p className="text-sm font-semibold text-on-surface m-0">{tx.counterparty}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-[#d6e3ff] text-[#091c35] text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase">
                                                    {tx.category.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className={`text-sm font-bold m-0 ${tx.type === 'outflow' ? 'text-[#ba1a1a]' : 'text-primary'}`}>
                                                    ₹{formatINR(tx.amount)}
                                                </p>
                                                <p className="text-[11px] text-on-surface-variant m-0">
                                                    {tx.type === 'outflow' ? 'Payable' : 'Receivable'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-on-surface m-0">{tx.due_date}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="w-24 bg-[#e0e8ff] h-1.5 rounded-full overflow-hidden">
                                                    <div className={`${flex.color} ${flex.width} h-full`}></div>
                                                </div>
                                                <p className="text-[10px] mt-1 text-on-surface-variant m-0 pt-1">{flex.label}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`flex items-center gap-1.5 text-xs font-medium ${statusStyle.text} capitalize`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                                                    {tx.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-3 border-t border-[#c3c6d6]/10 flex items-center justify-between">
                    <span className="text-xs text-on-surface-variant font-medium">
                        Showing {filtered.length} of {data.transactions.length} items
                    </span>
                </div>
            </div>

            {/* Add Obligation Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-[#041b3c]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-sm border border-[#c3c6d6] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-on-surface">Add Obligation</h3>
                                <button onClick={() => { setModalOpen(false); resetForm(); }} className="p-1 hover:bg-[#e8edff] rounded-sm cursor-pointer border-none bg-transparent">
                                    <X className="w-5 h-5 text-on-surface-variant" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Type toggle */}
                                <div>
                                    <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-2">Type</label>
                                    <div className="flex bg-surface-container-low p-1 rounded-sm">
                                        <button
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, type: 'outflow' }))}
                                            className={`flex-1 px-4 py-2 text-xs font-semibold border-none rounded-sm cursor-pointer ${
                                                form.type === 'outflow' ? 'bg-white text-[#ba1a1a] shadow-sm' : 'bg-transparent text-on-surface-variant'
                                            }`}
                                        >
                                            Payable (Outflow)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, type: 'inflow' }))}
                                            className={`flex-1 px-4 py-2 text-xs font-semibold border-none rounded-sm cursor-pointer ${
                                                form.type === 'inflow' ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-on-surface-variant'
                                            }`}
                                        >
                                            Receivable (Inflow)
                                        </button>
                                    </div>
                                </div>

                                {/* Counterparty */}
                                <div>
                                    <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">Counterparty</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.counterparty}
                                        onChange={e => setForm(f => ({ ...f, counterparty: e.target.value }))}
                                        placeholder="e.g. Farmaan Dealers"
                                        className="w-full px-3 py-2 border border-[#c3c6d6]/50 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>

                                {/* Amount + Due Date row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">Amount (₹)</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            step="0.01"
                                            value={form.amount}
                                            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                            placeholder="50000"
                                            className="w-full px-3 py-2 border border-[#c3c6d6]/50 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">Due Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={form.due_date}
                                            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                                            className="w-full px-3 py-2 border border-[#c3c6d6]/50 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </div>

                                {/* Category + Penalty Rate row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">Category</label>
                                        <select
                                            value={form.category}
                                            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                            className="w-full px-3 py-2 border border-[#c3c6d6]/50 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                                        >
                                            {CATEGORY_OPTIONS.map(c => (
                                                <option key={c} value={c}>{c.replace('_', ' ')}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">Penalty Rate (%/day)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            value={form.penalty_rate}
                                            onChange={e => setForm(f => ({ ...f, penalty_rate: e.target.value }))}
                                            className="w-full px-3 py-2 border border-[#c3c6d6]/50 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </div>

                                {/* Info box */}
                                <div className="p-3 bg-[#f1f3ff] rounded-sm">
                                    <p className="text-xs text-on-surface-variant m-0">
                                        Flexibility will be auto-inferred from the category: <strong>rent/tax/loan</strong> = none (must pay),{' '}
                                        <strong>supplier/contractor</strong> = medium, <strong>marketing/subscription</strong> = high.
                                    </p>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-3 bg-primary text-white border-none rounded-sm font-bold text-sm cursor-pointer hover:bg-[#002f7a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4" /> Add to Ledger
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
