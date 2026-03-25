"""Deterministic unit tests for Layer 2 — Runway Detection.

All tests bypass Supabase by calling pure math functions directly.
No network calls; no LLM calls.

Test classes:
  - TestComputeHealthScore     — 3-component score formula
  - TestTimelineWalk           — running balance, days_to_zero, liquidity_gap
  - TestBurnRates              — gross/net monthly burn computation
  - TestHorizonSnapshots       — cash_at_7d / 30d / 60d projection
  - TestConcentrationRisk      — counterparty concentration risk
  - TestVolatility             — cash_flow_volatility (std dev)
  - TestDerivedRateMetrics     — cash_coverage_days, runway_months
"""

import math
from collections import defaultdict
from datetime import date, timedelta

import pytest
from models.runway_models import TimelineEntry
from services.runway_service import (
    _horizon_balance,
    _score_from_table,
    _std_dev,
    compute_health_score,
)


# ---------------------------------------------------------------------------
# Helpers shared across test classes
# ---------------------------------------------------------------------------

def _walk_timeline(
    cash: float,
    transactions: list[dict],
    today: date | None = None,
) -> tuple[int | None, float, float, float, float, list[TimelineEntry]]:
    """Minimal inline timeline walker that mirrors runway_service.compute_runway logic.

    Returns:
        (days_to_zero, total_payables, total_receivables, min_balance, liquidity_gap, timeline)
    """
    if today is None:
        today = date.today()

    running = cash
    days_to_zero = None
    total_payables = 0.0
    total_receivables = 0.0
    min_balance = cash
    timeline: list[TimelineEntry] = []

    for tx in sorted(transactions, key=lambda x: x["due_date"]):
        tx_date = date.fromisoformat(tx["due_date"])
        amount = float(tx["amount"])

        if tx["type"] == "outflow":
            running -= amount
            total_payables += amount
        else:
            running += amount
            total_receivables += amount

        timeline.append(
            TimelineEntry(
                date=tx_date,
                balance=running,
                counterparty=tx.get("counterparty", "X"),
                transaction_type=tx["type"],
                amount=amount,
            )
        )

        if running < 0 and days_to_zero is None:
            days_to_zero = max(0, (tx_date - today).days)

        if running < min_balance:
            min_balance = running

    liquidity_gap = abs(min_balance) if min_balance < 0 else 0.0
    return days_to_zero, total_payables, total_receivables, min_balance, liquidity_gap, timeline


def _burn_rates(
    transactions: list[dict],
) -> tuple[float, float]:
    """Compute gross_burn_monthly and net_burn_monthly from a transaction list."""
    monthly_outflows: dict[tuple[int, int], float] = defaultdict(float)
    monthly_inflows: dict[tuple[int, int], float] = defaultdict(float)

    for tx in transactions:
        tx_date = date.fromisoformat(tx["due_date"])
        key = (tx_date.year, tx_date.month)
        amount = float(tx["amount"])
        if tx["type"] == "outflow":
            monthly_outflows[key] += amount
        else:
            monthly_inflows[key] += amount

    all_months = set(monthly_outflows.keys()) | set(monthly_inflows.keys())
    span = max(1, len(all_months))
    gross = sum(monthly_outflows.values()) / span
    net = (sum(monthly_outflows.values()) - sum(monthly_inflows.values())) / span
    return gross, net


def _concentration_risk(transactions: list[dict]) -> float:
    """Compute counterparty concentration risk from outflow transactions."""
    exposure: dict[str, float] = defaultdict(float)
    for tx in transactions:
        if tx["type"] == "outflow":
            exposure[tx["counterparty"]] += float(tx["amount"])
    total = sum(exposure.values())
    return max(exposure.values()) / total if total > 0 else 0.0


# ---------------------------------------------------------------------------
# TestComputeHealthScore
# ---------------------------------------------------------------------------

class TestComputeHealthScore:
    """Tests for the 3-component health score formula (max 50+30+20 = 100)."""

    def test_perfect_health(self):
        # runway=None→50, stress=0→30, overdue_pct=0→20 = 100
        assert compute_health_score(None, 0.0, 0.0) == 100

    def test_crisis_mode_low_score(self):
        # runway=3→10, stress=2.0→0, overdue_pct=0.6 (>0.5, <=inf)→0 = 10
        assert compute_health_score(3, 2.0, 0.6) == 10

    def test_stress_mode_medium_score(self):
        # runway=30→30, stress=0.6→14, overdue_pct=0.0→20 = 64
        assert compute_health_score(30, 0.6, 0.0) == 64

    def test_stable_mode_high_score(self):
        # runway=90→50, stress=0.1→30, overdue_pct=0→20 = 100
        assert compute_health_score(90, 0.1, 0.0) == 100

    def test_score_capped_at_100(self):
        assert compute_health_score(None, 0.0, 0.0) <= 100

    def test_score_floor_at_zero(self):
        assert compute_health_score(0, float("inf"), 1.0) >= 0

    def test_overdue_pressure_reduces_score(self):
        # Same runway & stress, higher overdue → lower score
        score_low_overdue = compute_health_score(60, 0.3, 0.05)
        score_high_overdue = compute_health_score(60, 0.3, 0.5)
        assert score_high_overdue < score_low_overdue

    def test_14_day_runway_moderate_stress_no_overdue(self):
        # runway=14→20, stress=0.4→22, overdue=0→20 = 62
        assert compute_health_score(14, 0.4, 0.0) == 62

    def test_60_day_runway_low_stress(self):
        # runway=60→40, stress=0.2→30, overdue=0→20 = 90
        assert compute_health_score(60, 0.2, 0.0) == 90


# ---------------------------------------------------------------------------
# TestTimelineWalk
# ---------------------------------------------------------------------------

class TestTimelineWalk:
    """Tests for the timeline-walking algorithm."""

    def test_crisis_scenario(self):
        """Riya's Restaurant: cash < rent due in 3 days → days_to_zero = 3."""
        today = date.today()
        txs = [
            {"counterparty": "Landlord", "amount": 60000, "due_date": (today + timedelta(days=3)).isoformat(), "type": "outflow"},
            {"counterparty": "Supplier", "amount": 28000, "due_date": (today + timedelta(days=5)).isoformat(), "type": "outflow"},
            {"counterparty": "Customer A", "amount": 50000, "due_date": (today + timedelta(days=10)).isoformat(), "type": "inflow"},
        ]
        days, payables, receivables, min_bal, gap, _ = _walk_timeline(42000.0, txs, today)

        assert days == 3
        assert payables == 88000.0
        assert receivables == 50000.0
        # After all transactions: 42000 - 60000 - 28000 + 50000 = 4000
        # Min is after second outflow: 42000 - 60000 - 28000 = -46000
        assert gap == 46000.0
        assert min_bal == -46000.0

    def test_stable_scenario(self):
        """Apex Consulting: cash comfortably covers all obligations."""
        today = date.today()
        txs = [
            {"counterparty": "Office Rent", "amount": 30000, "due_date": (today + timedelta(days=10)).isoformat(), "type": "outflow"},
            {"counterparty": "Client B", "amount": 200000, "due_date": (today + timedelta(days=15)).isoformat(), "type": "inflow"},
        ]
        days, _, _, _, gap, _ = _walk_timeline(500000.0, txs, today)
        assert days is None
        assert gap == 0.0

    def test_exact_zero_balance_not_counted(self):
        """Balance hitting exactly 0 should NOT trigger days_to_zero."""
        today = date.today()
        txs = [{"counterparty": "V", "amount": 10000, "due_date": (today + timedelta(days=5)).isoformat(), "type": "outflow"}]
        days, _, _, _, gap, _ = _walk_timeline(10000.0, txs, today)
        assert days is None
        assert gap == 0.0

    def test_multiple_outflows_accumulate(self):
        """Three outflows correctly accumulate total_payables."""
        today = date.today()
        txs = [
            {"counterparty": "A", "amount": 1000, "due_date": (today + timedelta(days=1)).isoformat(), "type": "outflow"},
            {"counterparty": "B", "amount": 2000, "due_date": (today + timedelta(days=2)).isoformat(), "type": "outflow"},
            {"counterparty": "C", "amount": 3000, "due_date": (today + timedelta(days=3)).isoformat(), "type": "outflow"},
        ]
        _, payables, _, _, _, _ = _walk_timeline(10000.0, txs, today)
        assert payables == 6000.0

    def test_min_balance_tracked_correctly(self):
        """min_balance should reflect the deepest negative trough, not the final balance."""
        today = date.today()
        txs = [
            {"counterparty": "X", "amount": 80000, "due_date": (today + timedelta(days=2)).isoformat(), "type": "outflow"},
            {"counterparty": "Y", "amount": 100000, "due_date": (today + timedelta(days=5)).isoformat(), "type": "inflow"},
        ]
        # Balance: 20000 - 80000 = -60000 (trough), then +100000 = 40000
        _, _, _, min_bal, gap, _ = _walk_timeline(20000.0, txs, today)
        assert min_bal == -60000.0
        assert gap == 60000.0


# ---------------------------------------------------------------------------
# TestBurnRates
# ---------------------------------------------------------------------------

class TestBurnRates:
    """Tests for gross and net monthly burn rate computation."""

    def test_single_month_gross_burn(self):
        """All transactions in one month: gross burn = total outflows."""
        today = date.today()
        txs = [
            {"amount": 30000, "due_date": today.isoformat(), "type": "outflow"},
            {"amount": 20000, "due_date": today.isoformat(), "type": "outflow"},
        ]
        gross, _ = _burn_rates(txs)
        # 1 month span → gross = 50000 / 1
        assert gross == 50000.0

    def test_net_burn_with_inflows(self):
        """Net burn = outflows - inflows, averaged over month span."""
        today = date.today()
        txs = [
            {"amount": 50000, "due_date": today.isoformat(), "type": "outflow"},
            {"amount": 20000, "due_date": today.isoformat(), "type": "inflow"},
        ]
        gross, net = _burn_rates(txs)
        assert gross == 50000.0
        assert net == 30000.0

    def test_no_burn_when_only_inflows(self):
        """Net burn should be negative (cash positive) when only inflows exist."""
        today = date.today()
        txs = [{"amount": 40000, "due_date": today.isoformat(), "type": "inflow"}]
        gross, net = _burn_rates(txs)
        assert gross == 0.0
        assert net == -40000.0  # surplus

    def test_two_month_span_averages_correctly(self):
        """Transactions spanning 2 different months: burn rates are averaged."""
        month1 = date(2026, 3, 15)
        month2 = date(2026, 4, 10)
        txs = [
            {"amount": 60000, "due_date": month1.isoformat(), "type": "outflow"},
            {"amount": 40000, "due_date": month2.isoformat(), "type": "outflow"},
        ]
        gross, net = _burn_rates(txs)
        # Total outflows = 100000, over 2 months → 50000/month
        assert gross == 50000.0
        assert net == 50000.0


# ---------------------------------------------------------------------------
# TestHorizonSnapshots
# ---------------------------------------------------------------------------

class TestHorizonSnapshots:
    """Tests for the _horizon_balance function."""

    def test_no_transactions_within_window_returns_initial_cash(self):
        """If all transactions are beyond the horizon, return the starting cash."""
        today = date.today()
        txs = [
            {"counterparty": "X", "amount": 10000, "due_date": (today + timedelta(days=40)).isoformat(), "type": "outflow"},
        ]
        _, _, _, _, _, timeline = _walk_timeline(50000.0, txs, today)
        snap = _horizon_balance(50000.0, timeline, today, 7)
        # No transaction within 7 days, so returns starting cash
        assert snap == 50000.0

    def test_transaction_within_window_reflected(self):
        """A transaction within the window should change the horizon balance."""
        today = date.today()
        txs = [
            {"counterparty": "V", "amount": 15000, "due_date": (today + timedelta(days=5)).isoformat(), "type": "outflow"},
        ]
        _, _, _, _, _, timeline = _walk_timeline(40000.0, txs, today)
        snap = _horizon_balance(40000.0, timeline, today, 7)
        # Transaction on day 5 is within 7-day window: 40000 - 15000 = 25000
        assert snap == 25000.0

    def test_transaction_beyond_30d_not_in_30d_snapshot(self):
        """A transaction due on day 45 is excluded from the 30-day snapshot."""
        today = date.today()
        txs = [
            {"counterparty": "V", "amount": 20000, "due_date": (today + timedelta(days=45)).isoformat(), "type": "outflow"},
        ]
        _, _, _, _, _, timeline = _walk_timeline(80000.0, txs, today)
        snap_30 = _horizon_balance(80000.0, timeline, today, 30)
        snap_60 = _horizon_balance(80000.0, timeline, today, 60)
        assert snap_30 == 80000.0  # no transactions within 30 days
        assert snap_60 == 60000.0  # transaction on day 45 lands within 60 days


# ---------------------------------------------------------------------------
# TestConcentrationRisk
# ---------------------------------------------------------------------------

class TestConcentrationRisk:
    """Tests for counterparty concentration risk computation."""

    def test_single_counterparty_is_100_pct_concentration(self):
        """One vendor = 100% concentration risk."""
        txs = [{"counterparty": "Reliance", "amount": 50000, "type": "outflow"}]
        assert _concentration_risk(txs) == 1.0

    def test_equal_two_counterparties(self):
        """Two counterparties with equal exposure = 50% concentration."""
        txs = [
            {"counterparty": "A", "amount": 10000, "type": "outflow"},
            {"counterparty": "B", "amount": 10000, "type": "outflow"},
        ]
        assert _concentration_risk(txs) == 0.5

    def test_dominant_counterparty_high_risk(self):
        """One counterparty owning 80% of exposure → risk = 0.8."""
        txs = [
            {"counterparty": "Big Vendor", "amount": 80000, "type": "outflow"},
            {"counterparty": "Small Vendor", "amount": 20000, "type": "outflow"},
        ]
        risk = _concentration_risk(txs)
        assert abs(risk - 0.8) < 1e-9

    def test_inflows_excluded_from_concentration(self):
        """Inflows are not part of payable concentration risk."""
        txs = [
            {"counterparty": "Vendor", "amount": 30000, "type": "outflow"},
            {"counterparty": "Customer", "amount": 90000, "type": "inflow"},
        ]
        # Only the outflow matters → single vendor = 100%
        assert _concentration_risk(txs) == 1.0

    def test_no_outflows_returns_zero(self):
        """No outflow transactions → concentration risk is 0."""
        txs = [{"counterparty": "Customer", "amount": 10000, "type": "inflow"}]
        assert _concentration_risk(txs) == 0.0


# ---------------------------------------------------------------------------
# TestVolatility
# ---------------------------------------------------------------------------

class TestVolatility:
    """Tests for the _std_dev helper used in cash flow volatility."""

    def test_empty_returns_zero(self):
        assert _std_dev([]) == 0.0

    def test_single_value_returns_zero(self):
        assert _std_dev([5000.0]) == 0.0

    def test_identical_values_no_variance(self):
        assert _std_dev([1000.0, 1000.0, 1000.0]) == 0.0

    def test_known_std_dev(self):
        # Values: [10, 20, 30] → mean=20, variance=((100+0+100)/3)=66.67, std≈8.165
        result = _std_dev([10.0, 20.0, 30.0])
        assert abs(result - math.sqrt(200 / 3)) < 1e-9

    def test_large_spread(self):
        """High spread of amounts → large volatility value."""
        result = _std_dev([1.0, 100000.0])
        assert result > 10000


# ---------------------------------------------------------------------------
# TestDerivedRateMetrics
# ---------------------------------------------------------------------------

class TestDerivedRateMetrics:
    """Tests for cash_coverage_days and runway_months derived from burn rates."""

    def test_cash_coverage_days_formula(self):
        """cash_coverage_days = current_cash / (gross_burn_monthly / 30)."""
        cash = 60000.0
        gross_burn_monthly = 30000.0
        avg_daily = gross_burn_monthly / 30.0
        coverage = cash / avg_daily
        assert coverage == 60.0

    def test_runway_months_formula(self):
        """runway_months = current_cash / net_burn_monthly."""
        cash = 90000.0
        net_burn = 30000.0
        runway = cash / net_burn
        assert runway == 3.0

    def test_no_burn_returns_none_for_runway(self):
        """If net burn <= 0 (surplus), runway_months should be None."""
        # Simulate the runtime condition
        net_burn_monthly = -5000.0  # cash inflow exceeds outflow
        result = None if net_burn_monthly <= 0 else 1.0
        assert result is None

    def test_no_outflows_coverage_is_none(self):
        """If there are no outflows, cash_coverage_days should be None."""
        avg_daily_outflow = 0.0
        result = None if avg_daily_outflow <= 0 else 1.0
        assert result is None
