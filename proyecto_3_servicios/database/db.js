import pkg from "pg";

const { Pool } = pkg;

export const pool = new Pool({
  host: "database",
  port: 5432,
  user: "postgres",
  password: "postgres",
  database: "reservas",
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mesas (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(50) NOT NULL,
      capacidad INT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservas (
      id SERIAL PRIMARY KEY,
      mesa_id INT REFERENCES mesas(id),
      cliente_nombre VARCHAR(100) NOT NULL,
      cliente_email VARCHAR(150) NOT NULL,
      fecha DATE NOT NULL,
      hora_inicio TIME NOT NULL,
      hora_fin TIME NOT NULL,
      comensales INT NOT NULL,
      estado VARCHAR(20) NOT NULL DEFAULT 'confirmada'
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS dias_disponibles (
      fecha DATE PRIMARY KEY
    );
  `);

  const result = await pool.query("SELECT COUNT(*) FROM mesas");
  if (parseInt(result.rows[0].count, 10) === 0) {
    await pool.query(
      "INSERT INTO mesas (nombre, capacidad) VALUES ('Mesa 1', 2), ('Mesa 2', 4), ('Mesa 3', 4), ('Mesa 4', 6)"
    );
  }

  await pool.query(
    `
      INSERT INTO dias_disponibles (fecha)
      VALUES ('2026-03-19'), ('2026-03-23'), ('2026-03-24'), ('2026-03-25'),
             ('2026-03-26'), ('2026-03-30'), ('2026-03-31'), ('2026-04-01'),
             ('2026-04-02'), ('2026-04-06'), ('2026-04-07'), ('2026-04-08'),
             ('2026-04-10'), ('2026-04-13'), ('2026-04-19')
      ON CONFLICT (fecha) DO NOTHING;
    `
  );
}

