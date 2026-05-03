
mapboxgl.accessToken = 'pk.eyJ1IjoicGl4ZWxib3hlciIsImEiOiJjang5em4wdTAweWFwM3hwNzVjM2I3NXp0In0.E-H_WpzjNZcTm7_LtXaRhA';

const SHEET_URL = "https://opensheet.elk.sh/1FENGaj61vr2_6BWbqnYL7k6lkANGIdcBpRciPQU3SOI/Sheet1";
const FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbwYNGNwFHCLN934thYjzdlFnoJS6zFIvF31EVluSNu2fTpUGVxBsHfCSvXloPCqrv7s/exec";
const SUBMIT_COOLDOWN_MS = 30000;

const INITIAL_VIEW = {
  center: [100.5018, 13.7563],
  zoom: 11.2
};

  const wisdoms = [
  "If you’ve crossed Sukhumvit for it, it better be a creamy one.",
  "That was an absolute creamer… if you know, you know.",
  "If the glass has bubbles on the side, questions must be asked.",
  "The first sip tells you everything.",
  "Some nights start with “just one creamy pint”… and somehow end on Soi Cowboy.",
  "Good things come to those who wait… especially in Bangkok traffic."
];

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m];
  });
}

function sanitizeURL(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
    return "";
  } catch {
    return "";
  }
}

function setRandomWisdom() {
  const el = document.getElementById("wisdom-text");
  if (!el) return;

  el.classList.add("fade-out");

  setTimeout(() => {
    const random = wisdoms[Math.floor(Math.random() * wisdoms.length)];
    el.textContent = random;
    el.classList.remove("fade-out");
  }, 400);
}
  
function trackEvent(name, params = {}) {
  try {
    if (typeof gtag === "function") {
      gtag('event', name, params);
    }
  } catch (err) {
    console.warn("Analytics tracking skipped:", err);
  }
}

function animateCount(id, endValue, prefix = "", duration = 1200) {
  const el = document.getElementById(id);
  if (!el) return;

  const startTime = performance.now();

  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(endValue * eased);

    el.textContent = `${prefix}${current}`;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = `${prefix}${endValue}`;
    }
  }

  requestAnimationFrame(update);
}

function scrollToMap() {
  const mapSection = document.getElementById("map-section");
  if (!mapSection) return;

  mapSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

  function highlightChartPub(pubName) {
      document.querySelectorAll('.bar-row').forEach(row => {
        row.classList.remove('is-highlighted');
      });

      const target = Array.from(document.querySelectorAll('.bar-row'))
        .find(row => row.dataset.pubName === pubName);

      if (target) {
        target.classList.add('is-highlighted');
      }
    }

function buildPopupHTML(pub, safeLink) {
  const mapsLink = (pub.lat && pub.lon)
    ? `https://www.google.com/maps?q=${pub.lat},${pub.lon}`
    : "";

  return `
  <div class="popup-card modern">

    <div class="popup-header">
      ${pub.type ? `<div class="popup-meta">${escapeHTML(pub.type)}</div>` : ""}
      <div class="popup-title-text">${escapeHTML(pub.name || "")}</div>
    </div>

    <div class="popup-body">

      ${pub.price ? `
        <div class="popup-row">
          <span class="popup-label">Guinness</span>
          <span class="popup-value">฿${escapeHTML(pub.price)}</span>
        </div>
      ` : `
        <div class="popup-row">
          <span class="popup-label">Guinness</span>
          <span class="popup-value">Under investigation</span>
        </div>
      `}

      ${pub.happy_hour_price && String(pub.happy_hour_price).toLowerCase() !== "n/a" ? `
        <div class="popup-row">
          <span class="popup-label">Happy Hour</span>
          <span class="popup-value popup-value-happy">฿${escapeHTML(pub.happy_hour_price)}</span>
        </div>
      ` : ""}

    </div>

    <div class="popup-actions">
      ${safeLink
        ? `<a href="${safeLink}" target="_blank" rel="noopener noreferrer" data-pub-link="${escapeHTML(pub.name || 'unknown')}">View Pub</a>`
        : ""}

      ${(pub.lat && pub.lon)
        ? `<a href="https://www.google.com/maps?q=${pub.lat},${pub.lon}" target="_blank" rel="noopener noreferrer">Google Maps</a>`
        : ""}
    </div>

  </div>
`;
}

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/pixelboxer/cmo3us6sr000t01qz331vbdbh',
  center: INITIAL_VIEW.center,
  zoom: INITIAL_VIEW.zoom,
  projection: 'mercator'
});

if (window.innerWidth <= 768) {
  map.dragPan.disable();
  map.touchZoomRotate.disableRotation(); // keep this

  const unlockBtn = document.getElementById("map-unlock-btn");
  const hint = document.querySelector(".map-mobile-hint");

  if (unlockBtn) {
    unlockBtn.addEventListener("click", () => {
      map.dragPan.enable();
      map.touchZoomRotate.enable(); // 👈 ADD THIS BACK

      unlockBtn.style.display = "none";

      if (hint) {
        hint.style.opacity = 0;
        setTimeout(() => {
          hint.style.display = "none";
        }, 400);
      }
    });
  }
}
  
  let hoveredId = null;
  let userMarker = null;
  let activePopup = null;

map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

class ResetControl {
  onAdd(map) {
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';

    const button = document.createElement('button');
    button.className = 'mapboxgl-ctrl-icon';
    button.type = 'button';
    button.title = 'Reset view';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 10.5L12 3l9 7.5"></path>
        <path d="M5 10v10h14V10"></path>
      </svg>
    `;

    button.onclick = () => {
  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }

  map.easeTo({
    center: INITIAL_VIEW.center,
    zoom: INITIAL_VIEW.zoom,
    duration: 800
  });
};

    this.container.appendChild(button);
    return this.container;
  }

  onRemove() {
    this.container.parentNode.removeChild(this.container);
    this.map = undefined;
  }
}

map.addControl(new ResetControl(), 'top-right');

fetch(SHEET_URL)
  .then(res => {
    if (!res.ok) throw new Error("Failed to load pub data");
    return res.json();
  })
  .then(pubs => {

    function filterByArea(area, pubs) {
      if (area === "all") return pubs;

      return pubs.filter(p => p.area && p.area.trim() === area);
    }

    const bounds = new mapboxgl.LngLatBounds();
    let validCount = 0;

    function zoomToPub(pubName, allPubs) {
      const targetPub = allPubs.find(p => p.name === pubName && p.lat && p.lon);
      if (!targetPub) return;

      const lat = parseFloat(targetPub.lat);
      const lon = parseFloat(targetPub.lon);
      if (isNaN(lat) || isNaN(lon)) return;

      const safeLink = sanitizeURL(targetPub.link);
      const html = buildPopupHTML(targetPub, safeLink);

      scrollToMap();

      setTimeout(() => {
        map.easeTo({
          center: [lon, lat],
          zoom: 15,
          duration: 900
        });

       setTimeout(() => {
  if (activePopup) {
    activePopup.remove();
  }

  activePopup = new mapboxgl.Popup({ offset: 10 });

  activePopup
    .setLngLat([lon, lat])
    .setHTML(html)
    .addTo(map);
}, 700);
      }, 150);
    }

    function zoomToArea(filteredPubs) {
  const areaBounds = new mapboxgl.LngLatBounds();
  let count = 0;

  filteredPubs.forEach(p => {
    if (!p.lat || !p.lon) return;

    const lat = parseFloat(p.lat);
    const lon = parseFloat(p.lon);

    if (isNaN(lat) || isNaN(lon)) return;

    areaBounds.extend([lon, lat]);
    count++;
  });

  if (count > 0) {
    map.fitBounds(areaBounds, {
      padding: 90,
      maxZoom: 15,
      duration: 800
    });
  }
}


const nearbyBtn = document.getElementById("find-nearby-btn");
const radiusSelect = document.getElementById("radius-select");

if (nearbyBtn) {
  nearbyBtn.addEventListener("click", () => {
    const btn = nearbyBtn;
    btn.textContent = "Finding best pint…";
    btn.disabled = true;

    const radiusValue = radiusSelect ? radiusSelect.value : "3";

    findNearestCheapest(pubs, zoomToPub, radiusValue);

    setTimeout(() => {
      btn.textContent = "Find nearby pubs";
      btn.disabled = false;
    }, 3000);
  });
}

    const chart = document.getElementById("price-chart");
    const updatedEl = document.getElementById("last-updated");
    const happyList = document.getElementById("happy-list");

    chart.innerHTML = "";
    happyList.innerHTML = "";

    const dates = pubs
      .map(p => p.last_updated)
      .filter(Boolean)
      .map(d => new Date(d))
      .filter(d => !isNaN(d));

    if (updatedEl) {
      if (dates.length > 0) {
        const latest = new Date(Math.max(...dates));
        updatedEl.textContent =
          "Prices last updated: " +
          latest.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
      } else {
        updatedEl.textContent = "Prices last updated: Recently";
      }
    }

  const pricedPubs = pubs
  .filter(p => p.price && !isNaN(parseFloat(p.price)))
  .map(p => ({
    name: p.name,
    area: p.area,
    lat: p.lat,
    lon: p.lon,
    price: parseFloat(p.price),
    last_updated: p.last_updated
  }))
  .sort((a, b) => a.price - b.price);

    function renderAll(pubs) {

  const chart = document.getElementById("price-chart");
  const happyList = document.getElementById("happy-list");

  chart.innerHTML = "";
  happyList.innerHTML = "";

  const pricedPubs = pubs
    .filter(p => p.price && !isNaN(parseFloat(p.price)))
    .map(p => ({
      name: p.name,
      area: p.area,
      lat: p.lat,
      lon: p.lon,
      price: parseFloat(p.price),
      last_updated: p.last_updated
    }))
    .sort((a, b) => a.price - b.price);

  if (pricedPubs.length === 0) return;

  const max = Math.max(...pricedPubs.map(p => p.price));
  const min = Math.min(...pricedPubs.map(p => p.price));
  const gap = max - min;
  const avg = Math.round(
    pricedPubs.reduce((sum, p) => sum + p.price, 0) / pricedPubs.length
  );

  animateCount("stat-pubs", pricedPubs.length, "", 1000);
  animateCount("stat-cheapest", min, "฿", 1200);
  animateCount("stat-expensive", max, "฿", 1400);
  animateCount("stat-gap", gap, "฿", 1600);
  animateCount("stat-average", avg, "฿", 1800);

  chart.innerHTML += `
    <div class="chart-key">
      Longer bar = better value — <span class="highlight">less baht, more Guinness</span>
    </div>
  `;

  pricedPubs.forEach((pub, i) => {
    const width = max === min ? 100 : ((max - pub.price) / (max - min)) * 100;

    const row = document.createElement("div");
    row.className = "bar-row";
    row.dataset.pubName = pub.name;

    row.innerHTML = `
      <div class="bar-label clickable" data-pub="${escapeHTML(pub.name)}">
        ${escapeHTML(pub.name)}
        ${pub.area ? `<span class="bar-area"> ${escapeHTML(pub.area)}</span>` : ""}
      </div>

      <div class="bar-bottom">
        <div class="bar-wrap">
          <div class="bar" style="width:0%" data-width="${width}%"></div>
        </div>
        <div class="bar-price">฿${pub.price}</div>
      </div>
    `;

    chart.appendChild(row);

    setTimeout(() => {
      const mainBar = row.querySelector(".bar");
      if (mainBar) mainBar.style.width = mainBar.dataset.width;
    }, 150 + i * 80);
  });

  document.querySelectorAll('.bar-label.clickable').forEach(el => {
    el.addEventListener('click', () => {
      const name = el.dataset.pub;
      highlightChartPub(name);
      zoomToPub(name, pubs);
    });
  });
}

    renderAll(pubs);

      const areaStrip = document.getElementById("area-filter-strip");

if (areaStrip) {
  const areaCounts = {};

  pricedPubs.forEach(pub => {
    if (!pub.area) return;

    const area = pub.area.trim();
    if (!area) return;

    areaCounts[area] = (areaCounts[area] || 0) + 1;
  });

  const topAreas = Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  topAreas.forEach(([area, count]) => {
    const btn = document.createElement("button");
    btn.className = "area-pill";
    btn.dataset.area = area;
    btn.textContent = `${area} ${count}`;

    areaStrip.appendChild(btn);
  });

  areaStrip.addEventListener("click", (e) => {
  const btn = e.target.closest(".area-pill");
  if (!btn) return;

  const selectedArea = btn.dataset.area;

  // update active UI
  areaStrip.querySelectorAll(".area-pill").forEach(p => p.classList.remove("active"));
  btn.classList.add("active");

  // filter data
  const filtered = selectedArea === "all"
    ? pubs
    : pubs.filter(p => p.area && p.area.trim() === selectedArea);


  // zoom map
  renderAll(filtered);
zoomToArea(filtered);
});
  
}

      const didYouKnowEl = document.getElementById("did-you-know-text");
      if (didYouKnowEl) {
        const underDeal = Math.max(avg - 40, min);
        const over400Count = pricedPubs.filter(p => p.price >= 400).length;

        const facts = [
          `The average pint in Bangkok is <strong>฿${avg}</strong>… so anything under ฿${underDeal} is a proper deal`,
          `The price gap between the cheapest and most expensive pint is <strong>฿${gap}</strong>.`,
          `You can still find a pint for <strong>฿${min}</strong> if you know where to look.`,
          over400Count > 0
            ? `<strong>${over400Count}</strong> pub${over400Count === 1 ? "" : "s"} now charge ฿400 or more for a pint 👀`
            : `No pub has crossed ฿400 yet… which feels like a small win.`
        ];

        let factIndex = 0;
        didYouKnowEl.innerHTML = facts[factIndex];

        setInterval(() => {
          didYouKnowEl.style.opacity = 0;
          setTimeout(() => {
            factIndex = (factIndex + 1) % facts.length;
            didYouKnowEl.innerHTML = facts[factIndex];
            didYouKnowEl.style.opacity = 1;
          }, 400);
        }, 5000);
      }

      const cheapestPub = pricedPubs[0];
      const mostExpensivePub = pricedPubs[pricedPubs.length - 1];

      const cheapestCard = document.getElementById("stat-cheapest")?.closest(".stat-card");
      const expensiveCard = document.getElementById("stat-expensive")?.closest(".stat-card");

      if (cheapestCard && cheapestPub) {
        cheapestCard.classList.add("is-clickable");

        cheapestCard.addEventListener("click", () => {
          highlightChartPub(cheapestPub.name);
          zoomToPub(cheapestPub.name, pubs);
          trackEvent("stat_cheapest_click", { pub_name: cheapestPub.name });
        });
      }

      if (expensiveCard && mostExpensivePub) {
        expensiveCard.classList.add("is-clickable");

        expensiveCard.addEventListener("click", () => {
          highlightChartPub(mostExpensivePub.name);
          zoomToPub(mostExpensivePub.name, pubs);
          trackEvent("stat_most_expensive_click", { pub_name: mostExpensivePub.name });
        });
      }

      chart.innerHTML += `
        <div class="chart-key">
  Longer bar = better value — <span class="highlight">less baht, more Guinness</span>
</div>
      `;

      let tooltipTimeout;  // ✅ GLOBAL (shared across all rows)

      pricedPubs.forEach((pub, i) => {
        let width;
        if (max === min) {
          width = 100;
        } else {
          width = ((max - pub.price) / (max - min)) * 100;
        }

        const row = document.createElement("div");
        row.className = "bar-row";
        row.dataset.pubName = pub.name;


       function formatDate(dateStr) {
  if (!dateStr) return "Unknown";

  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

      row.innerHTML = `
  <div class="bar-label clickable" data-pub="${escapeHTML(pub.name)}">
    ${escapeHTML(pub.name)}
    ${pub.area ? `<span class="bar-area"> ${escapeHTML(pub.area)}</span>` : ""}
  </div>

  <div class="bar-bottom">
    <div class="bar-wrap">
      <div class="bar"
           style="width:0%"
           data-width="${width}%"
           title="Verified ${formatDate(pub.last_updated)}">
      </div>
    </div>
    <div class="bar-price"
         title="Verified ${formatDate(pub.last_updated)}">
      ฿${pub.price}
    </div>
  </div>
`;
        chart.appendChild(row);
        
const priceEl = row.querySelector(".bar-price");

priceEl.addEventListener("click", (e) => {
  const tooltip = document.getElementById("tooltip");

  clearTimeout(tooltipTimeout);

  const x = e.touches ? e.touches[0].clientX : e.clientX;
  const y = e.touches ? e.touches[0].clientY : e.clientY;

  tooltip.textContent = `Verified ${formatDate(pub.last_updated)}`;
  tooltip.style.opacity = "1";

  const maxX = window.innerWidth - 120;
  const maxY = window.innerHeight - 40;

  tooltip.style.left = Math.min(x + 10, maxX) + "px";
  tooltip.style.top = Math.min(Math.max(y - 40, 10), maxY) + "px";

  tooltipTimeout = setTimeout(() => {
    tooltip.style.opacity = "0";
  }, 1000);
});

setTimeout(() => {
  const mainBar = row.querySelector(".bar");
  if (mainBar) mainBar.style.width = mainBar.dataset.width;
}, 150 + i * 80);
      });

      document.querySelectorAll('.bar-label.clickable').forEach(el => {
        el.addEventListener('click', () => {
          const name = el.dataset.pub;
          highlightChartPub(name);
          zoomToPub(name, pubs);
          trackEvent("chart_pub_click", { pub_name: name });
        });
      });

    const toggleChartBtn = document.getElementById("toggle-chart-btn");

if (window.innerWidth <= 768 && toggleChartBtn) {
  chart.classList.add("is-collapsed");

  toggleChartBtn.textContent = "See full Guinness ranking";

  toggleChartBtn.addEventListener("click", () => {
    chart.classList.toggle("is-collapsed");

    toggleChartBtn.textContent = chart.classList.contains("is-collapsed")
      ? "See full Guinness ranking"
      : "Show fewer prices";
  });
}

    const cheapList = document.getElementById("cheap-list");

    if (cheapList && pricedPubs.length > 0) {
      const mostExpensivePrice = pricedPubs[pricedPubs.length - 1].price;

const medals = ["🥇", "🥈", "🥉"];

let lastPrice = null;
let medalIndex = -1;

const cheapestFive = pricedPubs.slice(0, 5).map(pub => {
  if (pub.price !== lastPrice) {
    medalIndex++;
    lastPrice = pub.price;
  }

  return {
    name: pub.name,
    area: pub.area,
    lat: pub.lat,
    lon: pub.lon,
    price: pub.price,
    saving: mostExpensivePrice - pub.price,
    savingPct: Math.round(((mostExpensivePrice - pub.price) / mostExpensivePrice) * 100),
    medal: medals[medalIndex] || `${medalIndex + 1}.`
  };
});

      cheapList.innerHTML = "";

      cheapestFive.forEach((pub, i) => {
        const rank = pub.medal;

        const row = document.createElement("div");
        row.className = "happy-item";
        row.style.animationDelay = `${150 + i * 120}ms`;

        row.innerHTML = `
          <div class="happy-name">
  <span class="happy-rank">${rank}</span>

  <div class="pub-info">
    <div class="pub-name">${escapeHTML(pub.name)}</div>
    <div class="pub-meta">
      ${pub.area ? escapeHTML(pub.area) : ""}
      ${pub.area && pub.lat && pub.lon ? " • " : ""}
      ${pub.lat && pub.lon ? `
        <a href="https://www.google.com/maps?q=${pub.lat},${pub.lon}" target="_blank" rel="noopener noreferrer">View map</a>
      ` : ""}
    </div>
  </div>
</div>
         <div class="happy-prices stacked compact">
  <div class="price-line">
  <span class="label">Price:</span>
    <span class="value gold">฿${pub.price}</span>
  </div>

  <div class="price-line saving">
 <span class="value green cheap-save-line">
  Save ฿${pub.saving} (${pub.savingPct}%) vs ฿${mostExpensivePrice}
</span>
</div>
</div>
        `;

        cheapList.appendChild(row);
      });
    }

    const expensiveList = document.getElementById("expensive-list");

    if (expensiveList && pricedPubs.length > 0) {
      const avgPrice = Math.round(
        pricedPubs.reduce((sum, p) => sum + p.price, 0) / pricedPubs.length
      );

     const mostExpensiveFive = [...pricedPubs]
  .sort((a, b) => b.price - a.price)
  .slice(0, 5)
  .map(pub => ({
    name: pub.name,
    area: pub.area,
    lat: pub.lat,
    lon: pub.lon,
    price: pub.price
  }));

      expensiveList.innerHTML = "";

      mostExpensiveFive.forEach((pub, i) => {
        const diff = pub.price - avgPrice;

        const row = document.createElement("div");
        row.className = "happy-item";
        row.style.animationDelay = `${150 + i * 120}ms`;

        row.innerHTML = `
        <div class="happy-name">
  <div class="pub-info">
    <div class="pub-name">${escapeHTML(pub.name)}</div>
    <div class="pub-meta">
      ${pub.area ? escapeHTML(pub.area) : ""}
      ${pub.area && pub.lat && pub.lon ? " • " : ""}
      ${pub.lat && pub.lon ? `
        <a href="https://www.google.com/maps?q=${pub.lat},${pub.lon}" target="_blank" rel="noopener noreferrer">View map</a>
      ` : ""}
    </div>
  </div>
</div>

          <div class="happy-prices stacked compact">
  <div class="price-line">
  <span class="label">Price:</span>
    <span class="value gold">฿${pub.price}</span>
  </div>

  <div class="price-line saving">
  <span class="value expensive-line">
    +฿${diff} above average
  </span>
</div>
</div>
        `;

        expensiveList.appendChild(row);
      });
    }

   const happyPubs = pubs
  .filter(p =>
    p.happy_hour_price &&
    String(p.happy_hour_price).toLowerCase() !== "n/a" &&
    p.price &&
    !isNaN(parseFloat(p.price))
  )
  .map((p, i) => {
    const hh = parseFloat(p.happy_hour_price);
    const full = parseFloat(p.price);
    const savingPct = full > 0 ? Math.round(((full - hh) / full) * 100) : 0;

    return {
      name: p.name,
      area: p.area,   // 👈 ADD
      lat: p.lat,     // 👈 ADD
      lon: p.lon,     // 👈 ADD
      happyPrice: hh,
      fullPrice: full,
      savingPct: savingPct
    };
  })
      .filter(p => !isNaN(p.happyPrice) && !isNaN(p.fullPrice))
      .sort((a, b) => a.happyPrice - b.happyPrice)
      .slice(0, 5);

 const medals = ["🥇", "🥈", "🥉"];

let lastHappyPrice = null;
let happyMedalIndex = -1;

happyPubs.forEach((pub, i) => {
  if (pub.happyPrice !== lastHappyPrice) {
    happyMedalIndex++;
    lastHappyPrice = pub.happyPrice;
  }

  const rank = medals[happyMedalIndex] || `${happyMedalIndex + 1}.`;
  const savingAmount = pub.fullPrice - pub.happyPrice;

      const row = document.createElement("div");
      row.className = "happy-item";
      row.style.animationDelay = `${150 + i * 120}ms`;

      row.innerHTML = `
  <div class="happy-name">
    <span class="happy-rank">${rank}</span>

    <div class="pub-info">
      <div class="pub-name">${escapeHTML(pub.name)}</div>
      <div class="pub-meta">
        ${pub.area ? escapeHTML(pub.area) : ""}
${pub.area && pub.lat && pub.lon ? " • " : ""}
${pub.lat && pub.lon ? `
  <a href="https://www.google.com/maps?q=${pub.lat},${pub.lon}" target="_blank" rel="noopener noreferrer">View map</a>
` : ""}
      </div>
    </div>
  </div>

  <div class="happy-prices stacked compact">
    <div class="price-line">
      <span class="label">Happy Hour:</span>
      <span class="value gold">฿${pub.happyPrice}</span>
    </div>

    <div class="price-line saving">
<span class="value green">
  Save ฿${savingAmount} (${pub.savingPct}%)
</span>
</div>
  </div>
`;
  
  happyList.appendChild(row);
    });

    const geojson = {
      type: "FeatureCollection",
      features: pubs
        .filter(p => p.lat && p.lon)
        .map((p, i) => {
          const lat = parseFloat(p.lat);
          const lon = parseFloat(p.lon);

          if (isNaN(lat) || isNaN(lon)) return null;

          validCount++;
          bounds.extend([lon, lat]);

          return {
  type: "Feature",
  id: `${p.name}-${i}`, // unique id
  geometry: {
    type: "Point",
    coordinates: [lon, lat]
  },
  properties: p
};
        })
        .filter(Boolean)
    };

    const addPubLayer = () => {
      if (map.getSource('pubs')) return;

      map.addSource('pubs', {
        type: 'geojson',
        data: geojson
      });

      map.addLayer({
  id: 'pubs-layer',
  type: 'symbol',
  source: 'pubs',
  layout: {
    'icon-image': 'pint-icon',
    'icon-size': 0.8,
    'icon-anchor': 'bottom',
    'icon-offset': [0, 6],
    'icon-allow-overlap': true
  },
  paint: {
    'icon-opacity': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      1,
      0.7
    ]
  }
});

      map.on('mousemove', 'pubs-layer', (e) => {
  map.getCanvas().style.cursor = 'pointer';

  if (e.features.length > 0) {
    if (hoveredId !== null) {
      map.setFeatureState(
        { source: 'pubs', id: hoveredId },
        { hover: false }
      );
    }

    hoveredId = e.features[0].id;

    map.setFeatureState(
      { source: 'pubs', id: hoveredId },
      { hover: true }
    );
  }
});

map.on('mouseleave', 'pubs-layer', () => {
  map.getCanvas().style.cursor = '';

  if (hoveredId !== null) {
    map.setFeatureState(
      { source: 'pubs', id: hoveredId },
      { hover: false }
    );
  }

  hoveredId = null;
});

   map.on('click', 'pubs-layer', (e) => {
  const feature = e.features && e.features[0];
  if (!feature) return;

  const p = feature.properties;
  const safeLink = sanitizeURL(p.link);
  const html = buildPopupHTML(p, safeLink);

  const coordinates = feature.geometry.coordinates.slice(); // ✅ now works

if (activePopup) {
  activePopup.remove();
  activePopup = null;
}

activePopup = new mapboxgl.Popup({  offset: window.innerWidth <= 768 ? 28 : 18,
  closeButton: true,
  closeOnClick: true,
  maxWidth: "240px"
});

if (window.innerWidth <= 768) {
  map.easeTo({
    center: coordinates,
    zoom: Math.max(map.getZoom(), 14),
    duration: 350,
    padding: {
      top: 100,
      bottom: 220,
      left: 40,
      right: 40
    }
  });

  setTimeout(() => {
    activePopup
      .setLngLat(coordinates)
      .setHTML(html)
      .addTo(map);
  }, 360);

} else {
  activePopup
    .setLngLat(coordinates)
    .setHTML(html)
    .addTo(map);
}

  trackEvent("popup_open", {
    pub_name: p.name || "unknown"
  });
});

      if (validCount > 1) {
        map.fitBounds(bounds, { padding: 80, maxZoom: 15 });
      }
    };

    const loadIcon = () => {
      if (map.hasImage('pint-icon')) {
        addPubLayer();
        return;
      }

      map.loadImage('/pint-glass1.png', (err, img) => {
        if (err || !img) {
          console.error("Icon failed", err);
          return;
        }

        if (!map.hasImage('pint-icon')) {
          map.addImage('pint-icon', img);
        }

        addPubLayer();
      });
    };

if (map.loaded()) {
  loadIcon();
} else {
  map.once('load', loadIcon);
}
    }
  })
  .catch(err => {
    console.error(err);
    const chart = document.getElementById("price-chart");
    if (chart) {
      chart.innerHTML = `<div class="chart-error">Could not load pub data right now.</div>`;
    }
  });

document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-pub-link]");
  if (!link) return;

  trackEvent("pub_link_click", {
    pub_name: link.getAttribute("data-pub-link") || "unknown"
  });
});

function canSubmitAgain() {
  const lastSubmit = localStorage.getItem("last_pub_submit");
  if (!lastSubmit) return true;
  return (Date.now() - Number(lastSubmit)) > SUBMIT_COOLDOWN_MS;
}

function markSubmitTime() {
  localStorage.setItem("last_pub_submit", String(Date.now()));
}

function submitAnswer() {
  const input = document.getElementById("response");
  const hp = document.getElementById("website");
  const btn = document.getElementById("submit-btn");

  if (hp.value !== "") return;

  const val = input.value.trim();

  if (!val) {
    alert("Please enter a suggestion!");
    trackEvent("pub_submit_invalid", { reason: "empty" });
    return;
  }

  if (val.length < 3) {
    alert("Please enter a slightly longer suggestion.");
    trackEvent("pub_submit_invalid", { reason: "too_short" });
    return;
  }

  if (!canSubmitAgain()) {
    alert("Please wait a little before submitting again.");
    trackEvent("pub_submit_invalid", { reason: "cooldown" });
    return;
  }

  btn.disabled = true;

  fetch(FORM_ENDPOINT, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({ suggestion: val })
  })
  .then(() => {
    alert("Go raibh maith agat!");
    input.value = "";
    markSubmitTime();
    trackEvent("pub_submit", { form_name: "suggest_pub" });
  })
  .catch(() => {
    alert("Something went wrong. Please try again.");
    trackEvent("pub_submit_error", { form_name: "suggest_pub" });
  })
  .finally(() => {
    setTimeout(() => {
      btn.disabled = false;
    }, 1500);
  });
}

window.addEventListener("scroll", () => {
  const topBar = document.getElementById("top-bar");
  if (!topBar) return;

  if (window.scrollY > 30) {
    topBar.classList.add("is-scrolled");
  } else {
    topBar.classList.remove("is-scrolled");
  }
});

function typeWriter(el, text, speed = 35) {
  let i = 0;
  el.textContent = "";

  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    } else {
      // 👇 start cursor AFTER typing finishes
      el.classList.add("cursor-active");
    }
  }

  type();
}
 window.addEventListener("load", () => {
  const el = document.getElementById("question");
  if (!el) return;

  const text = el.getAttribute("data-text");

  // 👉 Disable animation on mobile
  if (window.innerWidth <= 768) {
    el.textContent = text;
    return;
  }

  setTimeout(() => {
    typeWriter(el, text, 28);
  }, 400);
});

  function findNearestCheapest(pubs, zoomToPub, radiusValue = "3") {
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(position => {
    const userLat = position.coords.latitude;
    const userLon = position.coords.longitude;
    if (userMarker) {
  userMarker.remove();
}

userMarker = new mapboxgl.Marker({ color: "#ffffff" })
  .setLngLat([userLon, userLat])
  .addTo(map);

processNearest(userLat, userLon, pubs, zoomToPub, radiusValue);
  }, () => {
    alert("Location access was denied. Please allow location access in your browser settings, or search the map manually.");
  });
}

  function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) *
    Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

 function processNearest(userLat, userLon, pubs, zoomToPub, radiusValue) {

  const allWithDistance = pubs
    .filter(p => p.lat && p.lon && p.price)
    .map(p => ({
      ...p,
      distance: getDistance(userLat, userLon, parseFloat(p.lat), parseFloat(p.lon))
    }));

let candidates;

if (radiusValue === "all") {
  candidates = allWithDistance;
} else {
  const radiusKm = Number(radiusValue);
  const nearby = allWithDistance.filter(p => p.distance <= radiusKm);

  candidates = nearby.length > 0 ? nearby : allWithDistance;
}
  const isInBangkok = allWithDistance.some(p => p.distance < 20);

  candidates.sort((a, b) => a.price - b.price);
  const best = candidates[0];

  const didYouKnowEl = document.getElementById("did-you-know-text");

  if (didYouKnowEl) {
    if (!isInBangkok) {
      didYouKnowEl.innerHTML = `
        Looks like you're outside Bangkok — showing the best-value option available.<br>
        Best option: <strong>${best.name}</strong> — ฿${best.price} (${best.distance.toFixed(1)}km away)
      `;
    } else {
      const label = radiusValue === "all"
  ? "Best pint in Bangkok"
  : `Best pint within ${radiusValue}km`;

didYouKnowEl.innerHTML = `
  ${label}: <strong>${best.name}</strong> — ฿${best.price} (${best.distance.toFixed(1)}km away)
`;
    }
  }

  zoomToPub(best.name, pubs);
highlightChartPub(best.name);
   const row = Array.from(document.querySelectorAll('.bar-row'))
  .find(r => r.dataset.pubName === best.name);
if (row) {
  row.scrollIntoView({ behavior: "smooth", block: "center" });
}
 }

  setRandomWisdom();
setInterval(setRandomWisdom, 6000);

document.addEventListener("click", (e) => {
  if (!e.target.closest(".bar-price")) {
    const tooltip = document.getElementById("tooltip");
    if (tooltip) tooltip.style.opacity = "0";
  }
});

    const contactLink = document.getElementById("contact-link");
    if (contactLink) {
      const parts = ["pintsofbangkok", "gmail", "com"];
      const email = parts[0] + "@" + parts[1] + "." + parts[2];

      contactLink.href = `mailto:${email}?subject=Guinness Bangkok Update`;
    }

document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) {
    submitBtn.addEventListener("click", submitAnswer);
  }
});
