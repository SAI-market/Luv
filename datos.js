/* =============================================
   LUV. — LECTURA PÚBLICA DESDE FIRESTORE
   Reemplaza la vieja lectura de Google Sheets (ver auth.js
   para el login del panel /admin, que es otra cosa).
============================================= */

const db = firebase.firestore();
try { db.enablePersistence().catch(() => {}); } catch (e) {}

let _equiposPorId = {};
let _partidosCache = [];

function _calcularTablas() {
  const grupos = { masculino: {}, femenino: {}, maxi: {} };

  Object.entries(_equiposPorId).forEach(([id, eq]) => {
    if (!eq.activo || !grupos[eq.categoria]) return;
    grupos[eq.categoria][id] = {
      equipo: eq.nombre,
      zona: eq.zona || 'GENERAL',
      pj: 0, pg: 0, pp: 0, sf: 0, sc: 0,
    };
  });

  _partidosCache.forEach(p => {
    const grupo = grupos[p.categoria];
    if (!grupo) return;
    const a = grupo[p.equipoA];
    const b = grupo[p.equipoB];
    if (!a || !b) return; // equipo borrado o inexistente: se ignora el partido

    a.pj++; b.pj++;
    a.sf += p.setsA; a.sc += p.setsB;
    b.sf += p.setsB; b.sc += p.setsA;
    if (p.setsA > p.setsB) { a.pg++; b.pp++; } else { b.pg++; a.pp++; }
  });

  tablas.masculino = Object.values(grupos.masculino);
  tablas.femenino  = Object.values(grupos.femenino);
  tablas.maxi      = Object.values(grupos.maxi);

  if (typeof renderAllTables === 'function') renderAllTables();
  if (typeof renderHeroStats === 'function') renderHeroStats();
}

db.collection('equipos').onSnapshot(snap => {
  _equiposPorId = {};
  snap.forEach(doc => { _equiposPorId[doc.id] = doc.data(); });
  cargaEstado.equipos = true;
  _calcularTablas();
}, err => {
  console.error('Error leyendo equipos:', err);
  cargaEstado.equipos = true;
  _calcularTablas();
});

db.collection('partidos').onSnapshot(snap => {
  _partidosCache = snap.docs.map(d => d.data());
  cargaEstado.partidos = true;
  _calcularTablas();
}, err => {
  console.error('Error leyendo partidos:', err);
  cargaEstado.partidos = true;
  _calcularTablas();
});

db.collection('fechas').onSnapshot(snap => {
  fechas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  cargaEstado.fechas = true;
  if (typeof renderFixture === 'function') renderFixture();
}, err => {
  console.error('Error leyendo fechas:', err);
  cargaEstado.fechas = true;
  if (typeof renderFixture === 'function') renderFixture();
});

db.collection('noticias').where('visible', '==', true).onSnapshot(snap => {
  noticias = snap.docs
    .map(d => d.data())
    .sort((a, b) => {
      const fa = a.publicadoEn && a.publicadoEn.toMillis ? a.publicadoEn.toMillis() : 0;
      const fb = b.publicadoEn && b.publicadoEn.toMillis ? b.publicadoEn.toMillis() : 0;
      return fb - fa;
    });
  cargaEstado.noticias = true;
  if (typeof renderNews === 'function') renderNews();
}, err => {
  console.error('Error leyendo noticias:', err);
  cargaEstado.noticias = true;
  if (typeof renderNews === 'function') renderNews();
});

db.collection('galerias').where('visible', '==', true).onSnapshot(snap => {
  galerias = snap.docs.map(d => d.data());
  cargaEstado.galerias = true;
  if (typeof renderGallery === 'function') renderGallery();
}, err => {
  console.error('Error leyendo galerias:', err);
  cargaEstado.galerias = true;
  if (typeof renderGallery === 'function') renderGallery();
});

db.collection('config').doc('general').onSnapshot(doc => {
  if (doc.exists && typeof renderConfig === 'function') renderConfig(doc.data());
}, err => {
  console.error('Error leyendo config:', err);
});
