import { useState, useEffect, useCallback } from 'react';
import { Brain, ListTodo, PlayCircle, CheckCircle2, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { fetchDecision } from '../services/decideApi';
import { fetchRecommendation } from '../services/recommendApi';
import type { DecideResponse, Scenario } from '../services/decideApi';
import type { RecommendResponse } from '../services/recommendApi';
import { useBusinessContext } from '../context/BusinessContext';

// Map recommended_scenario name to the scenario key
function getRecommendedScenario(decide: DecideResponse): { key: string; scenario: Scenario } {
    const name = decide.recommended_scenario;
    if (name === decide.scenario_a.name) return { key: 'scenario_a', scenario: decide.scenario_a };
    if (name === decide.scenario_b.name) return { key: 'scenario_b', scenario: decide.scenario_b };
    return { key: 'scenario_c', scenario: decide.scenario_c };
}

export default function ActionExecution() {
    const { selectedBusiness } = useBusinessContext();
    const BUSINESS_ID = selectedBusiness?.id ?? '';

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [decide, setDecide] = useState<DecideResponse | null>(null);
    const [recommend, setRecommend] = useState<RecommendResponse | null>(null);
    const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
    const [executed, setExecuted] = useState(false);
    const [phase, setPhase] = useState<'decide' | 'recommend' | 'done'>('decide');

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        setExecuted(false);
        setCheckedItems(new Set());
        setPhase('decide');

        try {
            // Step 1: Get decision scenarios
            const decideRes = await fetchDecision(BUSINESS_ID);
            setDecide(decideRes);
            setPhase('recommend');

            // Step 2: Get AI recommendation for the best scenario
            const { key, scenario } = getRecommendedScenario(decideRes);
            const recommendRes = await fetchRecommendation(BUSINESS_ID, key, scenario);
            setRecommend(recommendRes);
            setPhase('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const toggleCheck = (idx: number) => {
        setCheckedItems(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const allChecked = recommend
        ? recommend.action_checklist.length > 0 && checkedItems.size === recommend.action_checklist.length
        : false;

    const handleExecute = () => {
        setExecuted(true);
    };

    // --- Loading state ---
    if (loading) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center gap-4 p-8">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-on-surface-variant">
                    {phase === 'decide' ? 'Running decision engine...' : 'Generating recommendations...'}
                </p>
            </div>
        );
    }

    // --- Error state ---
    if (error || !decide || !recommend) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center gap-4 p-8">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <p className="text-sm text-red-600 max-w-md text-center">{error || 'Failed to load data'}</p>
                <button
                    onClick={loadData}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-sm text-sm font-medium border-none cursor-pointer hover:bg-[#002f7a] transition-colors"
                >
                    <RefreshCw className="w-4 h-4" /> Retry
                </button>
            </div>
        );
    }

    const { scenario } = getRecommendedScenario(decide);

    // Split CoT into numbered steps
    const cotSteps = recommend.cot_explanation
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.trim().length > 0);

    return (
        <div className="flex-grow p-8 max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
            {/* Column 1: Decision Logic */}
            <section className="space-y-6">
                <div className="bg-[#f4f5f7] p-6 rounded-sm border border-[#c3c6d6]/50 h-full">
                    <div className="flex items-center gap-2 mb-6">
                        <Brain className="w-5 h-5 text-primary" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant">Decision Logic</h2>
                    </div>

                    {/* Recommended strategy badge */}
                    <div className="mb-6 p-3 bg-white rounded-sm border border-[#c3c6d6]/30">
                        <p className="text-xs text-on-surface-variant mb-1">Recommended Strategy</p>
                        <p className="text-sm font-bold text-primary">{scenario.name}</p>
                        <div className="flex gap-6 mt-2">
                            <div>
                                <span className="text-xs text-on-surface-variant">Min Balance</span>
                                <p className={`text-sm font-bold ${scenario.min_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {scenario.min_balance < 0 ? '-' : ''}₹{Math.abs(scenario.min_balance).toLocaleString('en-IN')}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs text-on-surface-variant">Total Penalties</span>
                                <p className="text-sm font-bold text-on-surface">₹{scenario.total_penalties.toLocaleString('en-IN')}</p>
                            </div>
                            <div>
                                <span className="text-xs text-on-surface-variant">Deferred</span>
                                <p className="text-sm font-bold text-on-surface">{scenario.defer_list.length} items</p>
                            </div>
                        </div>
                    </div>

                    {/* Chain-of-Thought */}
                    <div>
                        <p className="text-xs font-bold text-on-surface mb-3">Chain-of-Thought Reasoning</p>
                        <ul className="space-y-4 text-sm text-on-surface-variant leading-relaxed">
                            {cotSteps.map((step, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="text-primary font-bold shrink-0">
                                        {String(i + 1).padStart(2, '0')}.
                                    </span>
                                    <span>{step}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Pay / Defer summary */}
                    <div className="mt-6 pt-6 border-t border-[#c3c6d6]/20 space-y-3">
                        <p className="text-xs font-bold text-on-surface mb-2">Pay / Defer Breakdown</p>
                        {scenario.pay_list.length > 0 && (
                            <div>
                                <p className="text-xs text-green-700 font-semibold mb-1">Pay Now ({scenario.pay_list.length})</p>
                                {scenario.pay_list.map(ob => (
                                    <p key={ob.id} className="text-xs text-on-surface-variant ml-3">
                                        {ob.counterparty} — ₹{ob.amount.toLocaleString('en-IN')} (due {ob.due_date})
                                    </p>
                                ))}
                            </div>
                        )}
                        {scenario.defer_list.length > 0 && (
                            <div className="mt-2">
                                <p className="text-xs text-amber-700 font-semibold mb-1">Deferred ({scenario.defer_list.length})</p>
                                {scenario.defer_list.map(ob => (
                                    <p key={ob.id} className="text-xs text-on-surface-variant ml-3">
                                        {ob.counterparty} — ₹{ob.amount.toLocaleString('en-IN')} (penalty rate: {(ob.penalty_rate * 100).toFixed(1)}%/day)
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Column 2: Execution Queue */}
            <section className="space-y-6">
                <div className="bg-white p-6 rounded-sm border border-[#c3c6d6]/50 shadow-sm h-full flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <ListTodo className="w-5 h-5 text-primary" />
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant">Execution Queue</h2>
                        </div>
                        <span className="text-xs text-on-surface-variant bg-surface-container-low px-2 py-1 rounded">
                            {checkedItems.size}/{recommend.action_checklist.length} Completed
                        </span>
                    </div>

                    <div className="space-y-3 flex-grow">
                        {recommend.action_checklist.map((action, idx) => {
                            const isChecked = checkedItems.has(idx);
                            return (
                                <div
                                    key={idx}
                                    className={`group p-4 rounded-sm transition-all border-l-4 ${
                                        isChecked
                                            ? 'bg-green-50 border-green-500 opacity-75'
                                            : idx === 0
                                              ? 'bg-surface-container-low border-primary hover:bg-[#e8edff]'
                                              : 'bg-white border-[#c3c6d6]/30 hover:bg-surface-container-low'
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <input
                                            className="mt-1 rounded-sm border-[#737685] text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleCheck(idx)}
                                            disabled={executed}
                                        />
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <p className={`font-semibold text-on-surface text-sm ${isChecked ? 'line-through' : ''}`}>
                                                    {action}
                                                </p>
                                                {idx === 0 && !isChecked && (
                                                    <span className="text-xs font-bold text-primary shrink-0 ml-2">HIGH PRIORITY</span>
                                                )}
                                                {isChecked && (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 ml-2" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Execute button */}
                    <div className="mt-8 pt-6 border-t border-[#c3c6d6]/20 flex justify-center">
                        {executed ? (
                            <div className="w-full py-4 px-8 rounded-sm font-bold tracking-tight flex items-center justify-center gap-3 bg-green-600 text-white">
                                <CheckCircle2 className="w-5 h-5" />
                                Plan Executed Successfully
                            </div>
                        ) : (
                            <button
                                onClick={handleExecute}
                                disabled={!allChecked}
                                className={`w-full py-4 px-8 rounded-sm font-bold tracking-tight transition-all flex items-center justify-center gap-3 border-none cursor-pointer ${
                                    allChecked
                                        ? 'bg-[#0052cc] text-white hover:bg-primary active:scale-[0.98]'
                                        : 'bg-[#c3c6d6]/40 text-on-surface-variant cursor-not-allowed'
                                }`}
                            >
                                <PlayCircle className="w-5 h-5" />
                                {allChecked ? 'Execute Approved Plan' : `Check all ${recommend.action_checklist.length} items to execute`}
                            </button>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
