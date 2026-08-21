from legacy_discount import apply_legacy_discount


def compute_total(price_cents: int, is_vip: bool) -> int:
    """Computes the final checkout total, applying the VIP discount when eligible."""
    if is_vip:
        return apply_legacy_discount(price_cents)
    return price_cents
