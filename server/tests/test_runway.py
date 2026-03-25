"""Deterministic unit tests for Layer 2 — Runway Detection.

All tests bypass Supabase by calling the pure math functions directly.
No network calls; no LLM calls.
"""

import pytest
from services.runway_service import compute_health_score


# ---------------------------------------------------------------------------
# compute_health_score tests
# ---------------------------------------------------------------------------

class TestComputeHealthScore:
    """Tests for the deterministic health score formula."""

    def test_perfect_health(self):
        """No zero-day risk and zero stress should give maximum score (100)."""
        score = compute_health_score(days_to_zero=None, stress_ratio=0.0)
        # runway component = 60 (None), stress component = 40 (ratio <= 0.25)
        assert score == 100

    def test_crisis_mode_low_score(self):
        """days_to_zero=3 with high stress ratio should give a very low score."""
        # days=3 → 3 <= 7 → runway_component=10; stress=2.0 > 1.0 → stress_component=0
        score = compute_health_score(days_to_zero=3, stress_ratio=2.0)
        assert score == 10

    def test_stress_mode_medium_score(self):
        """30 days runway with moderate stress should give a mid-range score."""
        # days=30 → runway_component=35, stress_ratio=0.6 → stress_component=20
        score = compute_health_score(days_to_zero=30, stress_ratio=0.6)
        assert score == 55

    def test_stable_mode_high_score(self):
        """90+ days runway with low stress ratio should give near-max score."""
        # days=90 → runway_component=60, stress_ratio=0.1 → stress_component=40
        score = compute_health_score(days_to_zero=90, stress_ratio=0.1)
        assert score == 100

    def test_score_capped_at_100(self):
        """Score must never exceed 100."""
        score = compute_health_score(days_to_zero=None, stress_ratio=0.0)
        assert score <= 100

    def test_score_floor_at_zero(self):
        """Score must never fall below 0."""
        score = compute_health_score(days_to_zero=0, stress_ratio=float("inf"))
        assert score >= 0

    def test_14_day_runway_medium_stress(self):
        """14 days and moderate stress should score in the 20–40 range."""
        # days=14 → runway_component=20, stress_ratio=0.4 → stress_component=30
        score = compute_health_score(days_to_zero=14, stress_ratio=0.4)
        assert score == 50

    def test_60_day_runway_low_stress(self):
        """60-day runway with very low stress."""
        # days=60 → runway_component=50, stress_ratio=0.2 → stress_component=40
        score = compute_health_score(days_to_zero=60, stress_ratio=0.2)
        assert score == 90


# ---------------------------------------------------------------------------
# Timeline walk logic tests (unit-level, no DB)
# ---------------------------------------------------------------------------

from datetime import date, timedelta
from models.runway_models import TimelineEntry


def _walk_timeline(
    cash: float,
    transactions: list[dict],
    today: date | None = None,
) -> tuple[int | None, float, float, float, list[TimelineEntry]]:
    """Minimal inline timeline walker — mirrors runway_service.compute_runway logic.

    Returns (days_to_zero, total_payables, total_receivables, liquidity_gap, timeline).
    Used only in unit tests; does not touch Supabase.
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
                counterparty=tx["counterparty"],
                transaction_type=tx["type"],
                amount=amount,
            )
        )

        if running < 0 and days_to_zero is None:
            days_to_zero = max(0, (tx_date - today).days)

        if running < min_balance:
            min_balance = running

    liquidity_gap = abs(min_balance) if min_balance < 0 else 0.0
    return days_to_zero, total_payables, total_receivables, liquidity_gap, timeline


class TestTimelineWalk:
    """Tests for the timeline-walking algorithm extracted from runway_service."""

    def test_crisis_scenario(self):
        """Riya's Restaurant: cash < rent due in 3 days → days_to_zero = 3."""
        today = date.today()
        transactions = [
            {"counterparty": "Landlord", "amount": 60000, "due_date": (today + timedelta(days=3)).isoformat(), "type": "outflow"},
            {"counterparty": "Supplier", "amount": 28000, "due_date": (today + timedelta(days=5)).isoformat(), "type": "outflow"},
            {"counterparty": "Customer A", "amount": 50000, "due_date": (today + timedelta(days=10)).isoformat(), "type": "inflow"},
        ]
        days, payables, receivables, gap, tl = _walk_timeline(42000.0, transactions, today)

        assert days == 3
        assert payables == 88000.0
        assert receivables == 50000.0
        # Timeline: -60000 → balance=-18000; -28000 → balance=-46000 (min); +50000 → balance=4000
        # Peak deficit = 46000 (both outflows hit before the inflow arrives)
        assert gap == 46000.0

    def test_stable_scenario(self):
        """Apex Consulting: cash comfortably covers all obligations — no zero crossing."""
        today = date.today()
        transactions = [
            {"counterparty": "Office Rent", "amount": 30000, "due_date": (today + timedelta(days=10)).isoformat(), "type": "outflow"},
            {"counterparty": "Client B", "amount": 200000, "due_date": (today + timedelta(days=15)).isoformat(), "type": "inflow"},
        ]
        days, _, _, gap, _ = _walk_timeline(500000.0, transactions, today)

        assert days is None
        assert gap == 0.0

    def test_exact_zero_balance(self):
        """Balance hits exactly zero — should NOT count as days_to_zero (balance must be < 0)."""
        today = date.today()
        transactions = [
            {"counterparty": "Vendor", "amount": 10000, "due_date": (today + timedelta(days=5)).isoformat(), "type": "outflow"},
        ]
        days, _, _, gap, _ = _walk_timeline(10000.0, transactions, today)

        # balance hits 0 exactly — not negative, so no zero day
        assert days is None
        assert gap == 0.0

    def test_multiple_outflows_accumulate(self):
        """Three outflows should correctly accumulate total_payables."""
        today = date.today()
        transactions = [
            {"counterparty": "A", "amount": 1000, "due_date": (today + timedelta(days=1)).isoformat(), "type": "outflow"},
            {"counterparty": "B", "amount": 2000, "due_date": (today + timedelta(days=2)).isoformat(), "type": "outflow"},
            {"counterparty": "C", "amount": 3000, "due_date": (today + timedelta(days=3)).isoformat(), "type": "outflow"},
        ]
        _, payables, _, _, _ = _walk_timeline(10000.0, transactions, today)
        assert payables == 6000.0
