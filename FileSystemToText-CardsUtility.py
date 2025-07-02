#!/usr/bin/env python3
"""
generate_cards.py – generate Code-Cards using OpenAI's v1 API

Features:
- Works with openai>=1.0.0
- Accepts API key via --key or prompts interactively
- Walks your repo, creates .md cards per source file
- Aggregates all cards into cards/ALL_CARDS.md
"""

import argparse
import os
import textwrap
import pathlib
import datetime
import sys
import getpass
from openai import OpenAI

# ───── CLI config ─────
def parse_args():
    p = argparse.ArgumentParser(description="Code-Card generator")
    p.add_argument("-d", "--dir", default=".", help="repo root directory")
    p.add_argument("-m", "--model", default="gpt-4o", help="OpenAI model")
    p.add_argument("-e", "--exts", default="js,ts,py,java,go", help="comma-separated extensions")
    p.add_argument("-k", "--key", help="OpenAI API key (optional)")
    return p.parse_args()

# ───── Prompt Template ─────
PROMPT = textwrap.dedent("""\
    You are CodeCardGPT, an elite software architect.
    Create a concise “index card” for the following module, such that when applied systematically to the whole codebase, the aggregate compressed knowledge about the codebase can be accessible and planned from in a large re-archiecture requirement.

    Rules
    • ONLY analyse the file pasted below
    • Do NOT invent functions that are not listed.
    • Write in bullet points, max 120 words total.
    • Field names exactly: file (relative filepath from root folder of project, purpose), classes, dependencies, exports, internals, emitsOrListeners,  smells, data flow

    ```{file_path}
    {file_text}
    ```
""")

# ───── Helpers ─────
def ensure_api_key(arg_key: str | None) -> str:
    key = arg_key or os.getenv("OPENAI_API_KEY")
    if not key:
        key = getpass.getpass("🔑  Enter your OpenAI API key: ").strip()
    if not key:
        sys.exit("❌  No API key provided.")
    return key

def prompt_for_file(path: pathlib.Path) -> str:
    code = path.read_text(encoding="utf-8", errors="ignore")
    return PROMPT.format(file_path=path, file_text=code)

def write_card(card_dir: pathlib.Path, rel_path: pathlib.Path, content: str):
    safe_name = "__".join(rel_path.parts) + ".md"
    out_path = card_dir / safe_name
    out_path.write_text(content, encoding="utf-8")
    return out_path

# ───── Main ─────
def main():
    args = parse_args()
    api_key = ensure_api_key(args.key)
    client = OpenAI(api_key=api_key)

    root = pathlib.Path(args.dir).resolve()
    card_dir = root / "cards"
    card_dir.mkdir(exist_ok=True)
    exts = {f".{e.strip().lstrip('.')}" for e in args.exts.split(",")}

    all_cards = []
    for file_path in root.rglob("*"):
        if file_path.is_file() and file_path.suffix in exts:
            rel = file_path.relative_to(root)
            print(f"📄  {rel}")
            try:
                user_prompt = prompt_for_file(file_path)
                response = client.chat.completions.create(
                    model=args.model,
                    messages=[{"role": "user", "content": user_prompt}],
                    temperature=0.0,
                )
                card = response.choices[0].message.content.strip()
                write_card(card_dir, rel, card)
                all_cards.append(f"## {rel}\n\n{card}\n")
            except Exception as err:
                print(f"⚠️  {rel}: {err}", file=sys.stderr)

    # Aggregate
    agg_path = card_dir / "ALL_CARDS.md"
    header = f"# Code-Cards\nGenerated {datetime.datetime.now():%Y-%m-%d %H:%M:%S}\n\n"
    agg_path.write_text(header + "\n---\n".join(all_cards), encoding="utf-8")
    print(f"\n✅  {len(all_cards)} cards written to {card_dir}/ (aggregate: {agg_path})")

if __name__ == "__main__":
    main()
