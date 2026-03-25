import { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { fetchRunway } from '../services/runwayApi';
import type { RunwayResponse, TimelineEntry } from '../services/runwayApi';

const BUSINESS_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

// Indian numbering system: e.g. 181001 -> "1,81,001"
function formatINR(value: number): string {
  const abs = Math.abs(Math.round(value));
  const str = abs.toString();
  if (str.length <= 3) return (value < 0 ? '-' : '') + str;
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  return (value < 0 ? '-' : '') + formatted;
}

// ─── RunwayChart ────────────────────────────────────────────────────────────

interface RunwayChartProps {
  timeline: TimelineEntry[];
  currentBalance: number;
}

interface TooltipState {
  x: number;
  y: number;
  entry: TimelineEntry;
}

function RunwayChart({ timeline, currentBalance }: RunwayChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  if (timeline.length === 0) return null;

  const W = 1000;
  const H = 300;
  const PAD = 10;

  const balances = timeline.map(e => e.balance);
  const minY = Math.min(0, ...balances);
  const maxY = Math.max(currentBalance, ...balances);
  const range = maxY - minY || 1;

  // Map a balance value to SVG Y coordinate (top = high balance, bottom = low)
  const toSvgY = (bal: number): number =>
    H - ((bal - minY) / range) * (H - PAD * 2) - PAD;

  const zeroY = toSvgY(0);

  const pts = timeline.map((entry, i) => ({
    x: timeline.length === 1 ? W / 2 : (i / (timeline.length - 1)) * W,
    y: toSvgY(entry.balance),
    entry,
  }));

  const polylineStr = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Full area path anchored to the zero line on both ends
  const areaPath = [
    `M${pts[0].x.toFixed(1)},${zeroY.toFixed(1)}`,
    ...pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `L${pts[pts.length - 1].x.toFixed(1)},${zeroY.toFixed(1)}`,
    'Z',
  ].join(' ');

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = pts[0];
    let minDist = Math.abs(pts[0].x - svgX);
    for (const p of pts) {
      const d = Math.abs(p.x - svgX);
      if (d < minDist) { minDist = d; nearest = p; }
    }
    setTooltip({ x: nearest.x, y: nearest.y, entry: nearest.entry });
  };

  const midIdx = Math.floor(timeline.length / 2);

  return (
    <div>
      <svg
        className="w-full h-72"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          {/* Positive area: #36B37E fading from 40% to 0% top-to-bottom */}
          <linearGradient id="rcPosGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#36B37E" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#36B37E" stopOpacity="0" />
          </linearGradient>
          {/* Negative area: #BF2600 fading from 0% to 30% top-to-bottom */}
          <linearGradient id="rcNegGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#BF2600" stopOpacity="0" />
            <stop offset="100%" stopColor="#BF2600" stopOpacity="0.3" />
          </linearGradient>
          {/* Clip region above zero line (positive territory) */}
          <clipPath id="rcAboveZero">
            <rect x="0" y="0" width={W} height={zeroY} />
          </clipPath>
          {/* Clip region below zero line (negative territory) */}
          <clipPath id="rcBelowZero">
            <rect x="0" y={zeroY} width={W} height={H - zeroY} />
          </clipPath>
        </defs>

        <path d={areaPath} fill="url(#rcPosGrad)" clipPath="url(#rcAboveZero)" />
        <path d={areaPath} fill="url(#rcNegGrad)" clipPath="url(#rcBelowZero)" />

        {/* Dashed zero balance line */}
        <line
          x1={0} y1={zeroY} x2={W} y2={zeroY}
          stroke="#ba1a1a" strokeWidth="1.5" strokeDasharray="6,4"
        />
        <text
          x={W - 4} y={zeroY - 5}
          textAnchor="end" fill="#ba1a1a"
          fontSize="10" fontWeight="700" letterSpacing="1"
        >
          ZERO BALANCE LINE
        </text>

        {/* Main cash flow line */}
        <polyline
          points={polylineStr}
          fill="none"
          stroke="#003d9b"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Inflow / outflow dots */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y} r={4}
            fill={p.entry.transaction_type === 'inflow' ? '#36B37E' : '#ba1a1a'}
          />
        ))}

        {/* Hover crosshair + tooltip */}
        {tooltip && (() => {
          const tx = Math.min(tooltip.x + 10, W - 168);
          const ty = Math.max(tooltip.y - 52, 5);
          return (
            <g>
              <line
                x1={tooltip.x} y1={0} x2={tooltip.x} y2={H}
                stroke="#003d9b" strokeWidth="1" strokeDasharray="3,3" strokeOpacity="0.4"
              />
              <rect x={tx} y={ty} width={158} height={60} rx={3}
                fill="#041b3c" fillOpacity={0.9} />
              <text x={tx + 9} y={ty + 17} fill="white" fontSize={11} fontWeight="bold">
                {tooltip.entry.counterparty.slice(0, 22)}
              </text>
              <text x={tx + 9} y={ty + 32} fill="#94a3b8" fontSize={10}>
                {tooltip.entry.date}
              </text>
              <text
                x={tx + 9} y={ty + 49}
                fill={tooltip.entry.transaction_type === 'inflow' ? '#36B37E' : '#ff6b6b'}
                fontSize={11} fontWeight="bold"
              >
                {tooltip.entry.transaction_type === 'inflow' ? '+' : '-'}
                {'\u20B9'}{formatINR(tooltip.entry.amount)}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* X-axis date labels */}
      <div className="flex justify-between mt-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
        <span>Today ({timeline[0].date})</span>
        <span>{timeline[midIdx].date}</span>
        <span>{timeline[timeline.length - 1].date}</span>
      </div>
    </div>
  );
}

// ─── CashFlowForecast ────────────────────────────────────────────────────────

export default function CashFlowForecast() {
  const [data, setData] = useState<RunwayResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchRunway(BUSINESS_ID)
      .then(res => { setData(res); setLoading(false); })
      .catch((err: Error) => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-[#003d9b] animate-pulse" />
        <span className="text-sm text-on-surface-variant">Analysing cash flow...</span>
      </div>
    );
  }

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

  // Gauge: circumference of r=58 circle is 2 * PI * 58 ≈ 364.4
  const circumference = 364.4;
  const gaugeOffset = circumference * (1 - data.health_score / 100);
  const gaugeColor =
    data.health_score >= 75 ? '#36B37E'
    : data.health_score >= 40 ? '#f59e0b'
    : '#ba1a1a';

  // Progress bar: how much of (cash + payables) is covered by cash, capped at 100%
  const cashCoverage = Math.min(
    (data.current_cash_balance / (data.current_cash_balance + data.total_payables)) * 100,
    100,
  );

  const showBanner = data.days_to_zero !== null && data.days_to_zero <= 30;

  const daysColor =
    data.days_to_zero === null ? '#36B37E'
    : data.days_to_zero === 0 ? '#bf2600'
    : '#041b3c';

  const badgeClass =
    data.days_to_zero !== null && data.days_to_zero <= 7
      ? 'bg-[#ffdad6] text-[#93000a]'
      : data.days_to_zero !== null && data.days_to_zero <= 30
      ? 'bg-amber-100 text-amber-700'
      : 'bg-[#c8f5e1] text-[#1a7a4a]';

  const badgeLabel =
    data.days_to_zero !== null && data.days_to_zero <= 7
      ? 'CRITICAL THRESHOLD REACHED'
      : data.days_to_zero !== null && data.days_to_zero <= 30
      ? 'MONITOR CLOSELY'
      : 'RUNWAY CLEAR';

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto px-8 py-8 relative">

      {/* Emergency banner — only when days_to_zero <= 30 */}
      {showBanner && (
        <div className="w-[100vw] relative left-1/2 -translate-x-1/2 max-w-none bg-[#ba1a1a] text-white py-2 px-8 flex items-center justify-center gap-3 shadow-md -mt-8 mb-8">
          <AlertTriangle size={14} />
          <p className="text-xs font-semibold tracking-tight uppercase m-0">
            Cash shortfall of &#8377;{formatINR(data.liquidity_gap)} detected &mdash;{' '}
            {data.days_to_zero === 0
              ? 'IMMEDIATE ACTION REQUIRED'
              : `${data.days_to_zero} days remaining`}
          </p>
        </div>
      )}

      {/* ── Hero KPI Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Card 1: Financial Health Score gauge */}
        <div className="bg-white p-6 rounded-lg flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary-container" />
          <p className="text-on-surface-variant text-xs font-semibold tracking-widest uppercase mb-4 m-0">
            Financial Health
          </p>
          <div className="relative flex items-center justify-center w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" fill="transparent" r="58"
                stroke="#f1f3ff" strokeWidth="8" />
              {/* strokeDashoffset drives how much of the arc is filled */}
              <circle
                cx="64" cy="64" fill="transparent" r="58"
                stroke={gaugeColor}
                strokeDasharray={circumference}
                strokeDashoffset={gaugeOffset}
                strokeLinecap="round"
                strokeWidth="8"
              />
            </svg>
            <span
              className="absolute text-3xl font-extrabold tracking-tight"
              style={{ color: gaugeColor }}
            >
              {data.health_score}
            </span>
          </div>
          <p className="mt-4 text-xs text-on-surface-variant font-medium m-0">Safe range: 75+</p>
        </div>

        {/* Card 2: Days to Zero */}
        <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center justify-center text-center">
          <p className="text-on-surface-variant text-xs font-semibold tracking-widest uppercase mb-2 m-0">
            Days to Zero
          </p>
          <span
            className="text-7xl font-black tracking-tighter leading-none"
            style={{ color: daysColor }}
          >
            {data.days_to_zero !== null ? data.days_to_zero : 'Safe'}
          </span>
          {data.days_to_zero !== null && (
            <div className={`mt-6 flex items-center gap-2 px-3 py-1 rounded-sm text-[10px] font-bold ${badgeClass}`}>
              <AlertCircle size={11} />
              {badgeLabel}
            </div>
          )}
        </div>

        {/* Card 3: Available Cash */}
        <div className="bg-white p-6 rounded-lg flex flex-col justify-between shadow-sm relative">
          <div className="absolute top-4 right-4 text-primary opacity-20">
            <Wallet size={36} />
          </div>
          <div>
            <p className="text-on-surface-variant text-xs font-semibold tracking-widest uppercase mb-1 m-0">
              Available Cash
            </p>
            <h2
              className="text-4xl font-extrabold tracking-tight mt-2 m-0"
              style={{ color: data.current_cash_balance < 0 ? '#ba1a1a' : '#041b3c' }}
            >
              &#8377;{formatINR(data.current_cash_balance)}
            </h2>
          </div>
          <div className="mt-8 pt-4">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-on-surface-variant">Total Payables</span>
              <span className="font-bold text-on-surface">&#8377;{formatINR(data.total_payables)}</span>
            </div>
            {/* Width shows how much cash covers payables */}
            <div className="w-full bg-[#f1f3ff] h-1.5 rounded-sm overflow-hidden">
              <div className="bg-primary h-full" style={{ width: `${cashCoverage}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Cash Flow Forecast Chart ── */}
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <div className="mb-8">
          <h3 className="text-lg font-bold tracking-tight text-on-background m-0">Cash Flow Forecast</h3>
          <p className="text-sm text-on-surface-variant m-0 mt-1">Liquidity projection across transaction timeline</p>
        </div>
        <RunwayChart timeline={data.timeline} currentBalance={data.current_cash_balance} />
      </div>

      {/* ── Horizon Snapshots ── */}
      <div className="grid grid-cols-3 gap-6">
        {(
          [
            { label: 'Cash in 7 Days', value: data.cash_at_7d },
            { label: 'Cash in 30 Days', value: data.cash_at_30d },
            { label: 'Cash in 60 Days', value: data.cash_at_60d },
          ] as { label: string; value: number }[]
        ).map(({ label, value }) => (
          <div key={label} className="bg-white p-6 rounded-lg shadow-sm">
            <p className="text-on-surface-variant text-xs font-semibold tracking-widest uppercase mb-2 m-0">
              {label}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {value >= 0
                ? <TrendingUp size={18} className="text-[#36B37E] shrink-0" />
                : <TrendingDown size={18} className="text-[#ba1a1a] shrink-0" />}
              <span
                className="text-2xl font-extrabold tracking-tight"
                style={{ color: value < 0 ? '#ba1a1a' : '#36B37E' }}
              >
                &#8377;{formatINR(value)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Burn Rate & Risk Cards (2-column grid) ── */}
      <div className="grid grid-cols-2 gap-6">
        {(
          [
            {
              label: 'Gross Burn (Monthly)',
              value: `\u20B9${formatINR(data.gross_burn_monthly)}`,
              sub: 'Total monthly outflows',
              color: '#041b3c',
            },
            {
              label: 'Net Burn (Monthly)',
              value: `\u20B9${formatINR(data.net_burn_monthly)}`,
              sub: 'Net cash drain per month',
              // Net burn > 0 means spending more than earning
              color: data.net_burn_monthly > 0 ? '#ba1a1a' : '#041b3c',
            },
            {
              label: 'Cash Coverage',
              value: data.cash_coverage_days !== null
                ? `${data.cash_coverage_days.toFixed(1)} days`
                : 'N/A',
              sub: 'Days cash covers outflows',
              color: '#041b3c',
            },
            {
              label: 'Runway',
              value: data.runway_months !== null
                ? `${data.runway_months.toFixed(1)} months`
                : 'N/A',
              sub: 'At current burn rate',
              color: '#041b3c',
            },
          ] as { label: string; value: string; sub: string; color: string }[]
        ).map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white p-6 rounded-lg shadow-sm">
            <p className="text-on-surface-variant text-xs font-semibold tracking-widest uppercase mb-2 m-0">
              {label}
            </p>
            <p className="text-2xl font-extrabold tracking-tight m-0" style={{ color }}>
              {value}
            </p>
            <p className="text-xs text-on-surface-variant mt-1 m-0">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Obligation Pressure Inline Band ── */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex flex-wrap gap-0 items-stretch divide-x divide-[#c3c6d6]/30">
          {(
            [
              {
                label: 'Overdue Receivables',
                value: `${(data.overdue_receivables_pct * 100).toFixed(1)}%`,
              },
              {
                label: 'Overdue Payables',
                value: `${(data.overdue_payables_pct * 100).toFixed(1)}%`,
              },
              {
                label: 'Penalty Payables',
                value: `${(data.penalty_payables_pct * 100).toFixed(1)}%`,
              },
              {
                label: 'Concentration Risk',
                value: `${(data.counterparty_concentration_risk * 100).toFixed(1)}%`,
              },
              {
                label: 'Cash Flow Volatility',
                value: `\u20B9${formatINR(data.cash_flow_volatility)}`,
              },
            ] as { label: string; value: string }[]
          ).map(({ label, value }) => (
            <div key={label} className="px-6 first:pl-0 last:pr-0">
              <p className="text-on-surface-variant text-[10px] font-semibold tracking-widest uppercase m-0">
                {label}
              </p>
              <p className="text-sm font-extrabold text-on-background mt-0.5 m-0">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Active Timeline Table ── */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden pb-6">
        <div className="px-8 py-5 bg-[#cdddff]/10">
          <h3 className="text-sm font-bold text-on-background uppercase tracking-widest m-0">
            Active Timeline
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#cdddff] text-[#51617e] text-[11px] font-bold uppercase tracking-widest">
                <th className="px-8 py-3">Date</th>
                <th className="px-6 py-3">Counterparty</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Amount (&#8377;)</th>
                <th className="px-8 py-3">Running Balance (&#8377;)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cfcfcf]/30">
              {data.timeline.map((entry, i) => (
                <tr key={i} className="hover:bg-[#f1f3ff] transition-colors">
                  <td className="px-8 py-4 text-xs font-medium text-on-surface-variant">
                    {entry.date}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-on-surface">
                    {entry.counterparty}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase ${
                        entry.transaction_type === 'inflow'
                          ? 'bg-[#c8f5e1] text-[#1a7a4a]'
                          : 'bg-[#ffdad6] text-[#93000a]'
                      }`}
                    >
                      {entry.transaction_type.toUpperCase()}
                    </span>
                  </td>
                  <td
                    className="px-6 py-4 text-sm font-mono font-bold"
                    style={{ color: entry.transaction_type === 'inflow' ? '#36B37E' : '#ba1a1a' }}
                  >
                    {entry.transaction_type === 'inflow' ? '+' : '-'}
                    {formatINR(entry.amount)}
                  </td>
                  <td
                    className="px-8 py-4 text-sm font-mono font-bold"
                    style={{ color: entry.balance < 0 ? '#ba1a1a' : '#36B37E' }}
                  >
                    {formatINR(entry.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
