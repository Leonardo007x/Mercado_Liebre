import express from "express";
import cors from "cors";
import { initDb, pool } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/menu", (req, res) => {
  res.json([
    { id: 1, nombre: "Entrada de la casa", precio: 8.5 },
    { id: 2, nombre: "Plato fuerte especial", precio: 18.9 },
    { id: 3, nombre: "Postre gourmet", precio: 6.0 },
  ]);
});

app.post("/api/reservas", async (req, res) => {
  try {
    const {
      fecha,
      horaInicio,
      horaFin,
      comensales,
      clienteNombre,
      clienteEmail,
    } = req.body;

    if (
      !fecha ||
      !horaInicio ||
      !horaFin ||
      !comensales ||
      !clienteNombre ||
      !clienteEmail
    ) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    // Reglas de agenda:
    // - No permitir reservar antes de hoy (comparación por fecha ISO)
    // - Solo permitir entre 2026-03-19 y 2026-04-19 (incluidos)
    // - Hora inicio entre 11:00 y 16:00 (incluidos)
    // - Hora fin se calcula automáticamente (+1h) para evitar manipulación
    const hoyISO = new Date().toISOString().slice(0, 10);
    if (fecha < hoyISO) {
      return res
        .status(400)
        .json({ error: "No se puede agendar una reserva antes de hoy." });
    }
    if (fecha < "2026-03-19" || fecha > "2026-04-19") {
      return res.status(400).json({
        error: "Solo se aceptan reservas desde el 19 de marzo hasta el 19 de abril.",
      });
    }

    const [hStr, mStr] = String(horaInicio).split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr ?? "0", 10);
    if (Number.isNaN(h) || Number.isNaN(m)) {
      return res.status(400).json({ error: "Hora inicio inválida." });
    }
    const minutosInicio = h * 60 + m;
    if (minutosInicio < 11 * 60 || minutosInicio > 16 * 60) {
      return res.status(400).json({
        error: "La hora de inicio debe estar entre 11:00 y 16:00.",
      });
    }

    const minutosFin = minutosInicio + 60;
    const horaFinCalc = `${String(Math.floor(minutosFin / 60)).padStart(
      2,
      "0"
    )}:${String(minutosFin % 60).padStart(2, "0")}`;

    // Comprobar que la fecha esté en la tabla de días disponibles
    const diaDisponible = await pool.query(
      "SELECT 1 FROM dias_disponibles WHERE fecha = $1",
      [fecha]
    );

    if (diaDisponible.rowCount === 0) {
      return res
        .status(400)
        .json({
          error:
            "Solo se aceptan reservas en los días habilitados en el calendario.",
        });
    }

    const mesasDisponibles = await pool.query(
      `
      SELECT m.id
      FROM mesas m
      WHERE m.capacidad >= $1
      AND m.id NOT IN (
        SELECT r.mesa_id
        FROM reservas r
        WHERE r.fecha = $2
        AND r.estado = 'confirmada'
        AND NOT ($3 >= r.hora_fin OR $4 <= r.hora_inicio)
      )
      ORDER BY m.capacidad ASC
      LIMIT 1;
    `,
      [comensales, fecha, horaInicio, horaFinCalc]
    );

    if (mesasDisponibles.rowCount === 0) {
      return res
        .status(409)
        .json({ error: "No hay mesas disponibles para ese horario" });
    }

    const mesaId = mesasDisponibles.rows[0].id;

    const insert = await pool.query(
      `
      INSERT INTO reservas (
        mesa_id, cliente_nombre, cliente_email,
        fecha, hora_inicio, hora_fin, comensales, estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmada')
      RETURNING *;
    `,
      [
        mesaId,
        clienteNombre,
        clienteEmail,
        fecha,
        horaInicio,
        horaFinCalc,
        comensales,
      ]
    );

    res.json({ reserva: insert.rows[0], mensaje: "Reserva confirmada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al procesar la reserva" });
  }
});

app.get("/api/reservas", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT r.*, m.nombre AS mesa_nombre
      FROM reservas r
      JOIN mesas m ON r.mesa_id = m.id
      ORDER BY fecha, hora_inicio;
    `
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener reservas" });
  }
});

const PORT = process.env.PORT || 3001;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend de reservas escuchando en puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error inicializando la base de datos:", err);
    process.exit(1);
  });

