import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Shield,
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle2,
  ArrowRightLeft,
} from 'lucide-react';
import { fetchDecision } from '../services/decideApi';
import type { DecideResponse, Scenario, Obligation } from '../services/decideApi';

const BUSINESS_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatINR(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(Math.round(value));
  const str = abs.toString();
  if (str.length <= 3) return sign + str;
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  return sign + formatted;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function flexLabel(f: string): string {
  return { none: 'Critical', medium: 'Medium', high: 'Flexible' }[f] ?? f;
}

function flexBadgeClass(f: string): string {
  return {
    none: 'bg-[#ffdad6] text-[#93000a]',
    medium: 'bg-[#d7e2ff] text-on-surface-variant',
    high: 'bg-[#c8f5e1] text-[#1a7a4a]',
  }[f] ?? 'bg-surface-container-low text-on-surface-variant';
}

// ─── Scenario Card ──────────────────────────────────────────────────────────

interface ScenarioCardProps {
  scenario: Scenario;
  isRecommended: boolean;
  icon: React.ReactNode;
  subtitle: string;
}

function ScenarioCard({ scenario, isRecommended, icon, subtitle }: ScenarioCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isSafe = scenario.min_balance >= 0;

  return (
    <div
      className={`rounded p-6 flex flex-col h-full transition-transform hover:scale-[1.01] ${
        isRecommended
          ? 'bg-white/70 backdrop-blur-md shadow-[0_0_20px_rgba(0,82,204,0.15)] border-2 border-primary-container'
          : 'bg-surface-container-low border border-[#c3c6d6]'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          {isRecommended && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary-container block mb-1">
              Recommended
            </span>
          )}
          <h3 className="text-xl font-bold text-on-surface">{scenario.name}</h3>
          <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
        </div>
        <div
          className={`p-2 rounded ${
            isRecommended
              ? 'bg-primary-container text-white'
              : 'bg-secondary-container text-[#51617e]'
          }`}
        >
          {icon}
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-4 flex-grow">
        <div className="flex items-center justify-between">
          <span className="text-sm text-on-surface-variant">Lowest Cash Dip</span>
          <span
            className="text-sm font-bold"
            style={{ color: isSafe ? '#36B37E' : '#ba1a1a' }}
          >
            {isSafe ? '+' : ''}₹{formatINR(scenario.min_balance)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-on-surface-variant">Total Penalties</span>
          <span
            className="text-sm font-bold"
            style={{ color: scenario.total_penalties > 0 ? '#ba1a1a' : '#36B37E' }}
          >
            {scenario.total_penalties === 0 ? 'None' : `₹${formatINR(scenario.total_penalties)}`}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-on-surface-variant">Pay / Defer</span>
          <span className="text-sm font-bold text-on-surface">
            {scenario.pay_list.length} pay · {scenario.defer_list.length} defer
          </span>
        </div>

        {/* Status badge */}
        <div className="pt-4 mt-2 border-t border-[#c3c6d6]/20">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold ${
              isSafe
                ? 'bg-[#c8f5e1] text-[#1a7a4a]'
                : 'bg-[#ffdad6] text-[#93000a]'
            }`}
          >
            {isSafe ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
            {isSafe ? 'SOLVENT — Balance stays positive' : 'WARNING — Balance goes negative'}
          </div>
        </div>

        {/* Expandable actions log */}
        {scenario.actions.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-primary font-semibold mt-2 bg-transparent border-none cursor-pointer p-0 hover:underline"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? 'Hide' : 'View'} {scenario.actions.length} action{scenario.actions.length !== 1 ? 's' : ''}
            </button>
            {expanded && (
              <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto text-xs text-on-surface-variant list-none p-0 m-0">
                {scenario.actions.map((action, i) => (
                  <li
                    key={i}
                    className={`py-1.5 px-2 rounded-sm ${
                      action.startsWith('Deferred')
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-[#f1f3ff] text-on-surface'
                    }`}
                  >
                    {action}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Obligations Table ──────────────────────────────────────────────────────

interface ObligationsTableProps {
  obligations: Obligation[];
  deferredIds: Set<string>;
}

function ObligationsTable({ obligations, deferredIds }: ObligationsTableProps) {
  if (obligations.length === 0) {
    return (
      <div className="text-center py-12 text-on-surface-variant text-sm">
        No pending obligations found. Ingest invoices via Document Intelligence first.
      </div>
    );
  }

  const totalAmount = obligations.reduce((sum, ob) => sum + ob.amount, 0);
  const payCount = obligations.filter((ob) => !deferredIds.has(ob.id)).length;
  const deferCount = obligations.filter((ob) => deferredIds.has(ob.id)).length;

  return (
    <section className="bg-surface-container-lowest rounded-sm p-8 shadow-sm">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-sans font-bold text-primary tracking-tight-custom m-0">
            Obligations Ledger
          </h2>
          <p className="text-sm text-on-surface-variant mt-1 m-0">
            All pending outflows evaluated by the decision engine.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-sm">
            <span className="text-xs font-semibold text-on-surface-variant">Total:</span>
            <span className="text-sm font-bold text-primary">₹{formatINR(totalAmount)}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-sm">
            <span className="text-xs font-semibold text-on-surface-variant">Recommended:</span>
            <span className="text-sm font-bold text-[#36B37E]">{payCount} pay</span>
            {deferCount > 0 && (
              <span className="text-sm font-bold text-amber-600">· {deferCount} defer</span>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-secondary-container text-[#51617e]">
              <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest rounded-tl-sm">
                Counterparty
              </th>
              <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest">
                Due Date
              </th>
              <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-widest">
                Amount
              </th>
              <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-widest">
                Flexibility
              </th>
              <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-widest">
                Penalty Rate
              </th>
              <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-widest rounded-tr-sm">
                Recommended Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c3c6d6]/10">
            {obligations.map((ob, idx) => {
              const isDeferred = deferredIds.has(ob.id);
              return (
                <tr
                  key={ob.id}
                  className={`${
                    idx % 2 === 0 ? 'bg-white' : 'bg-surface-container-low'
                  } hover:bg-[#e8edff] transition-colors`}
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-surface-container-low rounded flex items-center justify-center text-primary text-xs font-bold">
                        {ob.counterparty
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((w) => w[0]?.toUpperCase() ?? '')
                          .join('')}
                      </div>
                      <div>
                        <span className="font-semibold text-sm block">{ob.counterparty}</span>
                        <span className="text-[10px] text-on-surface-variant">{ob.category}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-on-surface-variant">
                    {formatDate(ob.due_date)}
                  </td>
                  <td className="px-6 py-5 text-right font-mono font-bold text-sm">
                    ₹{formatINR(ob.amount)}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${flexBadgeClass(
                        ob.flexibility
                      )}`}
                    >
                      {flexLabel(ob.flexibility)}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center text-sm font-mono text-on-surface-variant">
                    {ob.penalty_rate > 0 ? `${(ob.penalty_rate * 100).toFixed(1)}%/day` : '—'}
                  </td>
                  <td className="px-6 py-5 text-center">
                    {isDeferred ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">
                        <ArrowRightLeft size={10} />
                        Defer
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[10px] font-bold bg-[#c8f5e1] text-[#1a7a4a] uppercase">
                        <CheckCircle2 size={10} />
                        Pay
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function DecisionSandbox() {
  const [data, setData] = useState<DecideResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchDecision(BUSINESS_ID)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-[#003d9b] animate-pulse" />
        <span className="text-sm text-on-surface-variant">Running scenario simulations...</span>
      </div>
    );
  }

  // ── Error ──
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle size={40} className="text-[#ba1a1a]" />
        <p className="text-sm text-on-surface-variant">{error ?? 'Unknown error'}</p>
        <button
          onClick={load}
          className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-sm border-none cursor-pointer hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Derive display state ──
  const baselineNegative = data.scenario_a.min_balance < 0;
  const allObligations = [
    ...data.scenario_a.pay_list,
    ...data.scenario_a.defer_list,
  ];
  // If baseline has no deferrals (it never does), all obligations come from pay_list.
  // But Smart scenario's defer_list shows what the recommended strategy would defer.
  const recommended =
    [data.scenario_a, data.scenario_b, data.scenario_c].find(
      (s) => s.name === data.recommended_scenario
    ) ?? data.scenario_c;
  const recommendedDeferIds = new Set(recommended.defer_list.map((ob) => ob.id));

  // Sort obligations: deferred last, then by due date
  const sortedObligations = [...allObligations].sort((a, b) => {
    const aDef = recommendedDeferIds.has(a.id) ? 1 : 0;
    const bDef = recommendedDeferIds.has(b.id) ? 1 : 0;
    if (aDef !== bDef) return aDef - bDef;
    return a.due_date.localeCompare(b.due_date);
  });

  return (
    <div className="max-w-7xl mx-auto px-8 py-10 space-y-10">
      {/* ── Header ── */}
      <header>
        <div className="flex items-center justify-between mb-4">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
              baselineNegative
                ? 'bg-[#ffdad6] text-[#93000a]'
                : 'bg-[#c8f5e1] text-[#1a7a4a]'
            }`}
          >
            {baselineNegative ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span className="text-xs font-bold tracking-wider uppercase">
              {baselineNegative ? 'Cash Shortfall Detected' : 'Runway Clear'}
            </span>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-transparent border border-primary rounded-sm cursor-pointer hover:bg-[#0052cc0a] transition-colors"
          >
            <RefreshCw size={12} />
            Re-run Analysis
          </button>
        </div>
        <h1 className="text-4xl font-sans font-extrabold tracking-tight-custom text-primary mb-2 m-0">
          {baselineNegative
            ? 'Liquidity Crisis Detected — Choose Your Path.'
            : 'Decision Sandbox — Scenario Analysis'}
        </h1>
        <p className="text-on-surface-variant max-w-2xl leading-relaxed text-sm m-0">
          Available cash: <strong>₹{formatINR(data.available_cash)}</strong> ·{' '}
          {allObligations.length} pending obligation{allObligations.length !== 1 ? 's' : ''} evaluated
          across 3 strategies. Engine recommends: <strong>{data.recommended_scenario}</strong>.
        </p>
      </header>

      {/* ── Scenario Cards ── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ScenarioCard
          scenario={data.scenario_a}
          isRecommended={data.recommended_scenario === data.scenario_a.name}
          icon={<Shield className="w-5 h-5" />}
          subtitle="Pay all obligations on time — no deferrals"
        />
        <ScenarioCard
          scenario={data.scenario_b}
          isRecommended={data.recommended_scenario === data.scenario_b.name}
          icon={<Sparkles className="w-5 h-5" />}
          subtitle="Hoard cash — defer all non-mandatory items 30 days"
        />
        <ScenarioCard
          scenario={data.scenario_c}
          isRecommended={data.recommended_scenario === data.scenario_c.name}
          icon={<Zap className="w-5 h-5" />}
          subtitle="Greedy deferral — minimise penalties while staying solvent"
        />
      </section>

      {/* ── Obligations Table ── */}
      <ObligationsTable obligations={sortedObligations} deferredIds={recommendedDeferIds} />
    </div>
  );
}
