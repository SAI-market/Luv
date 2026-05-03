/* =============================================
   LIGA UNLU VOLEY — LECTURA PÚBLICA DE SHEETS
============================================= */


const API_KEY = 'AIzaSyB9QHJyonGVv3RHlGElNoghFTeGMmnWsx8';
const SPREADSHEET_ID = '1YDedfy3yJeTg80rFRAJJma2SxWkJDYxxqvG0-ktdKHo';


const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?ranges=Masculino!B:I&ranges=Femenino!B:I&ranges=Maxi!B:I&key=${API_KEY}`;


function mapRows(rows) {
    if (!rows) return [];
    const dataRows = rows.slice(1);
    
    return dataRows
        .filter(fila => {
            const nombre = fila[0] ? fila[0].trim() : "";
            return nombre !== "" && nombre.toLowerCase() !== "equipo" && nombre !== "---";
        })
        .map(fila => ({
            equipo: fila[0], 
            pj: parseInt(fila[1]) || 0,
            pg: parseInt(fila[2]) || 0,
            pp: parseInt(fila[3]) || 0,
            sf: parseInt(fila[4]) || 0,
            sc: parseInt(fila[5]) || 0,
            
            zona: fila[6] ? fila[6].trim().toUpperCase() : "GENERAL" 
        }));
}


async function fetchPublicSheetData() {
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("Error de la API:", data.error.message);
            return;
        }

        const valueRanges = data.valueRanges;

        
        tablas.masculino = mapRows(valueRanges[0].values);
        tablas.femenino  = mapRows(valueRanges[1].values);
        tablas.maxi      = mapRows(valueRanges[2].values);

        
        if (typeof renderAllTables === 'function') renderAllTables();
        if (typeof renderHeroStats === 'function') renderHeroStats();

        console.log("Tablas actualizadas silenciosamente desde Sheets.");

    } catch (err) {
        console.error('Error de conexión:', err);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    fetchPublicSheetData();
}); 