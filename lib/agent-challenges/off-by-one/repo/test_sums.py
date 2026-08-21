from sums import sum_first_n


def test_sum_first_three():
    assert sum_first_n([1, 2, 3, 4, 5], 3) == 6


def test_sum_first_one():
    assert sum_first_n([10, 20, 30], 1) == 10


def test_sum_all():
    assert sum_first_n([4, 4, 4, 4], 4) == 16
