
const CHRISTMAS_URL =
  'https://opensheet.elk.sh/1FENGaj61vr2_6BWbqnYL7k6lkANGIdcBpRciPQU3SOI/ChristmasDinners';

let dinners = [];
let currentSort = 'price';
let visitorLocation = null;


/* =========================================================
   HELPERS
   ========================================================= */

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>'"]/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      })[c]
  );


const safeUrl = (value) => {
  if (!value) return '';

  try {
    const url = new URL(value, location.origin);

    return ['http:', 'https:'].includes(url.protocol)
      ? url.href
      : '';
  } catch {
    return '';
  }
};


/* Convert spreadsheet prices to numbers */

const price = (value) => {
  const number = Number(
    String(value || '').replace(/[^0-9.]/g, '')
  );

  return Number.isFinite(number) && number > 0
    ? number
    : Infinity;
};


/* Display prices with commas */

const formatPrice = (value) => {
  const number = price(value);

  return Number.isFinite(number)
    ? number.toLocaleString('en-US', {
        maximumFractionDigits: 2
      })
    : '—';
};


/* Format prices inside text fields */

const formatPriceText = (value) =>
  String(value ?? '').replace(
    /฿\s*([\d,]+(?:\.\d+)?)/g,
    (match, amount) => {
      const number = Number(amount.replace(/,/g, ''));

      return Number.isFinite(number)
        ? `฿${number.toLocaleString('en-US')}`
        : match;
    }
  );


/* =========================================================
   LOCATION / DISTANCE
   ========================================================= */

const radians = (degrees) =>
  degrees * Math.PI / 180;


function distanceKm(lat1, lon1, lat2, lon2) {

  const earthRadius = 6371;

  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) *
    Math.cos(radians(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return earthRadius * 2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


function pubDistance(row) {

  if (!visitorLocation) return Infinity;

  const lat = Number(row.lat);
  const lon = Number(row.lon);

  if (
    !String(row.lat ?? '').trim() ||
    !String(row.lon ?? '').trim() ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 || lat > 90 ||
    lon < -180 || lon > 180
  ) {
    return Infinity;
  }

  return distanceKm(
    visitorLocation.lat,
    visitorLocation.lon,
    lat,
    lon
  );
}


/* =========================================================
   SORTING
   ========================================================= */

function sortedRows() {

  return [...dinners].sort((a, b) => {

    if (currentSort === 'nearest' && visitorLocation) {
      return (
        pubDistance(a) - pubDistance(b) ||
        price(a.dinner_price) - price(b.dinner_price) ||
        String(a.name || '').localeCompare(
          String(b.name || '')
        )
      );
    }

    if (currentSort === 'name') {
      return String(a.name || '').localeCompare(
        String(b.name || '')
      );
    }

    return (
      price(a.dinner_price) - price(b.dinner_price) ||
      String(a.name || '').localeCompare(
        String(b.name || '')
      )
    );

  });
}


function updateSortButtons() {

  document.querySelectorAll('.sort-btn')
    .forEach((button) => {

      const active = button.dataset.sort === currentSort;

      button.classList.toggle('active', active);

      button.setAttribute(
        'aria-pressed',
        active ? 'true' : 'false'
      );

    });
}


/* =========================================================
   RENDER CARDS
   ========================================================= */

function render() {

  const grid =
    document.getElementById('christmas-grid');

  const rows = sortedRows();

  document.getElementById(
    'dinner-count'
  ).innerHTML = `
    <span class="count-circle">
      ${rows.length}
    </span>
    <span>
      ${rows.length === 1 ? 'pub' : 'pubs'} currently listed
    </span>
  `;


  if (!rows.length) {

    grid.innerHTML =
      '<div class="christmas-empty">No Christmas dinners are listed yet.</div>';

    return;
  }


  grid.innerHTML = rows
    .map((r, i) => {

      const image = safeUrl(r.menu_image);

      const cardNumber =
        String(i + 1).padStart(2, '0');

      const distance = pubDistance(r);

      const distanceLabel =
        visitorLocation && Number.isFinite(distance)
          ? `${distance.toFixed(1)} km away`
          : '';

      const extras = [
        r.kids_price
          ? `Kids ฿${esc(formatPrice(r.kids_price))}`
          : '',

        r.price_options
          ? esc(formatPriceText(r.price_options))
          : ''
      ]
        .filter(Boolean)
        .join(' · ');


      const preview = image
        ? `
          <div class="card-menu-preview">
            <img
              src="${esc(image)}"
              alt="Christmas menu preview for ${esc(r.name)}"
              loading="lazy"
            >
          </div>

          <div class="card-preview-label">
            Click to view full menu
          </div>
        `
        : '';


      return `
        <button
          class="dinner-card"
          type="button"
          data-index="${i}"
          aria-label="View Christmas menu for ${esc(r.name)}"
        >

          <div class="card-top">

            <div class="card-number">
              ${cardNumber}
            </div>

            <div class="card-area">
              ${esc(r.area)}
            </div>

            <h2 class="card-name">
              ${esc(r.name)}
            </h2>

            <div class="card-station">
              ${esc(
                r.nearest_station ||
                r.type ||
                ''
              )}
              ${
                distanceLabel
                  ? ` · ${esc(distanceLabel)}`
                  : ''
              }
            </div>

          </div>


          ${preview}


          <div class="card-body">

            <div class="card-price">
              ฿${esc(formatPrice(r.dinner_price))}
              <small>per person</small>
            </div>

            <p class="card-summary">
              ${esc(
                r.meal_summary ||
                'Christmas menu details available from the venue.'
              )}
            </p>

            ${
              extras
                ? `
                  <div class="card-meta">
                    ${extras}
                  </div>
                `
                : ''
            }

          </div>

        </button>
      `;

    })
    .join('');


  grid
    .querySelectorAll('.dinner-card')
    .forEach((card, i) => {

      card.addEventListener(
        'click',
        () => openMenu(rows[i])
      );

    });
}


/* =========================================================
   NEAREST SORT
   ========================================================= */

function sortNearest() {

  if (visitorLocation) {

    currentSort = 'nearest';
    updateSortButtons();
    render();

    return;
  }


  if (!navigator.geolocation) {

    alert(
      'Location is not supported by this browser. You can still sort by Cheapest or A–Z.'
    );

    return;
  }


  const nearestButton =
    document.querySelector('[data-sort="nearest"]');

  if (nearestButton) {
    nearestButton.disabled = true;
    nearestButton.textContent = 'Locating…';
  }


  navigator.geolocation.getCurrentPosition(

    (position) => {

      visitorLocation = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };

      currentSort = 'nearest';

      resetNearestButton();
      updateSortButtons();
      render();

    },

    (error) => {

      resetNearestButton();

      const message = error.code === 1
        ? 'Location permission was not granted. Please allow location access in your browser to sort by Nearest.'
        : 'Your location could not be determined. Please try again or use Cheapest or A–Z.';

      alert(message);

    },

    {
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 300000
    }

  );
}


function resetNearestButton() {

  const button =
    document.querySelector('[data-sort="nearest"]');

  if (button) {
    button.disabled = false;
    button.textContent = 'Nearest';
  }
}


/* =========================================================
   MENU POPUP
   ========================================================= */

function openMenu(r) {

  const box =
    document.getElementById('menu-lightbox');

  const wrap =
    document.getElementById('menu-image-wrap');

  const image =
    safeUrl(r.menu_image);


  wrap.classList.remove('is-zoomed');


  wrap.innerHTML = image
    ? `
      <div class="menu-image-stage">
        <img
          class="menu-image"
          src="${esc(image)}"
          alt="Christmas menu at ${esc(r.name)}"
          tabindex="0"
          role="button"
          aria-label="Zoom Christmas menu"
          aria-pressed="false"
        >
      </div>

      <div class="menu-zoom-hint">
        Click / tap menu to zoom
      </div>
    `
    : `
      <div class="menu-image-missing">
        Original menu visual coming soon.
      </div>
    `;


  document.getElementById(
    'menu-title'
  ).textContent =
    r.name || '';


  document.getElementById(
    'menu-meta'
  ).textContent = '';


  document.getElementById(
    'menu-booking'
  ).textContent = '';


  const site =
    safeUrl(r.link);


  document.getElementById(
    'menu-actions'
  ).innerHTML = site
    ? `
      <a
        class="primary"
        href="${esc(site)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Book / Website
      </a>
    `
    : '';


  /* =======================================================
     MENU IMAGE ZOOM
     ======================================================= */

  const menuImage =
    wrap.querySelector('.menu-image');

  const zoomHint =
    wrap.querySelector('.menu-zoom-hint');

  const stage =
    wrap.querySelector('.menu-image-stage');


  const toggleZoom = () => {

    if (!menuImage || !stage) return;

    const zoomed =
      wrap.classList.toggle('is-zoomed');

    menuImage.setAttribute(
      'aria-pressed',
      zoomed ? 'true' : 'false'
    );

    menuImage.setAttribute(
      'aria-label',
      zoomed
        ? 'Return Christmas menu to normal size'
        : 'Zoom Christmas menu'
    );

    if (zoomHint) {
      zoomHint.textContent =
        zoomed
          ? 'Click / tap menu to zoom out'
          : 'Click / tap menu to zoom';
    }


    if (zoomed) {

      requestAnimationFrame(() => {
        stage.scrollTop = 0;
        stage.scrollLeft = 0;
      });

    } else {

      stage.scrollTop = 0;
      stage.scrollLeft = 0;

    }
  };


  if (menuImage) {

    menuImage.addEventListener(
      'click',
      toggleZoom
    );


    menuImage.addEventListener(
      'keydown',
      (event) => {

        if (
          event.key === 'Enter' ||
          event.key === ' '
        ) {
          event.preventDefault();
          toggleZoom();
        }

      }
    );

  }


  box.classList.add('open');

  box.setAttribute(
    'aria-hidden',
    'false'
  );

  document.body.style.overflow =
    'hidden';

  document
    .getElementById('menu-close')
    .focus();
}


/* =========================================================
   CLOSE MENU
   ========================================================= */

function closeMenu() {

  const box =
    document.getElementById('menu-lightbox');

  const wrap =
    document.getElementById('menu-image-wrap');

  box.classList.remove('open');

  box.setAttribute(
    'aria-hidden',
    'true'
  );

  wrap.classList.remove('is-zoomed');

  document.body.style.overflow = '';
}


/* =========================================================
   LOAD DATA
   ========================================================= */

async function load() {

  try {

    const response =
      await fetch(CHRISTMAS_URL);

    if (!response.ok) {
      throw new Error(
        'Unable to load Christmas dinners'
      );
    }

    const data =
      await response.json();

    dinners = data.filter(
      (row) =>
        row.name &&
        row.dinner_price
    );

    render();

  } catch (error) {

    console.warn(error);

    document.getElementById(
      'dinner-count'
    ).textContent =
      'Christmas dinner guide';

    document.getElementById(
      'christmas-grid'
    ).innerHTML =
      '<div class="christmas-empty">Christmas dinners could not be loaded right now. Please try again shortly.</div>';
  }
}


/* =========================================================
   SORT BUTTONS
   ========================================================= */

document
  .querySelectorAll('.sort-btn')
  .forEach((button) => {

    button.addEventListener(
      'click',
      () => {

        const selectedSort =
          button.dataset.sort;

        if (selectedSort === 'nearest') {
          sortNearest();
          return;
        }

        currentSort = selectedSort;

        updateSortButtons();
        render();

      }
    );

  });

updateSortButtons();


/* =========================================================
   MENU EVENTS
   ========================================================= */

document
  .getElementById('menu-close')
  .addEventListener(
    'click',
    closeMenu
  );


document
  .getElementById('menu-lightbox')
  .addEventListener(
    'click',
    (event) => {

      if (
        event.target.id ===
        'menu-lightbox'
      ) {
        closeMenu();
      }

    }
  );


document.addEventListener(
  'keydown',
  (event) => {

    if (event.key === 'Escape') {
      closeMenu();
    }

  }
);


/* =========================================================
   TOP BAR
   ========================================================= */

window.addEventListener(
  'scroll',
  () => {

    document
      .getElementById('top-bar')
      ?.classList.toggle(
        'is-scrolled',
        window.scrollY > 30
      );

  },
  {
    passive: true
  }
);


/* =========================================================
   START
   ========================================================= */

load();
