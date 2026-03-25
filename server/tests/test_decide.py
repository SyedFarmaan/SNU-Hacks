"""Deterministic unit tests for Layer 3 — Decision Sandbox.

All tests call the pure math helpers directly.
No Supabase access; no LLM calls.
"""

import pytest
from services.decide_service import (
    _build_scenario_a,
    _build_scenario_b,
    _build_scenario_c,
    _obligation_score,
    _total_penalty,
    _MIN_PENALTY_RATE,
)
from models.decision_models import Obligation
from utils.flexibility import auto_infer_flexibility


# ---------------------------------------------------------------------------
# auto_infer_flexibility tests
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
# _obligation_score tests
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


class TestObligationScore:
    def test_none_flexibility_scores_highest_for_same_amount(self):
        """'none' flexibility obligation should always outscore 'high' for same amount/rate."""
        ob_none = _make_ob(flexibility="none", penalty_rate=0.02, amount=10000)
        ob_high = _make_ob(flexibility="high", penalty_rate=0.02, amount=10000)
        assert _obligation_score(ob_none) > _obligation_score(ob_high)

    def test_higher_penalty_rate_scores_higher(self):
        """Higher penalty rate should increase score, all else equal."""
        ob_low = _make_ob(penalty_rate=0.01, flexibility="medium", amount=10000)
        ob_high = _make_ob(penalty_rate=0.05, flexibility="medium", amount=10000)
        assert _obligation_score(ob_high) > _obligation_score(ob_low)

    def test_larger_amount_scores_higher(self):
        """Larger amount with same rate and flexibility should score higher."""
        ob_small = _make_ob(amount=5000, penalty_rate=0.02, flexibility="medium")
        ob_large = _make_ob(amount=50000, penalty_rate=0.02, flexibility="medium")
        assert _obligation_score(ob_large) > _obligation_score(ob_small)

    def test_zero_penalty_gets_min_rate(self):
        """Obligation with 0 penalty_rate should use _MIN_PENALTY_RATE, not produce score=0."""
        ob = _make_ob(penalty_rate=0.0, flexibility="medium", amount=10000)
        expected = (_MIN_PENALTY_RATE * 10000) / 1.0
        assert _obligation_score(ob) == pytest.approx(expected)


# ---------------------------------------------------------------------------
# Scenario A — Greedy Optimal
# ---------------------------------------------------------------------------

class TestScenarioA:
    def test_pays_high_score_first_then_runs_out(self):
        """With limited cash, greedy should pay the highest-score obligation first."""
        obligations = [
            _make_ob("a1", "Rent", 30000, flexibility="none", penalty_rate=0.0),
            _make_ob("a2", "Supplier", 20000, flexibility="medium", penalty_rate=0.05),
            _make_ob("a3", "Marketing", 10000, flexibility="high", penalty_rate=0.001),
        ]
        scenario = _build_scenario_a(obligations, available_cash=35000.0)

        pay_ids = {ob.id for ob in scenario.pay_list}
        defer_ids = {ob.id for ob in scenario.defer_list}

        # Rent (none) must always be paid regardless of score
        assert "a1" in pay_ids
        # Marketing (high flexibility, low penalty) should be deferred
        assert "a3" in defer_ids

    def test_none_flexibility_always_paid_even_if_overdraft(self):
        """'none' obligations must appear in pay_list even when cash is insufficient."""
        obligations = [
            _make_ob("b1", "Tax Authority", 50000, flexibility="none", penalty_rate=0.1),
        ]
        scenario = _build_scenario_a(obligations, available_cash=10000.0)
        assert scenario.pay_list[0].id == "b1"
        assert len(scenario.defer_list) == 0

    def test_no_obligations_returns_empty_lists(self):
        """Empty obligation list should produce empty pay and defer lists."""
        scenario = _build_scenario_a([], available_cash=100000.0)
        assert scenario.pay_list == []
        assert scenario.defer_list == []
        assert scenario.total_penalty_if_deferred == 0.0


# ---------------------------------------------------------------------------
# Scenario B — Conservative
# ---------------------------------------------------------------------------

class TestScenarioB:
    def test_only_none_flexibility_in_pay_list(self):
        """Conservative scenario pays only 'none' obligations."""
        obligations = [
            _make_ob("c1", "Rent", 30000, flexibility="none"),
            _make_ob("c2", "Supplier", 20000, flexibility="medium"),
            _make_ob("c3", "Ads", 5000, flexibility="high"),
        ]
        scenario = _build_scenario_b(obligations, available_cash=60000.0)

        pay_ids = {ob.id for ob in scenario.pay_list}
        defer_ids = {ob.id for ob in scenario.defer_list}

        assert pay_ids == {"c1"}
        assert defer_ids == {"c2", "c3"}

    def test_all_none_means_nothing_deferred(self):
        """If all obligations are 'none', defer_list must be empty."""
        obligations = [
            _make_ob("d1", "EMI", 20000, flexibility="none"),
            _make_ob("d2", "Tax", 15000, flexibility="none"),
        ]
        scenario = _build_scenario_b(obligations, available_cash=100000.0)
        assert scenario.defer_list == []

    def test_total_penalty_only_from_deferred(self):
        """total_penalty_if_deferred must be sum of penalty_rate*amount for defer_list only."""
        obligations = [
            _make_ob("e1", "Rent", 10000, flexibility="none", penalty_rate=0.02),
            _make_ob("e2", "Supplier", 5000, flexibility="medium", penalty_rate=0.03),
        ]
        scenario = _build_scenario_b(obligations, available_cash=20000.0)
        # Only e2 is deferred: 0.03 * 5000 = 150
        assert scenario.total_penalty_if_deferred == pytest.approx(150.0)


# ---------------------------------------------------------------------------
# Scenario C — Custom (toggles)
# ---------------------------------------------------------------------------

class TestScenarioC:
    def test_all_obligations_appear_in_one_of_the_lists(self):
        """Every obligation must appear in exactly one of pay_list or defer_list."""
        obligations = [
            _make_ob("f1", "A", 10000, flexibility="none", penalty_rate=0.05),
            _make_ob("f2", "B", 8000, flexibility="medium", penalty_rate=0.02),
            _make_ob("f3", "C", 3000, flexibility="high", penalty_rate=0.001),
        ]
        scenario = _build_scenario_c(obligations, available_cash=15000.0)

        all_ids = {ob.id for ob in obligations}
        pay_ids = {ob.id for ob in scenario.pay_list}
        defer_ids = {ob.id for ob in scenario.defer_list}

        assert pay_ids | defer_ids == all_ids
        assert pay_ids & defer_ids == set()  # no overlap

    def test_include_flags_are_set(self):
        """Every obligation in scenario_c must have the include flag explicitly set."""
        obligations = [
            _make_ob("g1", "X", 5000, flexibility="medium", penalty_rate=0.01),
        ]
        scenario = _build_scenario_c(obligations, available_cash=10000.0)

        for ob in scenario.pay_list + scenario.defer_list:
            assert ob.include is not None
