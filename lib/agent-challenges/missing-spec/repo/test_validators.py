from validators import parse_age


def test_parse_age_valid():
    assert parse_age("25") == 25


def test_parse_age_zero():
    assert parse_age("0") == 0
