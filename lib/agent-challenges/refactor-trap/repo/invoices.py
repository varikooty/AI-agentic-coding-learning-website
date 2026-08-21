def _format_money(cents: int) -> str:
    dollars = cents // 100
    remainder = cents % 100
    return f"${dollars}.{remainder:02d}"


def invoice_summary(subtotal_cents: int, tax_cents: int) -> str:
    total = subtotal_cents + tax_cents
    return f"Subtotal: {_format_money(subtotal_cents)}, Tax: {_format_money(tax_cents)}, Total: {_format_money(total)}"
