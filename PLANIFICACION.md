# PLANIFICACIÓN — LUV. (Liga UNLu Voley)

Fecha: 2026-07-31
Estado actual: sitio estático (`index.html`, `styles.css`, `app.js`, `auth.js`) + lectura de posiciones desde Google Sheets.

**Ya implementado:** Parte 1 (logos y favicon) y Parte 2 (tema claro/oscuro).
**Siguiente:** Parte 0 — migración a Firebase.

Assets generados en `assets/` a partir de los dos PNG originales:
`logo-claro.png` y `logo-oscuro.png` (marca para el header), `logo-full-claro.png` y
`logo-full-oscuro.png` (lockup completo para el footer), `favicon-32.png`,
`favicon-180.png`, `icon-512.png` y `og-image.png`.
Los PNG originales de 3508×2481 se dejan en la raíz como fuente; no los borres.

Para levantar el sitio en local: `python -m http.server 5173` en la raíz del proyecto
(hace falta un servidor, con `file://` el fetch a los datos no funciona).

---

## PARTE 0 — Carga de datos fecha a fecha (lo primero a acordar)

### Cómo funciona hoy

`auth.js` ya lee una planilla de Google Sheets con la API pública:

- Planilla: `1YDedfy3yJeTg80rFRAJJma2SxWkJDYxxqvG0-ktdKHo`
- Hojas: `Masculino`, `Femenino`, `Maxi` — rango `B:I`
- Columnas: `equipo | pj | pg | pp | sf | sc | zona`
- El navegador pide los datos al cargar la página → `renderAllTables()`.

Funciona, pero es una solución de arranque. Se reemplaza (ver decisión abajo).

### Diagnóstico: qué es y qué no es inseguro en Sheets

No es problema:

- Que los datos se lean públicamente. Las posiciones de la liga *son* públicas.
- La API key expuesta en `auth.js`. Es de solo lectura: el riesgo es consumo de cuota, no filtración.

Sí es problema — y es el motivo real para migrar:

- **Control de escritura**: quien tenga el link de edición puede modificar o borrar todo. No hay usuarios ni permisos por persona.
- **Sin auditoría**: no queda registro de quién cambió qué.
- **Sin validación**: alguien escribe "tres" en una celda de sets y la tabla se rompe en silencio.
- **Sin revocación**: sacarle el acceso a una sola persona implica rehacer los permisos de toda la planilla.
- **Mala experiencia de carga**: editar una planilla desde el celular al costado de la cancha es incómodo y propenso a errores.

### DECISIÓN: migrar a Firebase (Firestore + Authentication)

Lectura pública de la web contra Firestore, escritura únicamente desde un panel de administración con login.

Aclaración importante: la config de Firebase (incluida su `apiKey`) **también queda visible** en el código del cliente. Es normal y está documentado por Google — en Firebase la seguridad no viene de esconder la key sino de las **reglas de Firestore**. Es exactamente lo que hoy falta en Sheets.

### Modelo de datos (Firestore)

| Colección | Documento | Campos |
|---|---|---|
| `equipos` | un equipo | `nombre, categoria (masculino/femenino/maxi), zona, activo` |
| `partidos` | un partido | `fechaNro, categoria, zona, equipoA, equipoB, setsA, setsB, jugadoEn` |
| `fechas` | una fecha del torneo | `nro, dia, mes, fase (apertura/clausura), estado (jugada/proxima/pendiente)` |
| `galerias` | una galería | `titulo, link, fechaNro, visible` |
| `noticias` | una noticia | `texto, publicadoEn, visible` |
| `config` | doc único `general` | `temporada, subtituloHero, instagram, ultimaActualizacion` |
| `admins` | doc por admin (id = uid) | `email, nombre` |

Las tablas de posiciones **no se guardan**: se calculan en el navegador a partir de `partidos`. Así nunca puede haber una tabla que no cierre con los resultados cargados.

### Panel de administración (`/admin`)

- Login con email + contraseña. Los usuarios se crean a mano desde la consola de Firebase — **no hay registro abierto**.
- Cargar un partido: seleccionar categoría, fecha, los dos equipos y los sets. Validación antes de guardar (sets 0-3, equipos distintos, no cargar dos veces el mismo partido).
- ABM de noticias, galerías y fechas del calendario.
- Editar y borrar lo ya cargado — hoy, corregir un error implica editar la planilla a mano.
- Pensado mobile-first: se usa desde el celular durante la fecha.

### Reglas de seguridad (Firestore)

Lectura abierta, escritura solo para usuarios autenticados que existan en la colección `admins`:

```
match /{coleccion}/{doc} {
  allow read: if true;
  allow write: if request.auth != null
               && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
```

Sobre `admins`: lectura y escritura solo desde la consola de Firebase, nunca desde el cliente. Se suman validaciones de tipo por colección (que `setsA` sea número entre 0 y 3, etc.) para que ni un admin pueda romper los datos por error.

### Costos

Plan gratuito (Spark) de sobra: el límite es 50.000 lecturas por día y esta liga no llega ni cerca.

**No usar Firebase Storage para las fotos.** En los proyectos nuevos Cloud Storage exige plan Blaze (con tarjeta asociada). Las fotos siguen siendo links externos a Drive/Instagram y el proyecto entero queda gratis, sin riesgo de factura sorpresa.

### Hosting

El sitio sigue donde está (GitHub Pages). Firebase acá es solo la base de datos y el login, no hace falta mover el hosting.

### Plan de migración (sin cortar el servicio)

1. Crear el proyecto de Firebase, las reglas y el primer usuario admin.
2. Cargar los datos actuales de la planilla a Firestore (una sola vez, a mano — son pocos equipos).
3. Construir el panel `/admin`.
4. Cambiar la web pública de Sheets a Firestore.
5. Recién ahí, dejar la planilla como respaldo de solo lectura y quitar la API key de `auth.js`.

Hasta el paso 4 el sitio sigue funcionando con Sheets exactamente como hoy.

### Contra de esta decisión (para tenerlo presente)

Una planilla la entiende cualquiera y se traspasa fácil si mañana la liga cambia de manos; un panel a medida requiere que alguien lo mantenga. La mitigación es dejar un export de los datos y el `COMO-CARGAR-DATOS.md` bien escrito.

### Cálculo de la tabla

Se guardan partidos, no tablas. El navegador recorre `partidos` y arma PJ, PG, PP, SF, SC, diferencia y puntos, reusando el orden de desempate que ya existe en `sortTabla()` (`app.js:52`): puntos → diferencia de sets → sets a favor.

Decisión pendiente: si el sistema de puntos es 2 por ganado / 1 por perdido (como está hoy en `calcPuntos`, `app.js:47`) o 3-2-1 según el resultado sea 3-0/3-1 o 3-2. Se define antes de programar.

### Mientras tanto: asegurar Sheets

Hasta que la migración esté terminada, la API key sigue viva en el repo público. Hacerlo igual, es de 5 minutos:

1. Google Cloud Console → restringir la key **por referente HTTP** al dominio del sitio (`sai-market.github.io/*` y el dominio propio si lo hay).
2. Restringir la key **solo a Google Sheets API**.
3. Planilla en **"Cualquiera con el enlace: Lector"** — nunca editor.
4. No cargar datos personales de jugadores (teléfono, DNI) en la planilla: hoy es pública de hecho.

### Detalles de la carga en vivo

- **Actualización en vivo**: con `onSnapshot` de Firestore la tabla se actualiza sola en el celular de quien la está mirando, apenas se carga el partido en el panel. Sin recargar, sin trucos anti-caché.
- **Estados visibles**: "Cargando…" mientras baja, y un mensaje claro si falla (hoy solo va a `console.error` y el usuario ve "Esperando datos…" para siempre).
- **"Última actualización"**: mostrarla abajo de las tablas. Da confianza a quien mira.
- **Modo offline**: Firestore cachea local, así que si se cae la señal en el gimnasio la web sigue mostrando lo último que bajó.

### Manual para quien administra

Se entrega un `COMO-CARGAR-DATOS.md` con: cómo se carga un partido, cómo publicar una galería, cómo agregar una noticia, cómo corregir algo mal cargado y a quién pedirle un usuario nuevo.

---

## PARTE 1 — Logos e identidad ✅ HECHO

Archivos: `LIGA Claro.png` y `LIGA Obscuro.png` — ambos 3508×2481 px, PNG con fondo transparente.

- `LIGA Claro.png`: letras en verde lima, figura en violeta → se lee bien sobre **fondo oscuro**.
- `LIGA Obscuro.png`: letras en violeta, figura en verde → se lee bien sobre **fondo claro**.

*(Supuesto a confirmar: "claro/oscuro" se refiere al color del logo, no al del fondo. Si es al revés, se intercambian y listo.)*

Tareas:

1. Mover los PNG a `assets/` con nombres sin espacios: `logo-claro.png`, `logo-oscuro.png`.
2. Generar versiones optimizadas para web (los originales de 8,7 MP son innecesariamente pesados):
   - `logo-header.png` — ~400 px de ancho, para el header.
   - `favicon-32.png`, `apple-touch-icon-180.png`, `icon-512.png` — recortados al isotipo (las letras "LuV." sin el texto "LIGA UNLU VOLEY", que a 32 px es ilegible).
3. Reemplazar el texto `LUV.` del header (`index.html:24`) por `<img>` con las dos variantes, y mostrar una u otra según el tema.
4. Reemplazar el favicon SVG embebido (`index.html:13`) por los PNG generados → es el ícono de la pestaña del navegador que se pidió.
5. Agregar `og:image` con el logo para que se vea bien al compartir el link por WhatsApp/Instagram.
6. Actualizar el logo del footer (`index.html:142`).

---

## PARTE 2 — Modo claro / modo oscuro ✅ HECHO

Hoy todo el CSS está cableado a la paleta oscura (`--bg-dark: #080718` y muchos `rgba()` hardcodeados en `styles.css`).

1. **Tokens de tema**: mover los colores que cambian (fondos, bordes, texto, superficies de tarjetas, scrollbar) a variables bajo `:root[data-theme="dark"]` y `:root[data-theme="light"]`. El verde lima y el violeta se mantienen en ambos temas: son la marca.
2. **Auditar `styles.css`**: reemplazar los `rgba(8,7,24,...)` y similares sueltos por variables. Es la parte más laboriosa del trabajo.
3. **Botón de tema** en el header, al lado del menú.
4. **Persistencia**: guardar la elección en `localStorage`; si no hay ninguna, respetar `prefers-color-scheme` del sistema.
5. **Sin parpadeo**: script inline en el `<head>` que aplique el tema antes de pintar.
6. **Coherencia**: actualizar `<meta name="theme-color">` al cambiar de tema y cambiar el `<img>` del logo (Parte 1.3).
7. **Contraste**: verificar que el verde lima sobre fondo blanco siga siendo legible (probablemente haya que usar el verde oscuro `--green-dark` para texto en modo claro).

---

## PARTE 3 — Contenido dinámico restante

Una vez lista la Parte 0, migrar desde los arrays fijos de `app.js` a Firestore:

- `galerias` (`app.js:24`) → colección `galerias`.
- `noticias` (`app.js:33`) → colección `noticias`.
- Calendario, hoy escrito a mano en `index.html:93-114` → colección `fechas`, con la fecha ya jugada marcada visualmente.
- `renderFixture()` (`app.js:203`) está vacía con código comentado adentro: se borra o se reusa.
- `auth.js` deja de leer Sheets y pasa a leer Firestore. El nombre del archivo queda confuso (ahora sí va a haber autenticación de verdad): renombrar a `datos.js` y dejar `auth.js` para el login del panel.

---

## PARTE 4 — Cierre

- Probar en celular (la mayoría va a entrar desde el teléfono, y el panel se usa desde ahí).
- Probar los dos temas en las cinco secciones.
- Verificar que la web sigue funcionando si Firestore no responde (que no quede en blanco).
- Probar las reglas de seguridad: intentar escribir sin login desde la consola del navegador y confirmar que lo rechaza.
- Publicar y confirmar que el favicon y el `og:image` se ven bien en el link compartido.

---

## Orden de ejecución propuesto

1. Asegurar la key de Sheets (5 minutos, se hace ya).
2. Parte 1 — logos y favicon (visible, rápido).
3. Parte 2 — temas claro/oscuro.
4. Parte 0 — proyecto Firebase, reglas, modelo y migración de los datos actuales.
5. Parte 0 — panel `/admin` (el bloque más grande del proyecto).
6. Parte 0 — pasar la web pública de Sheets a Firestore.
7. Parte 3 — migrar fotos, noticias y calendario.
8. Parte 4 — pruebas y publicación.

## Decisiones pendientes del usuario

1. ~~¿"Claro/oscuro" en los logos = color del logo?~~ **Confirmado: sí, es el color del logo.**
2. ~~¿Sheets o base de datos?~~ **Decidido: Firebase (Firestore + Auth) con panel de administración.**
3. ~~Sistema de puntos~~ **Confirmado: se mantiene 2 por ganado / 1 por perdido, tal como está en `calcPuntos`.**
4. ~~¿Cuántos admins?~~ **3 o 4 personas, todas con los mismos permisos.** Se crean a mano en la consola de Firebase.
5. ~~¿Tema por defecto?~~ **Oscuro**, que es la identidad actual. El botón permite cambiar y la elección se recuerda.
6. ~~¿Fotos dentro del sitio?~~ **No: todo el almacenamiento va en Google Drive**, el sitio solo redirige. Los links quedan marcados en el código con un comentario visible para poder cambiarlos sin buscar.
