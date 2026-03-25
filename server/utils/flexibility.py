from typing import Literal

FlexibilityLevel = Literal["none", "medium", "high"]

# Category → default flexibility mapping as defined in the architecture doc
_FLEXIBILITY_MAP: dict[str, FlexibilityLevel] = {
    # Must-pay obligations — high legal/contractual consequences if skipped
    "rent": "none",
    "loan_emi": "none",
    "utility": "none",
    "tax": "none",
    # Negotiable — vendors typically allow short deferrals without penalties
    "supplier_invoice": "medium",
    "contractor": "medium",
    # Freely deferrable — low immediate consequence
    "marketing": "high",
    "subscription": "high",
    "misc": "high",
}

_DEFAULT_FLEXIBILITY: FlexibilityLevel = "medium"


def auto_infer_flexibility(category: str) -> FlexibilityLevel:
    """Return the default flexibility level for a given obligation category.

    Args:
        category: The obligation category string (e.g. 'rent', 'supplier_invoice').
                  Comparison is case-insensitive.

    Returns:
        'none'   — must pay; high penalty or legal risk if skipped.
        'medium' — negotiable; short deferral usually possible.
        'high'   — freely deferrable without significant consequence.

    If the category is not recognised, returns 'medium' as a safe default.
    """
    return _FLEXIBILITY_MAP.get(category.lower().strip(), _DEFAULT_FLEXIBILITY)
