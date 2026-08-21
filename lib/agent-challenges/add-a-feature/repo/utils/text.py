import re


def slugify(text: str) -> str:
    """Lowercase, hyphen-separated version of text, safe for use in a URL."""
    if not text:
        return ""
    lowered = text.strip().lower()
    return re.sub(r"[^a-z0-9]+", "-", lowered).strip("-")


def truncate(text: str, max_length: int) -> str:
    """Cuts text to max_length characters, appending '...' if it was cut."""
    if not text:
        return ""
    if len(text) <= max_length:
        return text
    return text[: max_length - 3].rstrip() + "..."
