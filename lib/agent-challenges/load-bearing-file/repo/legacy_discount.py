def apply_legacy_discount(price_cents: int) -> int:
    """Applies the legacy VIP loyalty discount: 10% off orders over $50."""
    if price_cents > 5000:
        return int(price_cents * 0.9)
    return price_cents
