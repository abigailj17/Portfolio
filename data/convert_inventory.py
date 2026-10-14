"""Convert data/dataset_inventory.xlsx into assets/resources.json.

Run after editing the spreadsheet:
    python data/convert_inventory.py

Expected columns (row 1 header, data starts row 2):
    A: Dataset Name   B: Link   C: Notes
    D: Topic          E: Agency  F: Data Output
Topic/Agency/Data Output cells may hold multiple comma-separated values.
"""
import json
import re
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
XLSX_PATH = ROOT / "data" / "dataset_inventory.xlsx"
JSON_PATH = ROOT / "assets" / "resources.json"

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
COL_RE = re.compile(r"([A-Z]+)(\d+)")


def load_shared_strings(z):
    if "xl/sharedStrings.xml" not in z.namelist():
        return []
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    strings = []
    for si in root.findall("m:si", NS):
        text = "".join(t.text or "" for t in si.findall(".//m:t", NS))
        strings.append(text)
    return strings


def cell_value(cell, shared):
    v = cell.find("m:v", NS)
    t = cell.get("t")
    if t == "s":
        return shared[int(v.text)] if v is not None else ""
    if t == "inlineStr":
        isnode = cell.find("m:is", NS)
        return "".join(t_.text or "" for t_ in isnode.findall(".//m:t", NS)) if isnode is not None else ""
    return v.text if v is not None else ""


def split_tags(value):
    return [p.strip() for p in value.split(",") if p.strip()] if value else []


def main():
    with zipfile.ZipFile(XLSX_PATH) as z:
        shared = load_shared_strings(z)
        sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))

    rows = sheet.findall(".//m:sheetData/m:row", NS)
    resources = []
    next_id = 1

    for row in rows[1:]:  # skip header
        values = {}
        for cell in row.findall("m:c", NS):
            col = COL_RE.match(cell.get("r")).group(1)
            values[col] = cell_value(cell, shared)

        name = values.get("A", "").strip()
        if not name:
            continue

        resources.append({
            "id": next_id,
            "name": name,
            "link": values.get("B", "").strip(),
            "notes": values.get("C", "").strip(),
            "topic": split_tags(values.get("D", "")),
            "agency": split_tags(values.get("E", "")),
            "dataOutput": split_tags(values.get("F", "")),
        })
        next_id += 1

    JSON_PATH.write_text(json.dumps(resources, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(resources)} resources to {JSON_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
