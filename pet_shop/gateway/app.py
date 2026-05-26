from flask import Flask, request, jsonify
import requests
import time

app= Flask(__name__)

HEALTH_TIMEOUT_SECONDS = 3


def _probe_health(url: str, nombre: str) -> dict:
    """Consulta /health de un servicio: disponibilidad, latencia y log estructurado."""
    inicio = time.time()
    try:
        response = requests.get(url, timeout=HEALTH_TIMEOUT_SECONDS)
        fin = time.time()
        latency_ms = round((fin - inicio) * 1000, 2)
        try:
            detalle = response.json()
        except ValueError:
            detalle = {"raw": "respuesta no JSON"}
        up = response.status_code == 200
        estado = "up" if up else "down"
        print(
            f"[MONITOR] probe service={nombre} estado={estado} "
            f"http={response.status_code} latency_ms={latency_ms}",
            flush=True,
        )
        return {
            "estado": estado,
            "latency_ms": latency_ms,
            "http_status": response.status_code,
            "detalle": detalle,
        }
    except Exception as ex:
        fin = time.time()
        latency_ms = round((fin - inicio) * 1000, 2)
        print(
            f"[MONITOR] probe service={nombre} estado=down error={ex!r} latency_ms={latency_ms}",
            flush=True,
        )
        return {
            "estado": "down",
            "latency_ms": latency_ms,
            "error": str(ex),
        }

fallos_backend = 0
circuito_abierto_backend = False
fallos_usuarios = 0
circuito_abierto_usuarios = False
DEFAULT_TIMEOUT_SECONDS = 10
RECOVERY_WAIT_SECONDS = 5

def _intentar_recuperacion_usuarios():
    global fallos_usuarios, circuito_abierto_usuarios
    time.sleep(RECOVERY_WAIT_SECONDS)
    print(
        f"[usuarios] Espera controlada ({RECOVERY_WAIT_SECONDS}s): nuevo intento de conexión…",
        flush=True,
    )
    try:
        r = requests.get("http://usuarios:5000/usuarios", timeout=DEFAULT_TIMEOUT_SECONDS)
        if r.status_code == 200:
            circuito_abierto_usuarios = False
            fallos_usuarios = 0
            print("[usuarios] Recuperación OK → circuito cerrado.", flush=True)
            return r.json()
    except Exception as ex:
        print(f"[usuarios] Fallo en intento de recuperación: {ex}", flush=True)
    print("[usuarios] Recuperación fallida → circuito permanece abierto.", flush=True)
    return None

def _intentar_recuperacion_backend():
    global fallos_backend, circuito_abierto_backend
    time.sleep(RECOVERY_WAIT_SECONDS)
    print(
        f"[mascotas/backend] Espera controlada ({RECOVERY_WAIT_SECONDS}s): nuevo intento de conexión…",
        flush=True,
    )
    try:
        r = requests.get("http://backend:5000/mascotas", timeout=DEFAULT_TIMEOUT_SECONDS)
        if r.status_code == 200:
            circuito_abierto_backend = False
            fallos_backend = 0
            print("[mascotas/backend] Recuperación OK → circuito cerrado.", flush=True)
            return r.json()
    except Exception as ex:
        print(f"[mascotas/backend] Fallo en intento de recuperación: {ex}", flush=True)
    print("[mascotas/backend] Recuperación fallida → circuito permanece abierto.", flush=True)
    return None

@app.route("/usuarios")
def usuarios():
    global fallos_usuarios, circuito_abierto_usuarios
    if circuito_abierto_usuarios:
        data = _intentar_recuperacion_usuarios()
        if data is not None:
            return jsonify(data)
        return {"Error:": "Servicio temporalmente no disponible"}, 503
    try:
        response = requests.get("http://usuarios:5000/usuarios", timeout=10)
        fallos_usuarios = 0
        return jsonify(response.json())
    except:
        fallos_usuarios += 1
        print(f"Fallo numero {fallos_usuarios} de 3", flush=True)
        if fallos_usuarios >= 3:
            circuito_abierto_usuarios = True
            print("Circuito abierto", flush=True)
        return {"error": "Servicio no disponible"}, 503

@app.route("/mascotas")
def mascotas():
    global fallos_backend, circuito_abierto_backend
    if circuito_abierto_backend:
        data = _intentar_recuperacion_backend()
        if data is not None:
            return jsonify(data)
        return {"Error:": "Servicio temporalmente no disponible"}, 503
    try:
        inicio = time.time()
        print("[GATEWAT],Consultando el servicio de mascotas", flush=True)
        response = requests.get("http://backend:5000/mascotas", timeout=10)
        fallos_backend = 0
        fin = time.time()
        print(f"[INFO] Tiempo de respuesta: {fin-inicio}", flush= True)
        return jsonify(response.json())
    except: 
        fallos_backend += 1
        print(f"Fallo numero {fallos_backend} de 3", flush=True)
        if fallos_backend >= 3:
            circuito_abierto_backend = True
            print("Circuito abierto", flush=True)
        return {"error": "Servicio no disponible"}, 503

@app.route("/mascotas/<int:mascota_id>")
def mascota_por_id(mascota_id: int):
    for i in range(3):
        try:
            response = requests.get("http://backend:5000/mascotas", timeout=10)
            if response.status_code != 200:
                return jsonify({"error": "Error en backend"}), response.status_code

            payload = response.json() or {}
            mascotas = payload.get("Mascotas")

            if not mascotas:
                return jsonify({"error": "No hay datos"}), 404

            # backend devuelve lista de tuplas: [ [id, nombre, tipo], ... ]
            for m in mascotas:
                try:
                    if int(m[0]) == mascota_id:
                        return jsonify({"id": m[0], "nombre": m[1], "tipo": m[2]})
                except (TypeError, ValueError, IndexError):
                    continue

            return jsonify({"error": "Mascota no encontrada"}), 404

        except requests.exceptions.Timeout:
            return jsonify({"error": "Tiempo de espera agotado"}), 503
        except requests.exceptions.ConnectionError:
            print(f"[GATEWAY], backend caído intento: {i+1}", flush=True)

    return jsonify({"error": "Servicio no responde"}), 504

@app.route("/resumen")
def resumen():
    global fallos_usuarios, circuito_abierto_usuarios, fallos_backend, circuito_abierto_backend

    msg_usuarios = "Servicio no disponible por parte de usuarios"
    msg_mascotas = "Servicio no disponible por parte de mascotas"
    payload = {}

    if circuito_abierto_usuarios:
        data_u = _intentar_recuperacion_usuarios()
        if data_u is not None:
            payload["usuarios"] = data_u
        else:
            payload["error_usuarios"] = msg_usuarios
    else:
        try:
            usuarios_resp = requests.get("http://usuarios:5000/usuarios", timeout=10)
            if usuarios_resp.status_code != 200:
                payload["error_usuarios"] = msg_usuarios
            else:
                fallos_usuarios = 0
                payload["usuarios"] = usuarios_resp.json()
        except:
            fallos_usuarios += 1
            print(f"Fallo numero {fallos_usuarios} de 3", flush=True)
            if fallos_usuarios >= 3:
                circuito_abierto_usuarios = True
                print("Circuito abierto", flush=True)
            payload["error_usuarios"] = msg_usuarios

    if circuito_abierto_backend:
        data_m = _intentar_recuperacion_backend()
        if data_m is not None:
            mascotas_payload = data_m or {}
            payload["mascotas"] = mascotas_payload.get("Mascotas", [])
        else:
            payload["error_mascotas"] = msg_mascotas
    else:
        try:
            mascotas_resp = requests.get("http://backend:5000/mascotas", timeout=10)
            if mascotas_resp.status_code != 200:
                payload["error_mascotas"] = msg_mascotas
            else:
                fallos_backend = 0
                mascotas_payload = mascotas_resp.json() or {}
                payload["mascotas"] = mascotas_payload.get("Mascotas", [])
        except:
            fallos_backend += 1
            print(f"Fallo numero {fallos_backend} de 3", flush=True)
            if fallos_backend >= 3:
                circuito_abierto_backend = True
                print("Circuito abierto", flush=True)
            payload["error_mascotas"] = msg_mascotas

    tiene_usuarios = "usuarios" in payload
    tiene_mascotas = "mascotas" in payload
    if not tiene_usuarios and not tiene_mascotas:
        return jsonify(payload), 503
    return jsonify(payload), 200


# =============================================================================
# Endpoint: /health  -  Healthcheck agregado del gateway
# -----------------------------------------------------------------------------
# Expone un único punto de monitoreo que combina:
#   - Disponibilidad de las dependencias (backend y usuarios)
#   - Latencia total de la verificación
#   - Estado actual del circuit breaker de cada servicio
# Devuelve 200 si todas las dependencias responden OK, 503 en caso contrario.
# =============================================================================
@app.route("/health")
def health():
    """Monitoreo agregado: dependencias, tiempos, circuit breaker y detección de caídas."""
    global fallos_backend, fallos_usuarios, circuito_abierto_backend, circuito_abierto_usuarios

    # --- 1. Medición de tiempo total y sondeo de dependencias --------------
    inicio = time.time()
    backend = _probe_health("http://backend:5000/health", "backend")
    usuarios = _probe_health("http://usuarios:5000/health", "usuarios")
    fin = time.time()
    tiempo_total_ms = round((fin - inicio) * 1000, 2)

    # --- 2. Evaluación global del estado -----------------------------------
    deps_ok = backend["estado"] == "up" and usuarios["estado"] == "up"
    print(
        f"[MONITOR] gateway /health overall={'ok' if deps_ok else 'down'} "
        f"response_time_ms={tiempo_total_ms}",
        flush=True,
    )

    # --- 3. Construcción del payload de respuesta --------------------------
    payload = {
        "status": "ok" if deps_ok else "down",
        "service": "gateway",
        "response_time_ms": tiempo_total_ms,
        "dependencies": {"backend": backend, "usuarios": usuarios},
        "circuit_breaker": {
            "backend": {
                "abierto": circuito_abierto_backend,
                "fallos_consecutivos": fallos_backend,
            },
            "usuarios": {
                "abierto": circuito_abierto_usuarios,
                "fallos_consecutivos": fallos_usuarios,
            },
        },
    }

    # --- 4. Código HTTP según salud agregada -------------------------------
    code = 200 if deps_ok else 503
    return jsonify(payload), code


# =============================================================================
# Endpoint: /estado/backend  -  Healthcheck puntual del servicio de backend
# -----------------------------------------------------------------------------
# Wrapper simple sobre /health del backend con timeout corto (3s) para
# diagnósticos rápidos. Mide latencia incluso cuando la llamada falla.
# =============================================================================
@app.route("/estado/backend")
def estado_backend():
    # `inicio` se define fuera del try para que también esté disponible
    # en el except si la propia llamada falla en su primera instrucción.
    inicio = time.time()
    try:
        # --- Camino feliz: backend responde --------------------------------
        print("[GATEWAT],Consultando el servicio de health del backend", flush=True)
        response = requests.get("http://backend:5000/health", timeout=3)
        fin = time.time()
        print(f"[INFO] Tiempo de respuesta: {fin-inicio}", flush=True)
        return jsonify(response.json())
    except Exception:
        # --- Camino de error: timeout / conexión rechazada / etc. ----------
        fin = time.time()
        print("[GATEWAT],Fallo al consultar el health del backend", flush=True)
        print(f"[INFO] Tiempo de respuesta: {fin-inicio}", flush=True)
        return jsonify({"status": "down"}), 503


# =============================================================================
# Bootstrap de la aplicación
# -----------------------------------------------------------------------------
# Solo se ejecuta cuando el archivo se invoca directamente (no al importarlo).
# Escucha en 0.0.0.0 para ser accesible desde otros contenedores de la red.
# =============================================================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)