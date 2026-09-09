#!/usr/bin/env python3
"""
sync-bib.py — Inline lihui.bib into tabs/publications.html.

Why: when the page is opened via file:// (no HTTP server), fetch() is blocked
by the browser, so the iframe can't load lihui.bib directly. As a fallback,
publications.html embeds a <script type="text/x-bib" id="bib-source"> block
containing the latest bib text. This script keeps that block in sync with
lihui.bib.

Usage:
    python bin/sync-bib.py            # inlines lihui.bib -> publications.html
    python bin/sync-bib.py --check    # exit 1 if out-of-sync (CI / pre-commit)
"""
import sys
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BIB  = ROOT / "lihui.bib"
PUB  = ROOT / "tabs" / "publications.html"

MARKER_START = '<script type="text/x-bib" id="bib-source">'
MARKER_END   = '</script>'

def main():
    check_only = "--check" in sys.argv[1:]

    if not BIB.exists():
        sys.exit(f"error: {BIB} not found")
    if not PUB.exists():
        sys.exit(f"error: {PUB} not found")

    bib_text = BIB.read_text(encoding="utf-8")
    # Escape any literal </script> in the bib to prevent breaking the script block
    bib_safe = bib_text.replace("</script>", r"<\\/script>")

    pub_text = PUB.read_text(encoding="utf-8")
    pattern  = re.compile(
        re.escape(MARKER_START) + r".*?" + re.escape(MARKER_END),
        re.DOTALL,
    )
    if not pattern.search(pub_text):
        sys.exit(f"error: {MARKER_START} ... {MARKER_END} not found in publications.html")

    replacement = MARKER_START + "\n" + bib_safe + "\n    " + MARKER_END
    new_pub     = pattern.sub(lambda _: replacement, pub_text, count=1)

    if check_only:
        if new_pub == pub_text:
            print("ok: tabs/publications.html is in sync with lihui.bib")
            sys.exit(0)
        else:
            print("STALE: tabs/publications.html is out of sync with lihui.bib")
            print("       run: python bin/sync-bib.py")
            sys.exit(1)

    PUB.write_text(new_pub, encoding="utf-8")
    print(f"synced lihui.bib -> tabs/publications.html")
    print(f"  bib size:  {len(bib_text):,} bytes")
    print(f"  pub size:  {len(new_pub):,} bytes (was {len(pub_text):,})")

if __name__ == "__main__":
    main()
