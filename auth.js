const CLIENT_ID = 'TU_CLIENT_ID'; 
const API_KEY = 'TU_API_KEY';
const SPREADSHEET_ID = '1YDedfy3yJeTg80rFRAJJma2SxWkJDYxxqvG0-ktdKHo';
const RANGE = 'Masculino!A2:G'; 

const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById('gapi').addEventListener('load', gapiLoaded);
document.getElementById('gis').addEventListener('load', gisLoaded);

function gapiLoaded() {
    gapi.load('client', async () => {
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
        checkAuthReady();
    });
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', 
    });
    gisInited = true;
    checkAuthReady();
}

function checkAuthReady() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_button').style.display = 'block';
    }
}

document.getElementById('authorize_button').onclick = () => {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) throw (resp);
        document.getElementById('authorize_button').innerText = 'Actualizar Tabla';
        document.getElementById('signout_button').style.display = 'block';
        await fetchSheetData();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
};

async function fetchSheetData() {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: RANGE,
        });
        const values = response.result.values;
        if (!values) return;

        // Actualizamos la variable global de app.js
        tablas.masculino = values.map(fila => ({
            equipo: fila[1], 
            pj: parseInt(fila[2]) || 0,
            pg: parseInt(fila[3]) || 0,
            pp: parseInt(fila[4]) || 0,
            sf: parseInt(fila[5]) || 0,
            sc: parseInt(fila[6]) || 0
        }));

        updateAllTables(); 
    } catch (err) {
        console.error("Error trayendo datos:", err);
    }
}

document.getElementById('signout_button').onclick = () => {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        document.getElementById('authorize_button').innerText = 'Cargar Tabla de Sheets';
        document.getElementById('signout_button').style.display = 'none';
    }
};