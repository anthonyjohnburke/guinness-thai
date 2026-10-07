const CHRISTMAS_URL =
  'https://opensheet.elk.sh/1FENGaj61vr2_6BWbqnYL7k6lkANGIdcBpRciPQU3SOI/ChristmasDinners';

let dinners = [];
let currentSort = 'area';


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


const price = (value) => {
  const number = Number(
    String(value || '').replace(/[^0-9.]/g, '')
  );

  return Number.isFinite(number) && number > 0
    ? number
    : Infinity;
};


/* =========================================================
   SORTING
   ========================================================= */

function sortedRows() {
  return [...dinners].sort((a, b) => {

    if (currentSort === 'price') {
      return (
        price(a.dinner_price) -
          price(b.dinner_price) ||
        String(a.area || '').localeCompare(
          String(b.area || '')
        )
      );
    }

    return (
      String(a.area || '').localeCompare(
        String(b.area || '')
      ) ||
      price(a.dinner_price) -
        price(b.dinner_price) ||
      String(a.name || '').localeCompare(
        String(b.name || '')
      )
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
  ).textContent =
    `${rows.length} ${
      rows.length === 1 ? 'pub' : 'pubs'
    } currently listed`;


  if (!rows.length) {
    grid.innerHTML =
      '<div class="christmas-empty">No Christmas dinners are listed yet.</div>';

    return;
  }


  grid.innerHTML = rows
    .map((r, i) => {

      const image = safeUrl(r.menu_image);

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
            </div>

          </div>


          ${preview}


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
   MENU POPUP
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


  /* Pub name */

  document.getElementById(
    'menu-title'
  ).textContent =
    r.name || '';


  /* Remove the old area / price / status information */

  document.getElementById(
    'menu-meta'
  ).textContent = '';


  /* Remove the old booking / deposit / seating information */

  document.getElementById(
    'menu-booking'
  ).textContent = '';


  /* Website / booking link only */

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

  box.classList.remove('open');

  box.setAttribute(
    'aria-hidden',
    'true'
  );

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

        currentSort =
          button.dataset.sort;

        document
          .querySelectorAll('.sort-btn')
          .forEach((item) => {

            item.classList.toggle(
              'active',
              item === button
            );

          });

        render();
      }
    );

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
