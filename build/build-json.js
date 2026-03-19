const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// --- Configuration ---
const INPUT = path.join(__dirname, "..", "data", "dataset_inventory.xlsx");
const OUTPUT = path.join(__dirname, "..", "assets", "resources.json");
const SHEET_NAME = "Resources"; // Must match the tab name in your Excel file

// --- Read the Excel file ---
const workbook = XLSX.readFile(INPUT);
const sheet = workbook.Sheets[SHEET_NAME];

if (!sheet) {
  console.error(`Sheet "${SHEET_NAME}" not found. Available sheets: ${workbook.SheetNames.join(", ")}`);
  process.exit(1);
}

// Convert to array of objects using the header row as keys
const raw = XLSX.utils.sheet_to_json(sheet);

// --- Transform each row ---
const resources = raw.map((row, i) => {
  const name = (row["Dataset Name"] || "").trim();
  const link = (row["Link"] || "").trim();
  const notes = (row["Notes"] || "").trim();
  const tagsRaw = (row["Tags"] || "").toString().trim();

  // Split comma-separated tags into an array, filter out empties
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!name) {
    console.warn(`Row ${i + 2}: missing Dataset Name, skipping.`);
    return null;
  }

  return {
    id: i + 1,
    name,
    link,
    notes,
    tags,
  };
}).filter(Boolean);

// --- Write JSON ---
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(resources, null, 2));

console.log(`Built ${resources.length} resources → ${OUTPUT}`);

// --- Print tag summary ---
const tagCounts = {};
resources.forEach((r) => r.tags.forEach((t) => {
  tagCounts[t] = (tagCounts[t] || 0) + 1;
}));
const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
console.log(`\nTags (${sorted.length} unique):`);
sorted.forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));