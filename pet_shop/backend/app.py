from flask import Flask, request, jsonify
import mysql.connector
import os
import time

import requests

app = Flask(__name__)

def get_connection():
    return mysql.connector.connect(
      host = os.getenv("DB_HOST"),
      user = os.getenv("DB_USER"),
      password = os.getenv("DB_PASSWORD"),
      database = os.getenv("DB_NAME")  
    )
@app.route("/relacion")
def relacion():
    connection = get_connection()
    cursor= connection.cursor()
    cursor.execute("SELECT nombre FROM mascotas")
    mascota = cursor.fetchall()
    connection.close()
    usuarios= requests.get("http://usuarios:5000/usuarios").json()

    nombre_usuario= usuarios[0]["nombre"] if usuarios else "Sin usuario"
    nombre_mascota = mascota[0] if mascota else "Sin mascota"
    return {
        "usuario": nombre_usuario,
        "mascota": nombre_mascota
    }

@app.route("/")
def home():
    return "API FUNCIONANDO"

@app.route("/mascotas", methods= ["POST"])
def crear_mascota():
    data= request.json
    conection = get_connection()
    cursor = conection.cursor()
    cursor.execute(
        "INSERT INTO mascotas (nombre, tipo), VALUES (%s, %s)",
        (data["nombre"], data["tipo"])
    )
    conection.commit()
    conection.close()
    return {"mensaje": "Mascota creada"}

@app.route("/mascotas", methods=["GET"])
def obtener_mascotas():
    conection= get_connection()
    cursor= conection.cursor()
    cursor.execute("SELECT * FROM mascotas")
    mascotas= cursor.fetchall()
    conection.close()
    print("[mascotas], consultando mascotas", flush=True)
    return jsonify({"Mascotas": mascotas})

@app.route("/health")
def health():
    """Liveness + dependencia MySQL; tiempo de respuesta y logs para monitoreo."""
    inicio = time.time()
    db_ok = False
    db_error = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        cur.close()
        conn.close()
        db_ok = True
    except Exception as ex:
        db_error = str(ex)
    fin = time.time()
    latency_ms = round((fin - inicio) * 1000, 2)
    estado_db = "ok" if db_ok else "error"
    print(
        f"[MONITOR] backend /health database={estado_db} latency_ms={latency_ms}",
        flush=True,
    )
    if not db_ok:
        return jsonify(
            {
                "status": "down",
                "service": "backend",
                "latency_ms": latency_ms,
                "database": estado_db,
                "error": db_error,
            }
        ), 503
    return jsonify(
        {
            "status": "ok",
            "service": "backend",
            "latency_ms": latency_ms,
            "database": estado_db,
        }
    )

if __name__ == "__main__":
    app.run(host="0.0.0.0", port= 5000, debug=True)

