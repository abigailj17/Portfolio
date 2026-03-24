// ACS Table B25040 — House Heating Fuel
// Variables: estimated count of occupied housing units per fuel type
const FUEL_VARIABLES = {
  B25040_002E: "Utility gas",
  B25040_003E: "Bottled/tank/LP gas",
  B25040_004E: "Electricity",
  B25040_005E: "Fuel oil/kerosene",
  B25040_006E: "Coal or coke",
  B25040_007E: "Wood",
  B25040_008E: "Solar energy",
  B25040_009E: "Other fuel",
  B25040_010E: "No fuel used",
};

const VARIABLE_LIST = Object.keys(FUEL_VARIABLES).join(",");
const ACS_URL = `https://api.census.gov/data/2022/acs/acs5?get=NAME,${VARIABLE_LIST}&for=county:*&in=state:50`;

// --- UI ---

let allCountyData = [];

async function initHeatingFuel() {
  const select = document.getElementById("county-select");
  const status = document.getElementById("hf-status");

  status.textContent = "Loading county data…";

  try {
    allCountyData = await fetchHeatingFuelData();
  } catch (err) {
    status.textContent = "Failed to load data. Please try again later.";
    console.error(err);
    return;
  }

  // Populate dropdown
  allCountyData.forEach((county) => {
    const option = document.createElement("option");
    option.value = county.countyName;
    option.textContent = county.countyName;
    select.appendChild(option);
  });

  status.textContent = "";
  select.disabled = false;

  select.addEventListener("change", () => {
    const chosen = allCountyData.find((c) => c.countyName === select.value);
    if (chosen) renderTable(chosen);
  });
}

function renderTable(county) {
  const container = document.getElementById("hf-results");
  container.innerHTML = `
    <h3 class="hf-county-title">${county.countyName} County</h3>
    <table class="hf-table">
      <thead>
        <tr><th>Heating Fuel Type</th><th>Occupied Housing Units</th></tr>
      </thead>
      <tbody>
        ${county.fuelCounts
          .map((f) => `<tr><td>${f.label}</td><td>${f.value.toLocaleString()}</td></tr>`)
          .join("")}
      </tbody>
    </table>
    <p class="hf-source">Source: U.S. Census Bureau, ACS 5-Year Estimates (2022), Table B25040</p>
  `;
}

document.addEventListener("DOMContentLoaded", initHeatingFuel);

// Fetch all Vermont county data from the ACS API
async function fetchHeatingFuelData() {
  const response = await fetch(ACS_URL);
  if (!response.ok) throw new Error(`Census API error: ${response.status}`);
  const raw = await response.json();

  // raw[0] is the header row; raw[1..] are data rows
  const headers = raw[0];
  const rows = raw.slice(1);

  // Parse each row into { countyName, fuelCounts: [{ label, value }] }
  return rows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i]));

    const countyName = obj.NAME.replace(", Vermont", "");
    const fuelCounts = Object.entries(FUEL_VARIABLES).map(([key, label]) => ({
      label,
      value: parseInt(obj[key], 10),
    }));

    return { countyName, fuelCounts };
  }).sort((a, b) => a.countyName.localeCompare(b.countyName));
}
