## Demo Nomo - Sistemas Distribuidos

Este proyecto es una **demo sencilla de login distribuido** usando:

- **Backend Node.js/Express** (contenedor `backend`)
- **Base de datos Postgres** (contenedor `supabase-db`)
- **Servicios adicionales estilo Supabase** (`supabase-auth`, `supabase-storage`, opcionales para la demo)
- **Frontend estático** (HTML + JS) servido por el mismo backend

La idea es mostrar cómo un **cliente web** habla con un **backend** que, a su vez, consume una **base de datos en otro contenedor Docker**.

---

## Requisitos previos

- **Docker** y **Docker Compose** instalados
- Puertos libres:
  - `3000` (backend + frontend)
  - `5432` (Postgres)
  - `9999` (supabase-auth, opcional)
  - `5000` (supabase-storage, opcional)

---

## Cómo ejecutar el proyecto

1. **Ubicarse en la carpeta del proyecto**

   ```bash
   cd nomo-project
   ```

2. **Levantar los contenedores con Docker Compose**

   ```bash
   docker-compose up --build
   ```

   - `--build` fuerza la reconstrucción de la imagen del servicio `backend` a partir del `Dockerfile` en `demo/`.
   - Esto levantará al menos:
     - `supabase-db` (Postgres)
     - `supabase-auth`
     - `supabase-storage`
     - `backend`

3. **Esperar a que los servicios arranquen**

   - El backend imprime en consola algo como:
     ```text
     Backend on 3000
     ```
   - Postgres puede tardar unos segundos en estar listo; el backend crea automáticamente la tabla de usuarios y un usuario demo.

4. **Abrir la aplicación en el navegador**

   - Ir a `http://localhost:3000`
   - Verás el formulario de login con correo y contraseña prellenados:
     - Email: `demo@ejemplo.com`
     - Password: `demo123`

5. **Probar el login**

   - Haz clic en **"Iniciar sesión"**.
   - Si todo va bien, verás un mensaje tipo:
     - `Login correcto — usuario: demo@ejemplo.com`

6. **Detener los contenedores**

   En otra terminal, desde la carpeta `nomo-project`:

   ```bash
   docker-compose down
   ```

---

## Arquitectura general

### Servicios en `docker-compose.yml`

- **`supabase-db`**
  - Imagen: `supabase/postgres:15.1.0.147`
  - Expone el puerto `5432:5432`
  - Guarda los datos en el volumen `supabase_db`

- **`supabase-auth`**
  - Imagen: `supabase/gotrue`
  - Expone `9999:8000`
  - Depende de `supabase-db`
  - Configurado con variables de entorno típicas de Supabase Auth (JWT, URL, etc.)

- **`supabase-storage`**
  - Imagen: `supabase/storage-api`
  - Expone `5000:5000`
  - También usa Postgres como backend
  - Incluye claves `ANON_KEY` y `SERVICE_ROLE_KEY` solo para demo (no usar en producción)

- **`backend`**
  - Se construye desde `./demo` (usa el `Dockerfile` y `server.js`)
  - Expone `3000:3000`
  - Depende de `supabase-db`
  - Recibe por variables de entorno los datos de conexión a la base:
    - `DB_HOST=supabase-db`
    - `DB_PORT=5432`
    - `DB_NAME=postgres`
    - `DB_USER=postgres`
    - `DB_PASS=postgres`

---

## Flujo de datos (de extremo a extremo)

### 1. Usuario en el navegador (frontend)

Archivo: `demo/frontend/index.html` + `demo/frontend/app.js`

- El usuario carga `http://localhost:3000`.
- El backend sirve el archivo `index.html` (y los assets estáticos de `frontend/`).
- El formulario de login tiene dos campos:
  - `email`
  - `password`
- En `app.js` se escucha el evento `submit` del formulario:
  - Se hace `fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })`.
  - Es decir, el **cliente envía un JSON** con el email y la contraseña al endpoint `/login` del backend.

### 2. Backend Express (API REST sencilla)

Archivo principal: `demo/server.js`

- Se inicializa un servidor Express:
  - `express.json()` para parsear JSON del body.
  - `express.static('frontend')` para servir el HTML, CSS y JS.
- Se crea un `Pool` de Postgres (`pg`) usando las variables de entorno:
  - `host: 'supabase-db'`
  - `port: 5432`
  - `database: 'postgres'`
  - `user: 'postgres'`
  - `password: 'postgres'`

#### 2.1 Inicialización de base de datos

Cuando arranca el backend:

- Ejecuta `initDb()` que:
  - Crea la tabla `users` si no existe.
  - Inserta un usuario por defecto:
    - email: `demo@ejemplo.com`
    - password: `demo123`

#### 2.2 Endpoint `/login`

Ruta definida en `server.js`:

- Método: `POST /login`
- Flujo:
  1. Lee `email` y `password` del `req.body`.
  2. Si faltan campos, responde:
     - `400 Bad Request` con `{ ok: false, message: 'Faltan email o contraseña' }`.
  3. Si están ambos:
     - Hace una consulta SQL a Postgres:
       ```sql
       SELECT id, email FROM users WHERE email = $1 AND password = $2;
       ```
     - Pasa los parámetros `[email, password]`.
  4. Si no hay filas:
     - Devuelve `401 Unauthorized` con `{ ok: false, message: 'Credenciales inválidas' }`.
  5. Si encuentra el usuario:
     - Devuelve `200 OK` con:
       ```json
       {
         "ok": true,
         "message": "Login correcto",
         "user": { "id": ..., "email": "demo@ejemplo.com" }
       }
       ```
  6. Si ocurre un error en la consulta:
     - Devuelve `500 Internal Server Error` con `{ ok: false, message: 'Error interno en el servidor' }`.

También existe un endpoint de salud:

- `GET /health` → Responde `"Backend OK"` para verificar que el servicio está vivo.

### 3. Respuesta al navegador

De vuelta en el frontend (`app.js`):

- Se parsea el JSON de respuesta del backend.
- Según `data.ok`:
  - Si `true`:
    - Muestra un mensaje verde: `"Login correcto — usuario: <email>"`.
  - Si `false`:
    - Muestra el mensaje de error devuelto por el backend (`data.message`).
- De esta manera el usuario ve **en tiempo real** el resultado de la validación que se hizo en Postgres, aunque esa base de datos esté corriendo en **otro contenedor**.

---

## Resumen del flujo distribuido

1. **Cliente web (HTML/JS)** en el navegador envía credenciales a `/login` (contenedor `backend`).
2. **Backend Express** recibe el JSON, lo valida y hace una consulta SQL a Postgres (`supabase-db`).
3. **Postgres** responde con los datos del usuario (o vacío).
4. El **backend construye una respuesta JSON** (`ok`, `message`, `user`) y la envía de vuelta al navegador.
5. El **frontend actualiza la interfaz** mostrando éxito o error.

Este ejemplo muestra un **flujo de datos clásico en sistemas distribuidos**: cliente → API → base de datos, cada uno potencialmente en su propio contenedor/host.

