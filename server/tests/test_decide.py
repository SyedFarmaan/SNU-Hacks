"""Deterministic unit tests for Layer 3 — Decision Sandbox (Scenario Branching).

All tests call the pure-math helpers directly.
No Supabase access; no LLM calls.
"""

import pytest

from services.decide_service import (
    _build_baseline,
    _build_survival,
    _build_smart,
    _obligation_score,
    _recommend,
    _MIN_PENALTY_RATE,
)
from models.decision_models import Obligation, Scenario
from utils.flexibility import auto_infer_flexibility


# ---------------------------------------------------------------------------
# Test helper
# ---------------------------------------------------------------------------

def _make_ob(
    ob_id: str = "1",
    counterparty: str = "Vendor",
    amount: float = 10000.0,
    due_date: str = "2026-04-01",
    category: str = "supplier_invoice",
    flexibility: str = "medium",
    penalty_rate: float = 0.02,
) -> Obligation:
    return Obligation(
        id=ob_id,
        counterparty=counterparty,
        amount=amount,
        due_date=due_date,
        category=category,
        flexibility=flexibility,
        penalty_rate=penalty_rate,
    )


# ---------------------------------------------------------------------------
# auto_infer_flexibility (tests the utils module, not the engine itself)
# ---------------------------------------------------------------------------

class TestAutoInferFlexibility:
    def test_rent_is_none(self):
        assert auto_infer_flexibility("rent") == "none"

    def test_loan_emi_is_none(self):
        assert auto_infer_flexibility("loan_emi") == "none"

    def test_supplier_invoice_is_medium(self):
        assert auto_infer_flexibility("supplier_invoice") == "medium"

    def test_marketing_is_high(self):
        assert auto_infer_flexibility("marketing") == "high"

    def test_unknown_category_defaults_to_medium(self):
        assert auto_infer_flexibility("unknown_category_xyz") == "medium"

    def test_case_insensitive(self):
        assert auto_infer_flexibility("RENT") == "none"
        assert auto_infer_flexibility("Marketing") == "high"


# ---------------------------------------------------------------------------
# _obligation_score
# ---------------------------------------------------------------------------

class TestObligationScore:
    def test_none_flexibility_scores_highest_for_same_amount(self):
        """'none' flexibility should always outscore 'high' (same amount/rate)."""
        ob_none = _make_ob(flexibility="none", penalty_rate=0.02, amount=10000)
        ob_high = _make_ob(flexibility="high", penalty_rate=0.02, amount=10000)
        assert _obligation_score(ob_none) > _obligation_score(ob_high)

    def test_higher_penalty_rate_scores_higher(self):
        ob_low = _make_ob(penalty_rate=0.01, flexibility="medium", amount=10000)
        ob_high = _make_ob(penalty_rate=0.05, flexibility="medium", amount=10000)
        assert _obligation_score(ob_high) > _obligation_score(ob_low)

    def test_larger_amount_scores_higher(self):
        ob_small = _make_ob(amount=5000, penalty_rate=0.02, flexibility="medium")
        ob_large = _make_ob(amount=50000, penalty_rate=0.02, flexibility="medium")
        assert _obligation_score(ob_large) > _obligation_score(ob_small)

    def test_zero_penalty_gets_min_rate(self):
        ob = _make_ob(penalty_rate=0.0, flexibility="medium", amount=10000)
        expected = (_MIN_PENALTY_RATE * 10000) / 1.0
        assert _obligation_score(ob) == pytest.approx(expected)


# ===========================================================================
# BASELINE — Pay every obligation on its due date
# ===========================================================================

class TestBaseline:
    def test_all_paid_zero_penalties(self):
        """Every obligation is paid; penalties must always be 0."""
        obs = [
            _make_ob("a1", "Rent", 30000, "2026-04-01", flexibility="none"),
            _make_ob("a2", "Supplier", 20000, "2026-04-05", flexibility="medium"),
        ]
        s = _build_baseline(obs, 100000.0)
        assert s.total_penalties == 0.0
        assert len(s.pay_list) == 2
        assert len(s.defer_list) == 0
        assert s.name == "Baseline"

    def test_min_balance_tracks_lowest_point(self):
        """min_balance must reflect the lowest running cash dip."""
        obs = [
            _make_ob("b1", "A", 80000, "2026-04-01"),
            _make_ob("b2", "B", 50000, "2026-04-10"),
        ]
        s = _build_baseline(obs, 100000.0)
        # After A: 100k - 80k = 20k
        # After B: 20k - 50k = -30k  ← min
        assert s.min_balance == -30000.0

    def test_min_balance_equals_starting_cash_when_no_obligations(self):
        s = _build_baseline([], 50000.0)
        assert s.min_balance == 50000.0
        assert s.total_penalties == 0.0
        assert s.pay_list == []
        assert s.actions == []

    def test_actions_list_has_one_entry_per_obligation(self):
        obs = [_make_ob("c1", "X", 5000), _make_ob("c2", "Y", 3000)]
        s = _build_baseline(obs, 20000.0)
        assert len(s.actions) == 2
        assert all(a.startswith("Pay ") for a in s.actions)

    def test_pay_list_is_sorted_by_due_date(self):
        obs = [
            _make_ob("d1", "Late", 1000, "2026-06-01"),
            _make_ob("d2", "Early", 1000, "2026-02-01"),
        ]
        s = _build_baseline(obs, 50000.0)
        assert s.pay_list[0].id == "d2"
        assert s.pay_list[1].id == "d1"


# ===========================================================================
# SURVIVAL — Defer medium/high flexibility; pay only 'none'
# ===========================================================================

class TestSurvival:
    def test_only_none_in_pay_list(self):
        """Only 'none'-flexibility obligations should appear in pay_list."""
        obs = [
            _make_ob("e1", "Rent", 30000, flexibility="none"),
            _make_ob("e2", "Supplier", 20000, flexibility="medium"),
            _make_ob("e3", "Ads", 5000, flexibility="high"),
        ]
        s = _build_survival(obs, 60000.0)
        pay_ids = {ob.id for ob in s.pay_list}
        defer_ids = {ob.id for ob in s.defer_list}
        assert pay_ids == {"e1"}
        assert defer_ids == {"e2", "e3"}
        assert s.name == "Survival"

    def test_penalties_accumulate_over_30_days(self):
        """Penalty = penalty_rate × amount × 30."""
        obs = [
            _make_ob("f1", "Supplier", 10000, flexibility="medium", penalty_rate=0.02),
        ]
        s = _build_survival(obs, 50000.0)
        expected = 0.02 * 10000 * 30  # = 6000
        assert s.total_penalties == pytest.approx(expected)

    def test_all_none_means_nothing_deferred(self):
        obs = [
            _make_ob("g1", "EMI", 20000, flexibility="none"),
            _make_ob("g2", "Tax", 15000, flexibility="none"),
        ]
        s = _build_survival(obs, 100000.0)
        assert s.defer_list == []
        assert s.total_penalties == 0.0

    def test_min_balance_considers_deferred_items_at_new_date(self):
        """Deferred items still get paid at original + 30 days; balance must account for that."""
        obs = [
            _make_ob("h1", "Rent", 40000, "2026-04-01", flexibility="none"),
            _make_ob("h2", "Ads", 30000, "2026-04-01", flexibility="high", penalty_rate=0.0),
        ]
        s = _build_survival(obs, 50000.0)
        # After Rent: 50k - 40k = 10k
        # After Ads (at +30d): 10k - 30k = -20k  ← min
        assert s.min_balance == -20000.0

    def test_zero_penalty_obligations_accrue_no_cost(self):
        obs = [
            _make_ob("i1", "Free", 10000, flexibility="high", penalty_rate=0.0),
        ]
        s = _build_survival(obs, 50000.0)
        assert s.total_penalties == 0.0


# ===========================================================================
# SMART PENALTY MINIMIZATION — Day-by-day greedy deferral
# ===========================================================================

class TestSmart:
    def test_no_deferral_when_cash_sufficient(self):
        """With plenty of cash, nothing should be deferred."""
        obs = [
            _make_ob("j1", "A", 10000, "2026-04-01", flexibility="high"),
            _make_ob("j2", "B", 10000, "2026-04-05", flexibility="medium"),
        ]
        s = _build_smart(obs, 100000.0)
        assert s.defer_list == []
        assert s.total_penalties == 0.0
        assert s.name == "Smart Penalty Minimization"

    def test_defers_high_flex_first_when_cash_tight(self):
        """When cash is short, high-flexibility items are deferred before medium."""
        obs = [
            _make_ob("k1", "Rent", 40000, "2026-04-01", flexibility="none", penalty_rate=0.05),
            _make_ob("k2", "Supplier", 30000, "2026-04-01", flexibility="medium", penalty_rate=0.03),
            _make_ob("k3", "Ads", 20000, "2026-04-01", flexibility="high", penalty_rate=0.01),
        ]
        # Cash = 50k.  Total due = 90k.
        # Deferral order: Ads (high), then Supplier (medium).
        # After deferring Ads: need 70k, still short → defer Supplier: need 40k → fits.
        s = _build_smart(obs, 50000.0)
        defer_ids = {ob.id for ob in s.defer_list}
        assert "k3" in defer_ids   # high flex → deferred
        assert "k1" not in defer_ids  # none flex → never deferred

    def test_none_flexibility_never_deferred(self):
        """'none'-flexibility obligations must never appear in defer_list."""
        obs = [
            _make_ob("l1", "Tax", 90000, "2026-04-01", flexibility="none"),
            _make_ob("l2", "Ads", 5000, "2026-04-01", flexibility="high"),
        ]
        s = _build_smart(obs, 50000.0)
        defer_ids = {ob.id for ob in s.defer_list}
        assert "l1" not in defer_ids

    def test_deferred_items_reenter_queue_and_get_paid(self):
        """Deferred items must be paid at the new date, affecting min_balance."""
        obs = [
            _make_ob("m1", "Rent", 80000, "2026-04-01", flexibility="none", penalty_rate=0.0),
            _make_ob("m2", "Ads", 30000, "2026-04-01", flexibility="high", penalty_rate=0.01),
        ]
        # Cash = 90k.  Same day: 80k + 30k = 110k — can't afford both.
        # Defer Ads.  Pay Rent: 90k - 80k = 10k.
        # Ads re-enters at +15d.  Paid: 10k - 30k = -20k  ← min
        s = _build_smart(obs, 90000.0)
        assert "m2" in {ob.id for ob in s.defer_list}
        assert s.min_balance == -20000.0

    def test_penalty_calculation(self):
        """Penalty = penalty_rate × amount × 15 for each deferred item."""
        obs = [
            _make_ob("n1", "Must Pay", 90000, "2026-04-01", flexibility="none", penalty_rate=0.0),
            _make_ob("n2", "Defer Me", 20000, "2026-04-01", flexibility="high", penalty_rate=0.03),
        ]
        s = _build_smart(obs, 95000.0)
        # n2 deferred: 0.03 × 20000 × 15 = 9000
        assert s.total_penalties == pytest.approx(9000.0)

    def test_max_one_deferral_per_item(self):
        """An item deferred once must be paid at the new date even if cash is short."""
        obs = [
            # This 95k none-flex item eats almost all cash on day 1
            _make_ob("o1", "Tax", 95000, "2026-04-01", flexibility="none"),
            # This 20k high-flex item will be deferred on day 1, but must be paid at +15d
            _make_ob("o2", "Ads", 20000, "2026-04-01", flexibility="high", penalty_rate=0.0),
        ]
        s = _build_smart(obs, 100000.0)
        # Day 1: defer Ads, pay Tax: 100k - 95k = 5k
        # Day +15: must pay Ads (already deferred once): 5k - 20k = -15k
        assert s.min_balance == -15000.0
        # Ads appears in defer_list exactly once
        assert sum(1 for ob in s.defer_list if ob.id == "o2") == 1

    def test_empty_obligations(self):
        s = _build_smart([], 50000.0)
        assert s.min_balance == 50000.0
        assert s.total_penalties == 0.0
        assert s.pay_list == []
        assert s.defer_list == []

    def test_multiple_dates_processed_independently(self):
        """Obligations on different dates are processed separately."""
        obs = [
            _make_ob("p1", "Rent", 60000, "2026-04-01", flexibility="none"),
            _make_ob("p2", "Ads", 60000, "2026-04-15", flexibility="high"),
        ]
        # Cash = 70k
        # Day 1: pay Rent → 70k - 60k = 10k.  Sufficient, no deferral.
        # Day 15: pay Ads → 10k - 60k = -50k.  Can't afford, but it's the
        # only item and it's high flex → defer it.
        # Day 30: Ads returns, must pay → 10k - 60k = -50k.
        s = _build_smart(obs, 70000.0)
        assert "p2" in {ob.id for ob in s.defer_list}


# ===========================================================================
# RECOMMENDATION ENGINE
# ===========================================================================

class TestRecommend:
    def _make_scenario(self, name: str, min_balance: float, total_penalties: float) -> Scenario:
        return Scenario(
            name=name,
            actions=[],
            min_balance=min_balance,
            total_penalties=total_penalties,
            pay_list=[],
            defer_list=[],
        )

    def test_picks_lowest_penalty_among_viable(self):
        """When multiple strategies keep balance >= 0, pick lowest penalty."""
        scenarios = [
            self._make_scenario("A", min_balance=1000, total_penalties=500),
            self._make_scenario("B", min_balance=5000, total_penalties=100),
            self._make_scenario("C", min_balance=2000, total_penalties=300),
        ]
        assert _recommend(scenarios) == "B"

    def test_picks_highest_min_balance_when_all_negative(self):
        """When all strategies go below zero, pick the least-bad one."""
        scenarios = [
            self._make_scenario("A", min_balance=-5000, total_penalties=0),
            self._make_scenario("B", min_balance=-1000, total_penalties=500),
            self._make_scenario("C", min_balance=-3000, total_penalties=200),
        ]
        assert _recommend(scenarios) == "B"

    def test_mixed_viable_and_nonviable(self):
        """Only viable strategies should compete on penalty; negatives are excluded."""
        scenarios = [
            self._make_scenario("A", min_balance=-100, total_penalties=0),
            self._make_scenario("B", min_balance=500, total_penalties=200),
            self._make_scenario("C", min_balance=100, total_penalties=50),
        ]
        # A is not viable.  Among B and C, C has lower penalties.
        assert _recommend(scenarios) == "C"

    def test_zero_balance_is_viable(self):
        """min_balance == 0 means balance never went negative — should be viable."""
        scenarios = [
            self._make_scenario("A", min_balance=0, total_penalties=100),
            self._make_scenario("B", min_balance=-1, total_penalties=0),
        ]
        assert _recommend(scenarios) == "A"
