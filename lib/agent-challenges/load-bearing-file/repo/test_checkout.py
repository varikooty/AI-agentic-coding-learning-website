from checkout import compute_total


def test_regular_customer_no_discount():
    assert compute_total(3000, False) == 3000


def test_vip_customer_gets_discount():
    assert compute_total(6000, True) == 5400


def test_vip_customer_below_threshold_no_discount():
    assert compute_total(4000, True) == 4000
