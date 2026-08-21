from orders import order_total
from invoices import invoice_summary


def test_order_total():
    assert order_total([1099, 250, 100]) == "$14.49"


def test_order_total_single_item():
    assert order_total([500]) == "$5.00"


def test_invoice_summary():
    assert invoice_summary(2000, 160) == "Subtotal: $20.00, Tax: $1.60, Total: $21.60"
