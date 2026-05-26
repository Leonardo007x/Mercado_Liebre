from flask import Flask, jsonify
import time

app = Flask(__name__)


@app.route("/health")
def health():
    inicio = time.time()
    fin = time.time()
    latency_ms = round((fin - inicio) * 1000, 2)
    print(f"[MONITOR] usuarios /health latency_ms={latency_ms}", flush=True)
    return jsonify(
        {
            "status": "ok",
            "service": "usuarios",
            "latency_ms": latency_ms,
        }
    )


@app.route("/usuarios")
def usuarios():
    return jsonify([
        {"id": 1, "nombre": "Ana"},
        {"id": 2, "nombre": "Luis"}
    ])
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)