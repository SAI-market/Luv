/* =============================================
   LIGA UNLU VOLEY — app.js
   All content is controlled from this file.
   Edit the DATA SECTION below to update the site.
============================================= */

/* =========================================
   ✏️  DATA SECTION — SE LLENA DINÁMICAMENTE DESDE FIRESTORE (ver datos.js)
   ========================================= */

let tablas = {
  masculino: [],
  femenino: [],
  maxi: [],
};

let fechas = [];
let partidos = [];
let galerias = [];
let noticias = [];
let fechaSeleccionada = null;

const CATEGORIAS_NOMBRE = {
  masculino: 'Masculino Libre',
  femenino: 'Femenino Libre',
  maxi: 'Femenino Maxi',
};

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Refleja si ya llegó la primera respuesta de Firestore para cada colección,
   para poder distinguir "cargando" de "no hay datos todavía". */
let cargaEstado = {
  equipos: false,
  partidos: false,
  fechas: false,
  galerias: false,
  noticias: false,
};

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
    const listo = cargaEstado.equipos && cargaEstado.partidos;
    const mensaje = listo
      ? 'Todavía no hay equipos cargados en esta categoría.'
      : 'Cargando datos…';
    container.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);">${mensaje}</div>`;
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
      htmlFinal += `<h3 class="zona-titulo">• ${escapeHtml(nombreZona)}</h3>`;
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
      const rowClass = i === 0 ? 'row-first' : (i === last && sorted.length > 1 ? 'row-last' : '');

      let posClass = 'pos-badge--n';
      if (pos === 1) posClass = 'pos-badge--1';
      else if (pos === 2) posClass = 'pos-badge--2';
      else if (pos === 3) posClass = 'pos-badge--3';

      tableHtml += `
        <tr class="${rowClass} team-row" data-equipo-id="${escapeHtml(eq.id)}" data-categoria="${escapeHtml(eq.categoria)}" tabindex="0" role="button" aria-label="Ver partidos de ${escapeHtml(eq.equipo)}">
          <td><span class="pos-badge ${posClass}">${pos}</span></td>
          <td><div class="team-cell"><span class="team-cell__name">${escapeHtml(eq.equipo)}</span><span class="team-cell__arrow" aria-hidden="true">›</span></div></td>
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

  container.querySelectorAll('.team-row').forEach(row => {
    const activar = () => abrirModalEquipo(row.dataset.equipoId, row.dataset.categoria);
    row.addEventListener('click', activar);
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activar();
      }
    });
  });
}

function abrirModalEquipo(equipoId, categoria) {
  const modal = document.getElementById('equipoModal');
  if (!modal || !equipoId) return;

  const listaCat = tablas[categoria] || [];
  const eq = listaCat.find(e => e.id === equipoId);
  if (!eq) return;

  const puntos = calcPuntos(eq);
  const diff = eq.sf - eq.sc;
  const diffStr = diff > 0 ? `+${diff}` : `${diff}`;

  document.getElementById('equipoModalCat').textContent = CATEGORIAS_NOMBRE[categoria] || categoria;
  document.getElementById('equipoModalTitle').textContent = eq.equipo;
  document.getElementById('equipoModalStats').innerHTML = `
    <div class="dialog-stat"><span class="dialog-stat__val">${puntos}</span><span class="dialog-stat__lbl">PTS</span></div>
    <div class="dialog-stat"><span class="dialog-stat__val">${eq.pj}</span><span class="dialog-stat__lbl">PJ</span></div>
    <div class="dialog-stat"><span class="dialog-stat__val">${eq.pg}-${eq.pp}</span><span class="dialog-stat__lbl">PG-PP</span></div>
    <div class="dialog-stat"><span class="dialog-stat__val">${eq.sf}-${eq.sc} (${diffStr})</span><span class="dialog-stat__lbl">Sets</span></div>
  `;

  const misPartidos = partidos
    .filter(p => p.categoria === categoria && (p.equipoA === equipoId || p.equipoB === equipoId))
    .sort((a, b) => (a.fechaNro || 0) - (b.fechaNro || 0));

  const body = document.getElementById('equipoModalBody');
  if (misPartidos.length === 0) {
    body.innerHTML = `<p class="empty-state">Este equipo todavía no tiene partidos registrados.</p>`;
  } else {
    body.innerHTML = misPartidos.map(p => {
      const esA = p.equipoA === equipoId;
      const misSets = esA ? p.setsA : p.setsB;
      const rivalSets = esA ? p.setsB : p.setsA;
      const rivalNombre = esA ? p.nombreB : p.nombreA;
      const gano = misSets > rivalSets;
      return `
        <div class="match-item ${gano ? 'match-item--win' : 'match-item--loss'}">
          <span class="match-item__fecha">Fecha ${escapeHtml(p.fechaNro)}</span>
          <span class="match-item__rival">vs <strong>${escapeHtml(rivalNombre)}</strong></span>
          <span class="match-item__score">${misSets} - ${rivalSets}</span>
          <span class="match-item__badge ${gano ? 'match-item__badge--win' : 'match-item__badge--loss'}">${gano ? 'GANÓ' : 'PERDIÓ'}</span>
        </div>
      `;
    }).join('');
  }

  if (typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function initEquipoModal() {
  const modal = document.getElementById('equipoModal');
  const closeBtn = document.getElementById('equipoModalClose');
  if (!modal) return;
  closeBtn?.addEventListener('click', () => modal.close());
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.close();
  });
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
    <div class="hero-stat hero-stat--divider">
      <div class="hero-stat__num">3</div>
      <div class="hero-stat__label">Categorías</div>
    </div>
    <div class="hero-stat">
      <div class="hero-stat__num">${totalPartidos}</div>
      <div class="hero-stat__label">Partidos jugados</div>
    </div>
  `;
}

/* ── CONFIG (config/general en Firestore) ── */
function renderConfig(config) {
  if (!config) return;

  if (config.temporada) {
    const badgeText = document.getElementById('heroBadgeText') || document.querySelector('.hero-badge');
    if (badgeText) badgeText.textContent = `Temporada ${config.temporada}`;
  }

  if (config.subtituloHero) {
    const sub = document.querySelector('.hero-subtitle');
    if (sub) sub.textContent = config.subtituloHero;
  }

  const ig = document.getElementById('footerInstagram');
  if (ig) {
    if (config.instagram) {
      ig.href = config.instagram;
      ig.style.display = '';
    } else {
      ig.style.display = 'none';
    }
  }

  const ult = document.getElementById('ultimaActualizacion');
  if (ult && config.ultimaActualizacion) {
    const fecha = typeof config.ultimaActualizacion.toDate === 'function'
      ? config.ultimaActualizacion.toDate()
      : new Date(config.ultimaActualizacion);
    ult.textContent = `Última actualización: ${fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}`;
  }
}

/* ── TABS ───────────────────────────────── */
function initTabs() {
  const tabs   = document.querySelectorAll('#tabs .tab');
  const panels = document.querySelectorAll('#posiciones .tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById(`panel-${target}`)?.classList.add('active');
    });
  });
}

/* ── FIXTURE / CALENDARIO ───────────────── */
const MESES_ABREV = {
  enero: 'ENERO', febrero: 'FEBRERO', marzo: 'MARZO', abril: 'ABRIL',
  mayo: 'MAYO', junio: 'JUNIO', julio: 'JULIO', agosto: 'AGOSTO',
  septiembre: 'SEPTIEMBRE', octubre: 'OCTUBRE', noviembre: 'NOVIEMBRE', diciembre: 'DICIEMBRE',
};

function renderFixture() {
  const container = document.getElementById('calendarioContainer');
  if (!container) return;

  if (fechas.length === 0 && partidos.length === 0) {
    const mensaje = cargaEstado.fechas
      ? 'Todavía no hay fechas cargadas.'
      : 'Cargando calendario…';
    container.innerHTML = `<div class="empty-state">${mensaje}</div>`;
    return;
  }

  const fechasConPartidos = [...new Set(partidos.map(p => Number(p.fechaNro)).filter(Boolean))].sort((a, b) => a - b);
  if (fechaSeleccionada === null && fechasConPartidos.length > 0) {
    fechaSeleccionada = fechasConPartidos[fechasConPartidos.length - 1];
  }

  const anio = new Date().getFullYear();
  let html = `
    <div class="calendario-header">
      <h2 class="titulo-calendario">CALENDARIO</h2>
      <span class="anio-calendario">${anio}</span>
    </div>
  `;

  const fases = {};
  fechas.forEach(f => {
    const fase = f.fase || 'general';
    if (!fases[fase]) fases[fase] = [];
    fases[fase].push(f);
  });

  Object.keys(fases).forEach(fase => {
    const lista = fases[fase].sort((a, b) => (a.nro || 0) - (b.nro || 0));
    html += `
      <div class="fase-container">
        <h3 class="fase-titulo">${escapeHtml(fase.toUpperCase())}:</h3>
        <div class="fechas-grid">
    `;
    lista.forEach(f => {
      const nro = Number(f.nro);
      const jugada = f.estado === 'jugada';
      const proxima = f.estado === 'proxima';
      const cantPartidos = partidos.filter(p => Number(p.fechaNro) === nro).length;
      const activa = cantPartidos > 0 && fechaSeleccionada === nro;
      const mes = MESES_ABREV[(f.mes || '').toLowerCase()] || (f.mes || '').toUpperCase();

      let estadoBadge = '<span class="fecha-estado-badge fecha-estado-badge--pendiente">Programada</span>';
      if (jugada) {
        estadoBadge = '<span class="fecha-estado-badge fecha-estado-badge--jugada"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Jugada</span>';
      } else if (proxima) {
        estadoBadge = '<span class="fecha-estado-badge fecha-estado-badge--proxima"><span class="badge-dot badge-dot--sm" aria-hidden="true"></span> Próxima</span>';
      }

      const classes = [
        'fecha-card',
        jugada ? 'fecha-card--jugada' : '',
        proxima ? 'fecha-card--proxima' : '',
        cantPartidos > 0 ? 'fecha-card--con-partidos' : '',
        activa ? 'fecha-card--activa' : '',
      ].filter(Boolean).join(' ');

      const attrs = cantPartidos > 0
        ? `data-fecha-nro="${nro}" role="button" tabindex="0" aria-label="Ver ${cantPartidos} partidos de la Fecha ${nro}"`
        : '';

      html += `
        <div class="${classes}" ${attrs}>
          ${estadoBadge}
          <span class="fecha-numero">FECHA ${escapeHtml(f.nro)}</span>
          <span class="fecha-dia">${escapeHtml(f.dia)} DE ${escapeHtml(mes)}</span>
          ${cantPartidos > 0 ? `<span class="fecha-partidos-cta">${activa ? 'Viendo' : 'Ver'} ${cantPartidos} partidos ▾</span>` : ''}
        </div>
      `;
    });
    html += `</div></div>`;
  });

  if (fechasConPartidos.length > 0) {
    const partidosDeFecha = partidos.filter(p => Number(p.fechaNro) === Number(fechaSeleccionada));
    const infoFecha = fechas.find(f => Number(f.nro) === Number(fechaSeleccionada));
    const subFecha = infoFecha
      ? ` — ${escapeHtml(infoFecha.dia)} de ${escapeHtml(infoFecha.mes)}`
      : '';

    const selectorHtml = fechasConPartidos.map(nro => `
      <button type="button" class="tab ${Number(fechaSeleccionada) === nro ? 'active' : ''}" data-select-fecha="${nro}">
        Fecha ${nro}
      </button>
    `).join('');

    const bloquesCat = ['masculino', 'femenino', 'maxi'].map(cat => {
      const lista = partidosDeFecha.filter(p => p.categoria === cat);
      if (lista.length === 0) return '';
      const filas = lista.map(p => {
        const ganoA = p.setsA > p.setsB;
        return `
          <div class="resultado-row">
            <span class="resultado-team resultado-team--a ${ganoA ? 'resultado-team--winner' : ''}">${escapeHtml(p.nombreA)}</span>
            <span class="resultado-score">
              <strong class="${ganoA ? 'score-win' : ''}">${p.setsA}</strong>
              <span class="score-sep">:</span>
              <strong class="${!ganoA ? 'score-win' : ''}">${p.setsB}</strong>
            </span>
            <span class="resultado-team resultado-team--b ${!ganoA ? 'resultado-team--winner' : ''}">${escapeHtml(p.nombreB)}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="resultados-cat">
          <h4 class="resultados-cat__title">${CATEGORIAS_NOMBRE[cat]} <span class="resultados-cat__count">(${lista.length})</span></h4>
          <div class="resultados-list">${filas}</div>
        </div>
      `;
    }).join('');

    html += `
      <div class="resultados-fecha-box" id="resultadosFechaBox">
        <div class="resultados-fecha-header">
          <h3 class="resultados-fecha-title">Resultados Fecha ${escapeHtml(fechaSeleccionada)}${subFecha}</h3>
          <div class="tabs resultados-fecha-tabs">${selectorHtml}</div>
        </div>
        <div class="resultados-grid">${bloquesCat}</div>
      </div>
    `;
  }

  container.innerHTML = html;

  container.querySelectorAll('[data-fecha-nro], [data-select-fecha]').forEach(el => {
    const nro = Number(el.dataset.fechaNro || el.dataset.selectFecha);
    const seleccionar = () => {
      fechaSeleccionada = nro;
      renderFixture();
      if (el.hasAttribute('data-fecha-nro')) {
        document.getElementById('resultadosFechaBox')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };
    el.addEventListener('click', seleccionar);
    if (el.hasAttribute('data-fecha-nro')) {
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          seleccionar();
        }
      });
    }
  });
}


function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  const camIcon = `<svg class="icon-inline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`;

  if (galerias.length === 0) {
    const mensaje = cargaEstado.galerias ? 'Próximamente subiremos las galerías de fotos de cada fecha.' : 'Cargando galerías…';
    grid.innerHTML = `<div class="empty-state">${camIcon} <span>${mensaje}</span></div>`;
    return;
  }

  grid.innerHTML = galerias.map((g, i) => {
    const sinLink = !g.link || g.link === '#';
    const accion = sinLink
      ? `<span class="gallery-card__link gallery-card__link--vacio">Próximamente</span>`
      : `<a href="${escapeHtml(g.link)}" target="_blank" rel="noopener noreferrer" class="gallery-card__link">Ver fotos ↗</a>`;

    return `
      <div class="gallery-card reveal reveal-delay-${(i % 3) + 1}">
        <span class="gallery-card__label">${camIcon} ${escapeHtml(g.titulo)}</span>
        ${accion}
      </div>
    `;
  }).join('');

  initScrollReveal();
}


function renderNews() {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;

  if (noticias.length === 0) {
    const mensaje = cargaEstado.noticias ? 'Todavía no hay comunicados publicados.' : 'Cargando noticias…';
    grid.innerHTML = `<div class="empty-state"><span>${mensaje}</span></div>`;
    return;
  }

  grid.innerHTML = noticias.map((n, i) => `
    <div class="news-card reveal reveal-delay-${(i % 3) + 1}">
      <div class="news-card__num">${String(i + 1).padStart(2, '0')}</div>
      <div class="news-card__text">${escapeHtml(n.texto)}</div>
    </div>
  `).join('');

  initScrollReveal();
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
  if (!btn || !nav) return;

  btn.addEventListener('click', () => {
    const open = btn.classList.toggle('open');
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      btn.classList.remove('open');
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
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
  const logo = document.querySelector('.logo');
  if (!logo) return;
  const irArriba = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  logo.addEventListener('click', irArriba);
  logo.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      irArriba();
    }
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
  initEquipoModal();

  // Re-run scroll reveal after dynamic content renders
  requestAnimationFrame(() => initScrollReveal());
});