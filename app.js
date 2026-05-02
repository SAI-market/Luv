/* =============================================
   LIGA UNLU VOLEY — app.js
   All content is controlled from this file.
   Edit the DATA SECTION below to update the site.
============================================= */

/* =========================================
   ✏️  DATA SECTION — AHORA SE LLENA DINÁMICAMENTE CON SHEETS
   ========================================= */

let tablas = {
  masculino: [],
  femenino: [],
  maxi: [],
};


const fixturePDF  = "pdfs/fixture-abril.pdf";
const fixtureNombre = "Fixture — Abril 2026";

/* ── FOTOS ────────────────────────────────
   Add a new object per date played.
------------------------------------------------ */
const galerias = [
  { fecha: "Fecha 1 — 12/04/2025", link: "https://drive.google.com/drive/folders/EXAMPLE1" },
  { fecha: "Fecha 2 — 19/04/2025", link: "https://drive.google.com/drive/folders/EXAMPLE2" },
  { fecha: "Fecha 3 — 26/04/2025", link: "https://drive.google.com/drive/folders/EXAMPLE3" },
];

/* ── NOTICIAS ─────────────────────────────
   Add strings for each news item.
------------------------------------------------ */
const noticias = [
  "🏆 Se jugó la Fecha 3 con gran nivel de juego — ¡Los Pumas y Las Águilas lideran sus zonas!",
  "📋 Las inscripciones para la próxima temporada ya están abiertas. Comunicate por Instagram.",
  "📅 El fixture de Mayo ya está disponible en la sección Fixture.",
  "⚠️ Recordatorio: los partidos empiezan puntualmente. Se recomienda llegar 20 min antes.",
  "🎉 Bienvenidos a la temporada 2025 de la Liga UNLu Voley. ¡Mucha suerte a todos los equipos!",
];

/* =========================================
   ⚙️  ENGINE — Don't edit below unless you
   know what you're doing.
   ========================================= */

/* ── SORT LOGIC ─────────────────────────── */
function calcPuntos(equipo) 
{
  return (equipo.pg * 2) + (equipo.pp * 1);
}

function sortTabla(equipos) {
  return [...equipos]
    .map(e => ({ ...e, puntos: calcPuntos(e) }))
    .sort((a, b) => {
      // 1. Points descending
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;
      // 2. Set difference descending
      const diffA = a.sf - a.sc;
      const diffB = b.sf - b.sc;
      if (diffB !== diffA) return diffB - diffA;
      // 3. Sets in favour descending
      return b.sf - a.sf;
    });
}

/* ── RENDER TABLE ───────────────────────── */
function renderTable(tableId, equipos) {
  const table = document.getElementById(tableId);
  if (!table) return;

  // Validación para cuando la tabla está vacía (esperando a Sheets)
  if (!equipos || equipos.length === 0) {
    table.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px;">Esperando datos...</td></tr>';
    return;
  }

  const sorted = sortTabla(equipos);
  const last   = sorted.length - 1;

  let html = `
    <thead>
      <tr>
        <th>#</th>
        <th>Equipo</th>
        <th title="Partidos Jugados">PJ</th>
        <th title="Partidos Ganados">PG</th>
        <th title="Partidos Perdidos">PP</th>
        <th title="Sets a Favor">SF</th>
        <th title="Sets en Contra">SC</th>
        <th title="Diferencia de Sets">+/-</th>
        <th title="Puntos">PTS</th>
      </tr>
    </thead>
    <tbody>
  `;

  sorted.forEach((eq, i) => {
    const pos     = i + 1;
    const diff    = eq.sf - eq.sc;
    const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
    const rowClass = i === 0 ? 'row-first' : (i === last ? 'row-last' : '');

    let posClass = 'pos-badge--n';
    if (pos === 1) posClass = 'pos-badge--1';
    else if (pos === 2) posClass = 'pos-badge--2';
    else if (pos === 3) posClass = 'pos-badge--3';

    html += `
      <tr class="${rowClass}">
        <td><span class="pos-badge ${posClass}">${pos}</span></td>
        <td>${eq.equipo}</td>
        <td>${eq.pj}</td>
        <td>${eq.pg}</td>
        <td>${eq.pp}</td>
        <td>${eq.sf}</td>
        <td>${eq.sc}</td>
        <td style="color:${diff >= 0 ? 'var(--green-light)' : '#f87171'}">${diffStr}</td>
        <td><span class="pts-highlight">${eq.puntos}</span></td>
      </tr>
    `;
  });

  html += '</tbody>';
  table.innerHTML = html;
}

/* ── RENDER ALL TABLES ──────────────────── */
function renderAllTables() {
  renderTable('table-masculino', tablas.masculino);
  renderTable('table-femenino',  tablas.femenino);
  renderTable('table-maxi',      tablas.maxi);
}

/* ── HERO STATS ─────────────────────────── */
function renderHeroStats() {
  const totalEquipos = tablas.masculino.length + tablas.femenino.length + tablas.maxi.length;
  const totalPartidos = [...tablas.masculino, ...tablas.femenino, ...tablas.maxi]
    .reduce((acc, e) => acc + e.pj, 0) / 2 | 0;

  const el = document.getElementById('heroStats');
  if (!el) return;

  el.innerHTML = `
    <div class="hero-stat">
      <div class="hero-stat__num">${totalEquipos}</div>
      <div class="hero-stat__label">Equipos</div>
    </div>
    <div class="hero-stat" style="border-left:1px solid rgba(255,255,255,0.08);border-right:1px solid rgba(255,255,255,0.08);padding:0 2rem;">
      <div class="hero-stat__num">3</div>
      <div class="hero-stat__label">Categorías</div>
    </div>
    <div class="hero-stat">
      <div class="hero-stat__num">${totalPartidos}</div>
      <div class="hero-stat__label">Partidos jugados</div>
    </div>
  `;
}

/* ── TABS ───────────────────────────────── */
function initTabs() {
  const tabs   = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(`panel-${target}`)?.classList.add('active');
    });
  });
}

/* ── FIXTURE ────────────────────────────── */
function renderFixture() {
  const card = document.getElementById('fixtureCard');
  if (!card) return;

  card.innerHTML = `
    <span class="fixture-card__icon">📋</span>
    <div class="fixture-card__title">${fixtureNombre}</div>
    <div class="fixture-card__desc">
      Hacé clic para ver el calendario completo de partidos en PDF.
    </div>
    <a href="${fixturePDF}" target="_blank" rel="noopener noreferrer" class="btn btn--pdf">
      <span class="btn-icon">📄</span> Ver Fixture del Mes
    </a>
  `;
}

/* ── GALLERY ────────────────────────────── */
function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  if (galerias.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted);text-align:center;width:100%;">Próximamente...</p>`;
    return;
  }

  grid.innerHTML = galerias.map((g, i) => `
    <div class="gallery-card reveal reveal-delay-${(i % 3) + 1}">
      <span class="gallery-card__label">📸 ${g.fecha}</span>
      <a href="${g.link}" target="_blank" rel="noopener noreferrer" class="gallery-card__link">
        Ver fotos ↗
      </a>
    </div>
  `).join('');
}

/* ── NEWS ───────────────────────────────── */
function renderNews() {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;

  grid.innerHTML = noticias.map((n, i) => `
    <div class="news-card reveal reveal-delay-${(i % 3) + 1}">
      <div class="news-card__num">${String(i + 1).padStart(2, '0')}</div>
      <div class="news-card__text">${n}</div>
    </div>
  `).join('');
}

/* ── HEADER SCROLL EFFECT ───────────────── */
function initHeader() {
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

/* ── HAMBURGER ──────────────────────────── */
function initHamburger() {
  const btn = document.getElementById('hamburger');
  const nav = document.getElementById('nav');

  btn.addEventListener('click', () => {
    btn.classList.toggle('open');
    nav.classList.toggle('open');
  });

  // Close on nav link click
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      btn.classList.remove('open');
      nav.classList.remove('open');
    });
  });
}

/* ── ACTIVE NAV LINK ────────────────────── */
function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-link');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach(l => {
          l.classList.toggle('active', l.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => observer.observe(s));
}

/* ── SCROLL REVEAL ──────────────────────── */
function initScrollReveal() {
  const items = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  items.forEach(el => observer.observe(el));
}

/* ── LOGO CLICK → SCROLL TOP ────────────── */
function initLogoClick() {
  document.querySelector('.logo')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ── INIT ───────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderHeroStats();
  renderAllTables();
  renderFixture();
  renderGallery();
  renderNews();
  initTabs();
  initHeader();
  initHamburger();
  initActiveNav();
  initScrollReveal();
  initLogoClick();

  // Re-run scroll reveal after dynamic content renders
  requestAnimationFrame(() => initScrollReveal());
});