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
let activeCounty = null;
let currentView = "table"; // "table" or "chart"
let chartInstance = null;

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
    activeCounty = allCountyData.find((c) => c.countyName === select.value);
    if (activeCounty) {
      currentView = "table";
      showTable(activeCounty);
      document.getElementById("hf-toggle-row").style.display = "block";
      document.getElementById("hf-toggle-btn").textContent = "View as Chart";
    }
  });

  document.getElementById("hf-toggle-btn").addEventListener("click", () => {
    if (!activeCounty) return;
    if (currentView === "table") {
      currentView = "chart";
      showChart(activeCounty);
      document.getElementById("hf-toggle-btn").textContent = "View as Table";
    } else {
      currentView = "table";
      showTable(activeCounty);
      document.getElementById("hf-toggle-btn").textContent = "View as Chart";
    }
  });
}

function showTable(county) {
  document.getElementById("hf-chart-container").style.display = "none";
  const container = document.getElementById("hf-results");
  container.style.display = "block";
  container.innerHTML = `
    <h3 class="hf-county-title">${county.countyName}</h3>
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

function showChart(county) {
  document.getElementById("hf-results").style.display = "none";
  document.getElementById("hf-chart-container").style.display = "block";

  // Destroy previous chart instance if it exists
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const ctx = document.getElementById("hf-chart").getContext("2d");
  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: county.fuelCounts.map((f) => f.label),
      datasets: [{
        label: "Occupied Housing Units",
        data: county.fuelCounts.map((f) => f.value),
        backgroundColor: "#063f0d",
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${county.countyName} — Heating Fuel`,
          font: { family: "Caudex", size: 16 },
        },
        legend: { display: false },
      },
      scales: {
        x: { ticks: { font: { family: "Caudex" } } },
        y: {
          beginAtZero: true,
          ticks: { font: { family: "Caudex" } },
          title: {
            display: true,
            text: "Occupied Housing Units",
            font: { family: "Caudex" },
          },
        },
      },
    },
  });
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
