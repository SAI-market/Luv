/* =============================================
   LUV. — PANEL ADMIN — CRUD sobre Firestore
============================================= */

const db = firebase.firestore();

let _adminInitDone = false;
let _equipos = [];
let _partidos = [];
let _fechas = [];
let _noticias = [];
let _galerias = [];

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initAdminTheme() {
  const btn = document.getElementById('themeToggle');
  btn?.addEventListener('click', () => {
    const actual = document.documentElement.getAttribute('data-theme');
    const nuevo = actual === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nuevo);
    try { localStorage.setItem('luv-tema', nuevo); } catch (e) {}
  });
}
initAdminTheme();

function initAdminPanel() {
  if (_adminInitDone) return;
  _adminInitDone = true;

  initAdminTabs();
  initEquiposModule();
  initPartidosModule();
  initFechasModule();
  initNoticiasModule();
  initGaleriasModule();
  initConfigModule();
}

function actualizarUltimaActualizacion() {
  db.collection('config').doc('general').set({
    ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});
}

function initAdminTabs() {
  const tabs = document.querySelectorAll('#adminTabs .tab');
  const panels = document.querySelectorAll('#panelView .tab-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById(`panel-${tab.dataset.tab}`)?.classList.add('active');
    });
  });
}

/* ── EQUIPOS ─────────────────────────────── */
function initEquiposModule() {
  const form = document.getElementById('formEquipo');
  const statusEl = document.getElementById('equipoStatus');
  const cancelBtn = document.getElementById('cancelEquipo');

  db.collection('equipos').orderBy('nombre').onSnapshot(snap => {
    _equipos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderListaEquipos();
    refreshEquipoSelects();
    renderListaPartidos();
  }, err => {
    statusEl.textContent = 'Error al leer equipos: ' + err.message;
    statusEl.className = 'status-msg status-msg--error';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('equipoId').value;
    const data = {
      nombre: document.getElementById('equipoNombre').value.trim(),
      categoria: document.getElementById('equipoCategoria').value,
      zona: document.getElementById('equipoZona').value.trim(),
      activo: document.getElementById('equipoActivo').checked,
    };
    if (!data.nombre) return;

    try {
      if (id) {
        await db.collection('equipos').doc(id).update(data);
      } else {
        await db.collection('equipos').add(data);
      }
      statusEl.textContent = 'Guardado.';
      statusEl.className = 'status-msg status-msg--ok';
      resetFormEquipo();
      actualizarUltimaActualizacion();
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      statusEl.className = 'status-msg status-msg--error';
    }
  });

  cancelBtn.addEventListener('click', resetFormEquipo);
}

function resetFormEquipo() {
  document.getElementById('formEquipo').reset();
  document.getElementById('equipoId').value = '';
  document.getElementById('equipoActivo').checked = true;
  document.getElementById('cancelEquipo').style.display = 'none';
}

function editarEquipo(id) {
  const eq = _equipos.find(e => e.id === id);
  if (!eq) return;
  document.getElementById('equipoId').value = eq.id;
  document.getElementById('equipoNombre').value = eq.nombre || '';
  document.getElementById('equipoCategoria').value = eq.categoria || 'masculino';
  document.getElementById('equipoZona').value = eq.zona || '';
  document.getElementById('equipoActivo').checked = eq.activo !== false;
  document.getElementById('cancelEquipo').style.display = '';
  document.getElementById('formEquipo').scrollIntoView({ behavior: 'smooth' });
}

async function borrarEquipo(id) {
  if (!confirm('¿Borrar este equipo? Los partidos que lo referencian van a dejar de sumar en la tabla.')) return;
  try {
    await db.collection('equipos').doc(id).delete();
    actualizarUltimaActualizacion();
  } catch (err) {
    alert('Error al borrar: ' + err.message);
  }
}

const CATEGORIAS_ORDEN = ['masculino', 'femenino', 'maxi'];
const CATEGORIAS_ETIQUETA = { masculino: 'Masculino', femenino: 'Femenino Libre', maxi: 'Femenino Maxi' };

function renderListaEquipos() {
  const tbody = document.getElementById('listaEquipos');

  if (_equipos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Sin equipos cargados.</td></tr>';
    return;
  }

  tbody.innerHTML = CATEGORIAS_ORDEN.map(cat => {
    const equiposCat = _equipos.filter(eq => eq.categoria === cat);
    if (equiposCat.length === 0) return '';

    const filaTitulo = `
      <tr class="admin-table-group">
        <td colspan="4">${CATEGORIAS_ETIQUETA[cat]}</td>
      </tr>
    `;

    const filas = equiposCat.map(eq => `
      <tr>
        <td>${escapeHtml(eq.nombre)}</td>
        <td>${escapeHtml(eq.zona || '-')}</td>
        <td>${eq.activo !== false ? 'Sí' : 'No'}</td>
        <td class="admin-actions">
          <button class="btn btn--ghost btn--sm" type="button" onclick="editarEquipo('${escapeHtml(eq.id)}')">Editar</button>
          <button class="btn btn--danger btn--sm" type="button" onclick="borrarEquipo('${escapeHtml(eq.id)}')">Borrar</button>
        </td>
      </tr>
    `).join('');

    return filaTitulo + filas;
  }).join('');
}

function refreshEquipoSelects() {
  const categoria = document.getElementById('partidoCategoria')?.value || 'masculino';
  ['partidoEquipoA', 'partidoEquipoB'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const actual = sel.value;
    sel.innerHTML = _equipos
      .filter(eq => eq.categoria === categoria && (eq.activo !== false || eq.id === actual))
      .map(eq => `<option value="${escapeHtml(eq.id)}">${escapeHtml(eq.nombre)}${eq.zona ? ' — ' + escapeHtml(eq.zona) : ''}</option>`)
      .join('');
    if (actual) sel.value = actual;
  });
}

/* ── PARTIDOS ────────────────────────────── */
function initPartidosModule() {
  const form = document.getElementById('formPartido');
  const statusEl = document.getElementById('partidoStatus');
  const cancelBtn = document.getElementById('cancelPartido');
  const categoriaSel = document.getElementById('partidoCategoria');

  categoriaSel.addEventListener('change', refreshEquipoSelects);
  refreshEquipoSelects();

  db.collection('partidos').orderBy('fechaNro').onSnapshot(snap => {
    _partidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderListaPartidos();
  }, err => {
    statusEl.textContent = 'Error al leer partidos: ' + err.message;
    statusEl.className = 'status-msg status-msg--error';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('partidoId').value;
    const categoria = categoriaSel.value;
    const fechaNro = parseInt(document.getElementById('partidoFechaNro').value, 10);
    const equipoA = document.getElementById('partidoEquipoA').value;
    const equipoB = document.getElementById('partidoEquipoB').value;
    const setsA = parseInt(document.getElementById('partidoSetsA').value, 10);
    const setsB = parseInt(document.getElementById('partidoSetsB').value, 10);

    statusEl.textContent = '';

    if (!equipoA || !equipoB || equipoA === equipoB) {
      statusEl.textContent = 'Elegí dos equipos distintos.';
      statusEl.className = 'status-msg status-msg--error';
      return;
    }
    const maxSets = Math.max(setsA, setsB);
    const minSets = Math.min(setsA, setsB);
    if ([setsA, setsB].some(s => isNaN(s)) || maxSets !== 2 || minSets < 0 || minSets > 1) {
      statusEl.textContent = 'Resultado inválido: al mejor de 3 sets debe ser 2-0 o 2-1.';
      statusEl.className = 'status-msg status-msg--error';
      return;
    }

    const duplicado = _partidos.some(p =>
      p.id !== id && p.fechaNro === fechaNro && p.categoria === categoria &&
      ((p.equipoA === equipoA && p.equipoB === equipoB) || (p.equipoA === equipoB && p.equipoB === equipoA))
    );
    if (duplicado) {
      statusEl.textContent = 'Ese partido ya está cargado para esta fecha.';
      statusEl.className = 'status-msg status-msg--error';
      return;
    }

    const equipoAObj = _equipos.find(e => e.id === equipoA);
    const data = {
      categoria, fechaNro, equipoA, equipoB, setsA, setsB,
      zona: (equipoAObj && equipoAObj.zona) || '',
      jugadoEn: firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
      if (id) {
        await db.collection('partidos').doc(id).update(data);
      } else {
        await db.collection('partidos').add(data);
      }
      statusEl.textContent = 'Partido guardado.';
      statusEl.className = 'status-msg status-msg--ok';
      resetFormPartido(true);
      actualizarUltimaActualizacion();
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      statusEl.className = 'status-msg status-msg--error';
    }
  });

  cancelBtn.addEventListener('click', () => resetFormPartido(false));
}

function resetFormPartido(conservarContexto = false) {
  const catActual = document.getElementById('partidoCategoria').value;
  const fechaActual = document.getElementById('partidoFechaNro').value;
  document.getElementById('formPartido').reset();
  document.getElementById('partidoId').value = '';
  document.getElementById('cancelPartido').style.display = 'none';
  if (conservarContexto) {
    document.getElementById('partidoCategoria').value = catActual;
    document.getElementById('partidoFechaNro').value = fechaActual;
  }
  refreshEquipoSelects();
}

function editarPartido(id) {
  const p = _partidos.find(x => x.id === id);
  if (!p) return;
  document.getElementById('partidoId').value = p.id;
  document.getElementById('partidoCategoria').value = p.categoria;
  refreshEquipoSelects();
  document.getElementById('partidoFechaNro').value = p.fechaNro;
  document.getElementById('partidoEquipoA').value = p.equipoA;
  document.getElementById('partidoEquipoB').value = p.equipoB;
  document.getElementById('partidoSetsA').value = p.setsA;
  document.getElementById('partidoSetsB').value = p.setsB;
  document.getElementById('cancelPartido').style.display = '';
  document.getElementById('formPartido').scrollIntoView({ behavior: 'smooth' });
}

async function borrarPartido(id) {
  if (!confirm('¿Borrar este partido?')) return;
  try {
    await db.collection('partidos').doc(id).delete();
    actualizarUltimaActualizacion();
  } catch (err) {
    alert('Error al borrar: ' + err.message);
  }
}

function nombreEquipo(id) {
  const eq = _equipos.find(e => e.id === id);
  return eq ? eq.nombre : '(borrado)';
}

function renderListaPartidos() {
  const wrap = document.getElementById('listaPartidos');
  if (!wrap) return;

  if (_partidos.length === 0) {
    wrap.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Sin partidos cargados.</p>';
    return;
  }

  wrap.innerHTML = CATEGORIAS_ORDEN.map(cat => {
    const partidosCat = _partidos.filter(p => p.categoria === cat);
    if (partidosCat.length === 0) return '';

    const fechasNros = [...new Set(partidosCat.map(p => p.fechaNro))].sort((a, b) => a - b);

    const filas = fechasNros.map(nro => {
      const f = _fechas.find(x => x.nro === nro);
      const etiquetaFecha = f ? `Fecha ${nro} — ${f.dia} de ${f.mes}` : `Fecha ${nro}`;

      const filaTitulo = `
        <tr class="admin-table-group">
          <td colspan="3">${etiquetaFecha}</td>
        </tr>
      `;

      const filasPartido = partidosCat.filter(p => p.fechaNro === nro).map(p => `
        <tr>
          <td>${escapeHtml(nombreEquipo(p.equipoA))} vs ${escapeHtml(nombreEquipo(p.equipoB))}</td>
          <td>${escapeHtml(p.setsA)} - ${escapeHtml(p.setsB)}</td>
          <td class="admin-actions">
            <button class="btn btn--ghost btn--sm" type="button" onclick="editarPartido('${escapeHtml(p.id)}')">Editar</button>
            <button class="btn btn--danger btn--sm" type="button" onclick="borrarPartido('${escapeHtml(p.id)}')">Borrar</button>
          </td>
        </tr>
      `).join('');

      return filaTitulo + filasPartido;
    }).join('');

    return `
      <details class="admin-group" open>
        <summary>${CATEGORIAS_ETIQUETA[cat]} <span class="admin-group-count">(${partidosCat.length})</span></summary>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Partido</th><th>Sets</th><th></th></tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </details>
    `;
  }).join('');
}

/* ── FECHAS ──────────────────────────────── */
function initFechasModule() {
  const form = document.getElementById('formFecha');
  const statusEl = document.getElementById('fechaStatus');
  const cancelBtn = document.getElementById('cancelFecha');

  db.collection('fechas').orderBy('nro').onSnapshot(snap => {
    _fechas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderListaFechas();
    renderListaPartidos();
  }, err => {
    statusEl.textContent = 'Error al leer fechas: ' + err.message;
    statusEl.className = 'status-msg status-msg--error';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('fechaId').value;
    const data = {
      nro: parseInt(document.getElementById('fechaNro').value, 10),
      dia: parseInt(document.getElementById('fechaDia').value, 10),
      mes: document.getElementById('fechaMes').value,
      fase: document.getElementById('fechaFase').value,
      estado: document.getElementById('fechaEstado').value,
    };
    try {
      if (id) {
        await db.collection('fechas').doc(id).update(data);
      } else {
        await db.collection('fechas').add(data);
      }
      statusEl.textContent = 'Guardada.';
      statusEl.className = 'status-msg status-msg--ok';
      resetFormFecha();
      actualizarUltimaActualizacion();
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      statusEl.className = 'status-msg status-msg--error';
    }
  });

  cancelBtn.addEventListener('click', resetFormFecha);
}

function resetFormFecha() {
  document.getElementById('formFecha').reset();
  document.getElementById('fechaId').value = '';
  document.getElementById('fechaFase').value = 'clausura';
  document.getElementById('cancelFecha').style.display = 'none';
}

function editarFecha(id) {
  const f = _fechas.find(x => x.id === id);
  if (!f) return;
  document.getElementById('fechaId').value = f.id;
  document.getElementById('fechaNro').value = f.nro;
  document.getElementById('fechaDia').value = f.dia;
  document.getElementById('fechaMes').value = f.mes;
  document.getElementById('fechaFase').value = f.fase;
  document.getElementById('fechaEstado').value = f.estado;
  document.getElementById('cancelFecha').style.display = '';
  document.getElementById('formFecha').scrollIntoView({ behavior: 'smooth' });
}

async function borrarFecha(id) {
  if (!confirm('¿Borrar esta fecha del calendario?')) return;
  try {
    await db.collection('fechas').doc(id).delete();
    actualizarUltimaActualizacion();
  } catch (err) {
    alert('Error al borrar: ' + err.message);
  }
}

const FASES_ORDEN = ['apertura', 'clausura'];
const FASES_ETIQUETA = { apertura: 'Apertura', clausura: 'Clausura' };

function renderListaFechas() {
  const wrap = document.getElementById('listaFechas');
  if (!wrap) return;

  if (_fechas.length === 0) {
    wrap.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Sin fechas cargadas.</p>';
    return;
  }

  wrap.innerHTML = FASES_ORDEN.map(fase => {
    const fechasFase = _fechas.filter(f => f.fase === fase);
    if (fechasFase.length === 0) return '';

    const filas = fechasFase.map(f => `
      <tr>
        <td>${escapeHtml(f.nro)}</td>
        <td>${escapeHtml(f.dia)} de ${escapeHtml(f.mes)}</td>
        <td>${escapeHtml(f.estado)}</td>
        <td class="admin-actions">
          <button class="btn btn--ghost btn--sm" type="button" onclick="editarFecha('${escapeHtml(f.id)}')">Editar</button>
          <button class="btn btn--danger btn--sm" type="button" onclick="borrarFecha('${escapeHtml(f.id)}')">Borrar</button>
        </td>
      </tr>
    `).join('');

    return `
      <details class="admin-group" open>
        <summary>${FASES_ETIQUETA[fase]} <span class="admin-group-count">(${fechasFase.length})</span></summary>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>N°</th><th>Día</th><th>Estado</th><th></th></tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </details>
    `;
  }).join('');
}

/* ── NOTICIAS ────────────────────────────── */
function initNoticiasModule() {
  const form = document.getElementById('formNoticia');
  const statusEl = document.getElementById('noticiaStatus');
  const cancelBtn = document.getElementById('cancelNoticia');

  db.collection('noticias').orderBy('publicadoEn', 'desc').onSnapshot(snap => {
    _noticias = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderListaNoticias();
  }, err => {
    statusEl.textContent = 'Error al leer noticias: ' + err.message;
    statusEl.className = 'status-msg status-msg--error';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('noticiaId').value;
    const data = {
      texto: document.getElementById('noticiaTexto').value.trim(),
      visible: document.getElementById('noticiaVisible').checked,
    };
    if (!data.texto) return;
    try {
      if (id) {
        await db.collection('noticias').doc(id).update(data);
      } else {
        data.publicadoEn = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('noticias').add(data);
      }
      statusEl.textContent = 'Guardada.';
      statusEl.className = 'status-msg status-msg--ok';
      resetFormNoticia();
      actualizarUltimaActualizacion();
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      statusEl.className = 'status-msg status-msg--error';
    }
  });

  cancelBtn.addEventListener('click', resetFormNoticia);
}

function resetFormNoticia() {
  document.getElementById('formNoticia').reset();
  document.getElementById('noticiaId').value = '';
  document.getElementById('noticiaVisible').checked = true;
  document.getElementById('cancelNoticia').style.display = 'none';
}

function editarNoticia(id) {
  const n = _noticias.find(x => x.id === id);
  if (!n) return;
  document.getElementById('noticiaId').value = n.id;
  document.getElementById('noticiaTexto').value = n.texto;
  document.getElementById('noticiaVisible').checked = n.visible !== false;
  document.getElementById('cancelNoticia').style.display = '';
  document.getElementById('formNoticia').scrollIntoView({ behavior: 'smooth' });
}

async function borrarNoticia(id) {
  if (!confirm('¿Borrar esta noticia?')) return;
  try {
    await db.collection('noticias').doc(id).delete();
    actualizarUltimaActualizacion();
  } catch (err) {
    alert('Error al borrar: ' + err.message);
  }
}

function renderListaNoticias() {
  const tbody = document.getElementById('listaNoticias');
  tbody.innerHTML = _noticias.map(n => `
    <tr>
      <td style="white-space:normal; max-width:320px;">${escapeHtml(n.texto)}</td>
      <td>${n.visible !== false ? 'Sí' : 'No'}</td>
      <td class="admin-actions">
        <button class="btn btn--ghost btn--sm" type="button" onclick="editarNoticia('${escapeHtml(n.id)}')">Editar</button>
        <button class="btn btn--danger btn--sm" type="button" onclick="borrarNoticia('${escapeHtml(n.id)}')">Borrar</button>
      </td>
    </tr>
  `).join('');
}

/* ── GALERÍAS ────────────────────────────── */
function initGaleriasModule() {
  const form = document.getElementById('formGaleria');
  const statusEl = document.getElementById('galeriaStatus');
  const cancelBtn = document.getElementById('cancelGaleria');

  db.collection('galerias').onSnapshot(snap => {
    _galerias = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderListaGalerias();
  }, err => {
    statusEl.textContent = 'Error al leer galerías: ' + err.message;
    statusEl.className = 'status-msg status-msg--error';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('galeriaId').value;
    const fechaNroVal = document.getElementById('galeriaFechaNro').value;
    const data = {
      titulo: document.getElementById('galeriaTitulo').value.trim(),
      link: document.getElementById('galeriaLink').value.trim() || '#',
      fechaNro: fechaNroVal ? parseInt(fechaNroVal, 10) : null,
      visible: document.getElementById('galeriaVisible').checked,
    };
    if (!data.titulo) return;
    try {
      if (id) {
        await db.collection('galerias').doc(id).update(data);
      } else {
        await db.collection('galerias').add(data);
      }
      statusEl.textContent = 'Guardada.';
      statusEl.className = 'status-msg status-msg--ok';
      resetFormGaleria();
      actualizarUltimaActualizacion();
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      statusEl.className = 'status-msg status-msg--error';
    }
  });

  cancelBtn.addEventListener('click', resetFormGaleria);
}

function resetFormGaleria() {
  document.getElementById('formGaleria').reset();
  document.getElementById('galeriaId').value = '';
  document.getElementById('galeriaVisible').checked = true;
  document.getElementById('cancelGaleria').style.display = 'none';
}

function editarGaleria(id) {
  const g = _galerias.find(x => x.id === id);
  if (!g) return;
  document.getElementById('galeriaId').value = g.id;
  document.getElementById('galeriaTitulo').value = g.titulo;
  document.getElementById('galeriaLink').value = g.link === '#' ? '' : g.link;
  document.getElementById('galeriaFechaNro').value = g.fechaNro || '';
  document.getElementById('galeriaVisible').checked = g.visible !== false;
  document.getElementById('cancelGaleria').style.display = '';
  document.getElementById('formGaleria').scrollIntoView({ behavior: 'smooth' });
}

async function borrarGaleria(id) {
  if (!confirm('¿Borrar esta galería?')) return;
  try {
    await db.collection('galerias').doc(id).delete();
    actualizarUltimaActualizacion();
  } catch (err) {
    alert('Error al borrar: ' + err.message);
  }
}

function renderListaGalerias() {
  const tbody = document.getElementById('listaGalerias');
  tbody.innerHTML = _galerias.map(g => `
    <tr>
      <td>${escapeHtml(g.titulo)}</td>
      <td>${g.link && g.link !== '#' ? `<a href="${escapeHtml(g.link)}" target="_blank" rel="noopener noreferrer">Ver</a>` : '-'}</td>
      <td>${g.visible !== false ? 'Sí' : 'No'}</td>
      <td class="admin-actions">
        <button class="btn btn--ghost btn--sm" type="button" onclick="editarGaleria('${escapeHtml(g.id)}')">Editar</button>
        <button class="btn btn--danger btn--sm" type="button" onclick="borrarGaleria('${escapeHtml(g.id)}')">Borrar</button>
      </td>
    </tr>
  `).join('');
}

/* ── CONFIGURACIÓN GENERAL ───────────────── */
function initConfigModule() {
  const form = document.getElementById('formConfig');
  const statusEl = document.getElementById('configStatus');
  if (!form) return;

  db.collection('config').doc('general').onSnapshot(doc => {
    if (!doc.exists) return;
    const d = doc.data();
    document.getElementById('configTemporada').value = d.temporada || '';
    document.getElementById('configSubtitulo').value = d.subtituloHero || '';
    document.getElementById('configInstagram').value = d.instagram || '';
  }, err => {
    statusEl.textContent = 'Error al leer configuración: ' + err.message;
    statusEl.className = 'status-msg status-msg--error';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const temporada = document.getElementById('configTemporada').value.trim();
    const subtituloHero = document.getElementById('configSubtitulo').value.trim();
    const instagram = document.getElementById('configInstagram').value.trim();
    if (!temporada || !subtituloHero) return;

    try {
      await db.collection('config').doc('general').set({
        temporada,
        subtituloHero,
        instagram,
        ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      statusEl.textContent = 'Configuración guardada.';
      statusEl.className = 'status-msg status-msg--ok';
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      statusEl.className = 'status-msg status-msg--error';
    }
  });
}
