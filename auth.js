const CLIENT_ID = '917148795274-h6n16iinto598nmnjertujnq8f35i7ik.apps.googleusercontent.com';
const API_KEY = 'AIzaSyB9QHJyonGVv3RHlGElNoghFTeGMmnWsx8';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const SPREADSHEET_ID = '1YDedfy3yJeTg80rFRAJJma2SxWkJDYxxqvG0-ktdKHo';

// Definimos los tres rangos que vamos a buscar
const RANGES = [
    'Masculino!B:I',
    'Femenino!B:I',
    'Maxi!B:I'
];

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById("gapi").addEventListener("load", gapiLoaded);
document.getElementById("gis").addEventListener("load", gisLoaded);

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '',
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_button').style.display = 'inline-block';
    }
}

document.getElementById('authorize_button').onclick = async () => {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) throw (resp);
        document.getElementById('authorize_button').innerText = 'Actualizar Todo';
        document.getElementById('signout_button').style.display = 'inline-block';
        await fetchAllSheetData();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
};

document.getElementById('signout_button').onclick = () => {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        document.getElementById('authorize_button').innerText = 'Conectar Google';
        document.getElementById('signout_button').style.display = 'none';
    }
};

// Función para procesar los datos de cada hoja
function mapRows(rows) {
    if (!rows) return [];
    // Saltamos la primera fila (encabezados) si es necesario
    const dataRows = rows.slice(1); 
    return dataRows.map(fila => ({
        equipo: fila[0] || "---", 
        pj: parseInt(fila[1]) || 0,
        pg: parseInt(fila[2]) || 0,
        pp: parseInt(fila[3]) || 0,
        sf: parseInt(fila[4]) || 0,
        sc: parseInt(fila[5]) || 0
    }));
}

async function fetchAllSheetData() {
    try {
        // Pedimos todos los rangos en una sola llamada "batchGet"
        const response = await gapi.client.sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEET_ID,
            ranges: RANGES,
        });
        
        const valueRanges = response.result.valueRanges;

        // Asignamos cada resultado a su tabla correspondiente en app.js
        tablas.masculino = mapRows(valueRanges[0].values);
        tablas.femenino  = mapRows(valueRanges[1].values);
        tablas.maxi      = mapRows(valueRanges[2].values);

        // Renderizamos todo
        if (typeof renderAllTables === 'function') renderAllTables();
        if (typeof renderHeroStats === 'function') renderHeroStats();

        console.log("Datos de las 3 categorías cargados con éxito.");

    } catch (err) {
        console.error('Error al traer los datos batch:', err);
    }
}