/* =============================================
   LIGA UNLU VOLEY — LECTURA PÚBLICA DE SHEETS
============================================= */

// Tu API Key (Se usa solo para leer datos públicos)
const API_KEY = 'AIzaSyB9QHJyonGVv3RHlGElNoghFTeGMmnWsx8';
const SPREADSHEET_ID = '1YDedfy3yJeTg80rFRAJJma2SxWkJDYxxqvG0-ktdKHo';

// Formateamos la URL para pedir las 3 hojas de un tirón
const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?ranges=Masculino!B:I&ranges=Femenino!B:I&ranges=Maxi!B:I&key=${API_KEY}`;

// Esta función formatea las filas igual que antes
function mapRows(rows) {
    if (!rows) return [];
    const dataRows = rows.slice(1); // Saltamos los encabezados
    
    return dataRows
        // ESTA ES LA MAGIA: Filtramos la fila para asegurarnos de que sea válida
        .filter(fila => {
            // Verificamos que la celda tenga algo, que no sean solo espacios en blanco, 
            // y por las dudas descartamos si alguien escribió literalmente "Equipo" por error.
            const nombre = fila[0] ? fila[0].trim() : "";
            return nombre !== "" && nombre.toLowerCase() !== "equipo" && nombre !== "---";
        })
        .map(fila => ({
            equipo: fila[0], 
            pj: parseInt(fila[1]) || 0,
            pg: parseInt(fila[2]) || 0,
            pp: parseInt(fila[3]) || 0,
            sf: parseInt(fila[4]) || 0,
            sc: parseInt(fila[5]) || 0
        }));
}

// Función que trae los datos silenciosamente
async function fetchPublicSheetData() {
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("Error de la API:", data.error.message);
            return;
        }

        const valueRanges = data.valueRanges;

        // Asignamos a la variable global 'tablas' que vive en app.js
        tablas.masculino = mapRows(valueRanges[0].values);
        tablas.femenino  = mapRows(valueRanges[1].values);
        tablas.maxi      = mapRows(valueRanges[2].values);

        // Disparamos el redibujado de la página
        if (typeof renderAllTables === 'function') renderAllTables();
        if (typeof renderHeroStats === 'function') renderHeroStats();

        console.log("Tablas actualizadas silenciosamente desde Sheets.");

    } catch (err) {
        console.error('Error de conexión:', err);
    }
}

// Magia: Apenas el navegador termina de leer el HTML, ejecuta la búsqueda solo.
document.addEventListener('DOMContentLoaded', () => {
    fetchPublicSheetData();
}); 