from utils.text import slugify, truncate


def test_slugify_basic():
    assert slugify("Hello World") == "hello-world"


def test_slugify_punctuation():
    assert slugify("Wait... What?!") == "wait-what"


def test_slugify_empty():
    assert slugify("") == ""


def test_truncate_short_text_unchanged():
    assert truncate("hello", 10) == "hello"


def test_truncate_long_text():
    assert truncate("hello world", 8) == "hello..."


def test_truncate_empty():
    assert truncate("", 5) == ""
