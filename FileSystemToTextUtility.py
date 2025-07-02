"""FileSystemToTextUtility
--------------------------------
Utility script to generate simple indented text representations (a "tree") of
specific directories inside a project:
1. The project root (i.e. the directory this script is executed from, or an
   optional path passed via CLI).
2. A `public` sub-directory (if present).
3. A `server` sub-directory (if present).

Running the script will create up to three files next to the script:
    filesystem tree.txt ─ Combined tree of project root plus `public/` and `server/` directories (if they exist)

Usage
-----
python FileSystemToTextUtility.py [BASE_PATH] [--exclude NAME1 NAME2 ...]

If BASE_PATH is omitted, the current working directory is used as the base
(project root) directory.

The --exclude option allows you to skip specified directories or files. For
example, to exclude 'node_modules' and '.venv', you would run:
python FileSystemToTextUtility.py --exclude node_modules .venv
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import List


INDENT = "    "  # 4 spaces per tree depth level.


def build_tree_lines(
    start_path: Path,
    prefix: str = "",
    exclude_list: List[str] | None = None,
) -> List[str]:
    """Recursively walk *start_path* and return a list of indented lines.

    Each directory/file is represented on its own line. Directories are suffixed
    with a trailing slash.
    Hidden files/folders (starting with a dot) and names in the exclude list
    are skipped.
    """
    if exclude_list is None:
        exclude_list = []
    lines: List[str] = []
    try:
        entries = sorted(
            p
            for p in start_path.iterdir()
            if not p.name.startswith(".") and p.name not in exclude_list
        )
    except PermissionError:
        # Skip directories we cannot access.
        return lines

    for idx, path in enumerate(entries):
        connector = "└── " if idx == len(entries) - 1 else "├── "
        display_name = f"{path.name}/" if path.is_dir() else path.name
        lines.append(f"{prefix}{connector}{display_name}")
        if path.is_dir():
            extension = "    " if idx == len(entries) - 1 else "│   "
            lines.extend(build_tree_lines(path, prefix + extension, exclude_list))
    return lines


def write_tree(start_path: Path, out_file: Path) -> None:
    """Generate a tree for *start_path* and write it into *out_file*."""
    if not start_path.exists():
        print(f"[skip] {start_path} does not exist – output will not be generated.")
        return

    header = f"Directory tree for: {start_path.resolve()}"
    lines = [header, "─" * len(header)]
    lines.append(start_path.name + "/")
    lines.extend(build_tree_lines(start_path))

    out_file.write_text("\n".join(lines), encoding="utf-8")
    print(f"[ok] Wrote {out_file}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a combined directory tree for project root, public, and server folders."
    )
    parser.add_argument(
        "base_path",
        nargs="?",
        default=os.getcwd(),
        help="Base directory (project root). Defaults to current working directory.",
    )
    parser.add_argument(
        "--exclude",
        nargs="+",
        default=[],
        help="A list of directory or file names to exclude from the tree.",
    )
    args = parser.parse_args()

    base_dir = Path(args.base_path).resolve()
    if not base_dir.exists():
        raise SystemExit(f"Base path '{base_dir}' does not exist.")

    # Gather tree sections for the directories we care about.
    targets = [
        base_dir,
    ]

    combined_lines: List[str] = []
    for directory in targets:
        if not directory.exists():
            # Skip non-existent paths silently.
            continue
        header = f"Directory tree for: {directory.resolve()}"
        combined_lines.append(header)
        combined_lines.append("─" * len(header))
        combined_lines.append(directory.name + "/")
        combined_lines.extend(build_tree_lines(directory, exclude_list=args.exclude))
        combined_lines.append("")  # Blank line between sections

    if not combined_lines:
        print("No valid directories found to scan.")
        return

    out_file = base_dir / "filesystem-tree.txt"
    out_file.write_text("\n".join(combined_lines).rstrip() + "\n", encoding="utf-8")
    print(f"[ok] Wrote {out_file}")


if __name__ == "__main__":
    main()
