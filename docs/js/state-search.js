(function () {
  // Load region flavour script lazily (available well before any user search)
  (function () {
    var s = document.createElement("script");
    s.src = "./js/region-flavour.js";
    document.head.appendChild(s);
  })();

  const stateCode = (window.STATE_CODE || "nsw").toLowerCase();
  const stateName = window.STATE_NAME || stateCode.toUpperCase();

  const state = {
    schools: [],
    postcodeCentroids: {},
    suburbCentroids: [],
    lastRows: [],
  };

  let flavourEl = null;

  const locationEl = document.getElementById("location");
  const sectorEl = document.getElementById("sector");
  const radiusEl = document.getElementById("radius");
  const searchBtn = document.getElementById("searchBtn");
  const copyBtn = document.getElementById("copyBtn");
  const metaEl = document.getElementById("meta");
  const copyMetaEl = document.getElementById("copyMeta");
  const errEl = document.getElementById("error");
  const tableEl = document.getElementById("results");
  const tbodyEl = tableEl.querySelector("tbody");
  const pageTitle = document.getElementById("pageTitle");
  const pageSub = document.getElementById("pageSub");

  pageTitle.textContent = `${stateName} School Contact Radius Search`;
  pageSub.textContent = `Enter a ${stateName} postcode or suburb, choose radius, and filter schools by distance.`;

  function esc(text) {
    return String(text || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const p = Math.PI / 180;
    const dLat = (lat2 - lat1) * p;
    const dLon = (lon2 - lon1) * p;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function resolveCenter(rawQuery) {
    const query = rawQuery.trim();
    if (!query) throw new Error("Enter a postcode or suburb.");

    if (/^\d{4}$/.test(query)) {
      const c = state.postcodeCentroids[query];
      if (!c) throw new Error(`No ${stateName} coordinate found for postcode ${query}.`);
      return { lat: c.lat, lon: c.lon, label: `Postcode ${query}` };
    }

    const lower = query.toLowerCase();
    const exact = state.suburbCentroids.find((s) => String(s.suburb).toLowerCase() === lower);
    if (exact) return { lat: exact.lat, lon: exact.lon, label: `Suburb ${exact.suburb}` };

    const partial = state.suburbCentroids.find((s) => String(s.suburb).toLowerCase().includes(lower));
    if (partial) return { lat: partial.lat, lon: partial.lon, label: `Suburb ${partial.suburb}` };

    throw new Error(`Could not resolve location "${query}" to ${stateName} suburb/postcode.`);
  }

  function renderRows(rows) {
    tbodyEl.innerHTML = rows.map((r) => `
      <tr>
        <td>${esc(r.school_name)}</td>
        <td>${esc(r.sector)}</td>
        <td>${esc(r.suburb)}</td>
        <td>${esc(r.postcode)}</td>
        <td>${esc(r.distance_km)}</td>
        <td>${r.public_email ? `<a href="mailto:${esc(r.public_email)}">${esc(r.public_email)}</a>` : ""}</td>
        <td>${r.contact_form_url ? `<a href="${esc(r.contact_form_url)}" target="_blank" rel="noopener">Open</a>` : ""}</td>
        <td>${r.website_url ? `<a href="${esc(r.website_url)}" target="_blank" rel="noopener">Visit</a>` : ""}</td>
      </tr>
    `).join("");
  }

  function runSearch() {
    errEl.textContent = "";
    copyMetaEl.textContent = "";
    metaEl.textContent = "";
    if (flavourEl) { flavourEl.textContent = ""; flavourEl.classList.remove("visible"); }
    tableEl.hidden = true;
    copyBtn.disabled = true;
    state.lastRows = [];

    try {
      const center = resolveCenter(locationEl.value);
      const radiusKm = Number(radiusEl.value);
      const sector = sectorEl.value;
      const rows = state.schools
        .filter((s) => (sector === "all" ? true : String(s.sector).toLowerCase() === sector))
        .map((s) => ({ ...s, distance_km: haversineKm(center.lat, center.lon, s.lat, s.lon) }))
        .filter((s) => s.distance_km <= radiusKm)
        .sort((a, b) => a.distance_km - b.distance_km);

      state.lastRows = rows.map((r) => ({ ...r, distance_km: Number(r.distance_km.toFixed(2)) }));
      renderRows(state.lastRows);
      const sectorLabel = sector === "all" ? "all sectors" : sector;
      metaEl.textContent = `${state.lastRows.length} schools within ${radiusKm} km of ${center.label} (${sectorLabel})`;
      if (flavourEl && window.getRegionFlavour) {
        flavourEl.textContent = window.getRegionFlavour(center.label, stateCode);
        flavourEl.classList.add("visible");
      }
      tableEl.hidden = false;
      copyBtn.disabled = state.lastRows.filter((r) => (r.public_email || "").trim().length > 0).length === 0;
    } catch (err) {
      errEl.textContent = err.message || "Search failed.";
    }
  }

  async function copyEmails() {
    const emails = [...new Set(state.lastRows.map((r) => (r.public_email || "").trim()).filter((x) => x.length > 0))];
    if (!emails.length) {
      copyMetaEl.textContent = "No public emails found in current result set.";
      return;
    }
    try {
      await navigator.clipboard.writeText(emails.join("\n"));
      copyMetaEl.textContent = `Copied ${emails.length} unique email address(es).`;
    } catch (_e) {
      copyMetaEl.textContent = "Clipboard copy failed in this browser context.";
    }
  }

  async function init() {
    const base = `./data/${stateCode}`;
    const [schools, postcodes, suburbs] = await Promise.all([
      fetch(`${base}/schools.min.json`).then((r) => r.json()),
      fetch(`${base}/postcode_centroids.min.json`).then((r) => r.json()),
      fetch(`${base}/suburb_centroids.min.json`).then((r) => r.json()),
    ]);
    state.schools = schools;
    state.postcodeCentroids = postcodes;
    state.suburbCentroids = suburbs;
    // Inject the flavour box after the meta line
    flavourEl = document.createElement("div");
    flavourEl.className = "flavour";
    metaEl.insertAdjacentElement("afterend", flavourEl);

    metaEl.textContent = `Loaded ${schools.length} schools for ${stateName}.`;
    if (schools.length === 0) {
      errEl.textContent = `${stateName} dataset not loaded yet. This page is ready for future data.`;
    }
  }

  searchBtn.addEventListener("click", runSearch);
  copyBtn.addEventListener("click", copyEmails);
  locationEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch();
  });

  init().catch((err) => {
    errEl.textContent = `Failed to load data files: ${err.message || err}`;
  });
})();
