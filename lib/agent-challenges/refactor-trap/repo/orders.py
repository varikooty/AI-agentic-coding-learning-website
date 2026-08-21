def _format_money(cents: int) -> str:
    dollars = cents // 100
    remainder = cents % 100
    return f"${dollars}.{remainder:02d}"


def order_total(item_prices_cents: list) -> str:
    total = sum(item_prices_cents)
    return _format_money(total)
