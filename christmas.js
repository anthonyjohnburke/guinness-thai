const CHRISTMAS_URL =
  'https://opensheet.elk.sh/1FENGaj61vr2_6BWbqnYL7k6lkANGIdcBpRciPQU3SOI/ChristmasDinners';

let dinners = [];
let currentSort = 'area';


/* =========================================================
   HELPERS
   ========================================================= */

const esc = s =>
  String(s ?? '').replace(
    /[&<>'"]/g,
    c =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      })[c]
  );


const safeUrl = value => {
  if (!value) return '';

  try {
    const u = new URL(value, location.origin);

    return ['http:', 'https:'].includes(u.protocol)
      ? u.href
      : '';
  } catch {
    return '';
  }
};


const price = n => {
  const v = Number(
    String(n || '').replace(/[^0-9.]/g, '')
  );

  return Number.isFinite(v) && v > 0
    ? v
    : Infinity;
};


/* =========================================================
   SORTING
   ========================================================= */

function sortedRows() {

  return [...dinners].sort((a, b) => {

    if (currentSort === 'price') {

      return (
        price(a.dinner_price) - price(b.dinner_price) ||
        String(a.area).localeCompare(String(b.area))
      );

    }

    return (
      String(a.area || '').localeCompare(String(b.area || '')) ||
      price(a.dinner_price) - price(b.dinner_price) ||
      String(a.name).localeCompare(String(b.name))
    );

  });

}


/* =========================================================
   RENDER DINNER CARDS
   ========================================================= */

function render() {

  const grid =
    document.getElementById('christmas-grid');

  const rows =
    sortedRows();


  document.getElementById('dinner-count').textContent =
    `${rows.length} ${rows.length === 1 ? 'pub' : 'pubs'} currently listed`;


  if (!rows.length) {

    grid.innerHTML =
      '<div class="christmas-empty">No Christmas dinners are listed yet.</div>';

    return;

  }


  grid.innerHTML = rows.map((r, i) => {

    const extras = [
      r.kids_price
        ? `Kids ฿${esc(r.kids_price)}`
        : '',

      r.price_options
        ? esc(r.price_options)
        : ''
    ]
      .filter(Boolean)
      .join(' · ');


    return `
      <button
        class="dinner-card"
        type="button"
        data-index="${i}"
        aria-label="View Christmas menu for ${esc(r.name)}"
      >

        <div class="card-top">

          <div class="card-area">
            ${esc(r.area)}
          </div>

          <h2 class="card-name">
            ${esc(r.name)}
          </h2>

          <div class="card-station">
            ${esc(r.nearest_station || r.type || '')}
          </div>

        </div>


        <div class="card-body">

          <div class="card-price">
            ฿${esc(r.dinner_price || '—')}
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
              ? `<div class="card-meta">${extras}</div>`
              : ''
          }

          <span class="card-view">
            View menu
          </span>

        </div>

      </button>
    `;

  }).join('');


  [...grid.querySelectorAll('.dinner-card')]
    .forEach((card, i) => {

      card.addEventListener(
        'click',
        () => openMenu(rows[i])
      );

    });

}


/* =========================================================
   OPEN MENU POPUP
   ========================================================= */

function openMenu(r) {

  const box =
    document.getElementById('menu-lightbox');

  const wrap =
    document.getElementById('menu-image-wrap');

  const image =
    safeUrl(r.menu_image);


  wrap.innerHTML = image
    ? `
      <img
        class="menu-image"
        src="${esc(image)}"
        alt="Christmas menu at ${esc(r.name)}"
      >
    `
    : `
      <div class="menu-image-missing">
        Original menu visual coming soon.
      </div>
    `;


  document.getElementById('menu-title').textContent =
    r.name || '';


  document.getElementById('menu-meta').textContent = [

    r.area,

    r.dinner_price
      ? `฿${r.dinner_price}`
      : '',

    String(r.christmas_day).toLowerCase() === 'confirmed'
      ? 'Christmas Day confirmed'
      : 'Christmas Day to confirm'

  ]
    .filter(Boolean)
    .join(' · ');


  document.getElementById('menu-booking').textContent =
    r.booking || '';


  const map =
    safeUrl(r.google_maps_link);

  const site =
    safeUrl(r.link);


  document.getElementById('menu-actions').innerHTML = `

    ${
      map
        ? `
          <a
            class="primary"
            href="${esc(map)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Maps
          </a>
        `
        : ''
    }

    ${
      site
        ? `
          <a
            class="secondary"
            href="${esc(site)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Book / Website
          </a>
        `
        : ''
    }

  `;


  box.classList.add('open');
  box.setAttribute('aria-hidden', 'false');

  document.body.style.overflow =
    'hidden';

  document.getElementById('menu-close').focus();

}


/* =========================================================
   CLOSE MENU POPUP
   ========================================================= */

function closeMenu() {

  const box =
    document.getElementById('menu-lightbox');

  box.classList.remove('open');

  box.setAttribute(
    'aria-hidden',
    'true'
  );

  document.body.style.overflow = '';

}


/* =========================================================
   LOAD GOOGLE SHEET DATA
   ========================================================= */

async function load() {

  try {

    const res =
      await fetch(CHRISTMAS_URL);


    if (!res.ok) {

      throw new Error(
        'Unable to load Christmas dinners'
      );

    }


    dinners = (await res.json())
      .filter(
        r =>
          r.name &&
          r.dinner_price
      );


    render();


  } catch (e) {

    console.warn(e);


    document.getElementById('dinner-count').textContent =
      'Christmas dinner guide';


    document.getElementById('christmas-grid').innerHTML =
      `
        <div class="christmas-empty">
          Christmas dinners could not be loaded right now.
          Please try again shortly.
        </div>
      `;

  }

}


/* =========================================================
   SORT BUTTONS
   ========================================================= */

document
  .querySelectorAll('.sort-btn')
  .forEach(btn => {

    btn.addEventListener('click', () => {

      currentSort =
        btn.dataset.sort;


      document
        .querySelectorAll('.sort-btn')
        .forEach(b => {

          b.classList.toggle(
            'active',
            b === btn
          );

        });


      render();

    });

  });


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
  .addEventListener('click', e => {

    if (e.target.id === 'menu-lightbox') {
      closeMenu();
    }

  });


document.addEventListener(
  'keydown',
  e => {

    if (e.key === 'Escape') {
      closeMenu();
    }

  }
);


/* =========================================================
   TOP BAR SCROLL EFFECT
   ========================================================= */

window.addEventListener(
  'scroll',
  () =>
    document
      .getElementById('top-bar')
      ?.classList.toggle(
        'is-scrolled',
        window.scrollY > 30
      ),
  {
    passive: true
  }
);


/* =========================================================
   START
   ========================================================= */

load();
