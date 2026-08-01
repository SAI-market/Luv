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
   ⬇️⬇️  LINKS DE DRIVE — CAMBIAR ACÁ  ⬇️⬇️
   Las fotos viven en Google Drive, el sitio solo redirige.
   Pegá en "link" la URL de la carpeta de Drive de cada fecha
   (Compartir → Cualquiera con el enlace → Lector → Copiar vínculo).
   Para una fecha nueva, copiá una línea y cambiá fecha y link.
------------------------------------------------ */
const galerias = [
  { fecha: "Fecha 1 — 18/03/2026", link: "#" },  // ← pegar link de Drive
  { fecha: "Fecha 2 — 16/05/2026", link: "#" },  // ← pegar link de Drive
  { fecha: "Fecha 3 — 20/06/2026", link: "#" },  // ← pegar link de Drive
];

/* ── NOTICIAS ─────────────────────────────
   Add strings for each news item.
------------------------------------------------ */
const noticias = [
  "🏆 Se jugó la Fecha 3 con gran nivel de juego — ¡Los Pumas y Las Águilas lideran sus zonas!",
  "📋 Las inscripciones para la próxima temporada ya están abiertas. Comunicate por Instagram.",
  "📅 El fixture del Apertura ya está disponible en la sección Calendario.",
  "⚠️ Recordatorio: los partidos empiezan puntualmente. Se recomienda llegar 20 min antes.",
  "🎉 Bienvenidos a la temporada 2026 de la Liga UNLu Voley. ¡Mucha suerte a todos los equipos!",
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

function renderTable(containerId, equipos) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!equipos || equipos.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-muted);">Esperando datos...</div>';
    return;
  }

  // 1. Agrupar los equipos según la zona que escribiste en el Excel
  const zonas = {};
  equipos.forEach(eq => {
    const nombreZona = eq.zona || "GENERAL";
    if (!zonas[nombreZona]) zonas[nombreZona] = [];
    zonas[nombreZona].push(eq);
  });

  let htmlFinal = '';

  // 2. Por cada zona que exista, creamos una tabla independiente
  Object.keys(zonas).sort().forEach(nombreZona => {
    const sorted = sortTabla(zonas[nombreZona]);
    const last   = sorted.length - 1;

    // Si hay zonas definidas (no es la "GENERAL"), le ponemos un título
    if (nombreZona !== "GENERAL") {
      htmlFinal += `<h3 class="zona-titulo">• ${nombreZona}</h3>`;
    }

    let tableHtml = `
      <div class="table-wrap" style="margin-bottom: 2rem;">
        <table class="standings-table">
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

      tableHtml += `
        <tr class="${rowClass}">
          <td><span class="pos-badge ${posClass}">${pos}</span></td>
          <td>${eq.equipo}</td>
          <td>${eq.pj}</td>
          <td>${eq.pg}</td>
          <td>${eq.pp}</td>
          <td>${eq.sf}</td>
          <td>${eq.sc}</td>
          <td class="${diff >= 0 ? 'diff-pos' : 'diff-neg'}">${diffStr}</td>
          <td><span class="pts-highlight">${eq.puntos}</span></td>
        </tr>
      `;
    });

    tableHtml += '</tbody></table></div>';
    htmlFinal += tableHtml;
  });

  // 3. Inyectamos todas las tablas generadas en el panel correspondiente
  container.innerHTML = htmlFinal;
}

/* ── RENDER ALL TABLES ──────────────────── */
function renderAllTables() {
  // Ahora apuntamos a los IDs de los contenedores que dejamos vacíos en el HTML
  renderTable('panel-masculino', tablas.masculino);
  renderTable('panel-femenino',  tablas.femenino);
  renderTable('panel-maxi',      tablas.maxi);
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
  // Función desactivada 
  // Ahora el calendario se renderiza de forma estática directamente en el HTML
  // para mantener la nueva identidad asimétrica.
  
  /*
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
  */
}


function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  if (galerias.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted);text-align:center;width:100%;">Próximamente...</p>`;
    return;
  }

  grid.innerHTML = galerias.map((g, i) => {
    const sinLink = !g.link || g.link === '#';
    const accion = sinLink
      ? `<span class="gallery-card__link gallery-card__link--vacio">Próximamente</span>`
      : `<a href="${g.link}" target="_blank" rel="noopener noreferrer" class="gallery-card__link">Ver fotos ↗</a>`;

    return `
      <div class="gallery-card reveal reveal-delay-${(i % 3) + 1}">
        <span class="gallery-card__label">📸 ${g.fecha}</span>
        ${accion}
      </div>
    `;
  }).join('');
}


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


function initHeader() {
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}


function initHamburger() {
  const btn = document.getElementById('hamburger');
  const nav = document.getElementById('nav');

  btn.addEventListener('click', () => {
    btn.classList.toggle('open');
    nav.classList.toggle('open');
  });

 
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      btn.classList.remove('open');
      nav.classList.remove('open');
    });
  });
}


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

/* ── TEMA CLARO / OSCURO ────────────────── */
function initTheme() {
  const btn = document.getElementById('themeToggle');
  const meta = document.getElementById('themeColor');

  // El tema inicial ya lo aplicó el script inline del <head>.
  const aplicar = (tema) => {
    document.documentElement.setAttribute('data-theme', tema);
    if (meta) meta.content = tema === 'light' ? '#f6f5fa' : '#080718';
    try { localStorage.setItem('luv-tema', tema); } catch (e) {}
  };

  btn?.addEventListener('click', () => {
    const actual = document.documentElement.getAttribute('data-theme');
    aplicar(actual === 'light' ? 'dark' : 'light');
  });

  aplicar(document.documentElement.getAttribute('data-theme') || 'dark');
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
  initTheme();

  // Re-run scroll reveal after dynamic content renders
  requestAnimationFrame(() => initScrollReveal());
});