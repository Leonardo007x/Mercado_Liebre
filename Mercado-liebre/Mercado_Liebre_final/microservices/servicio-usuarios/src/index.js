/**
 * Microservicio Usuarios — punto de entrada.
 *
 * Dominio: única fuente de verdad para credenciales/identidad (tabla `usuarios`).
 * Resiliencia: todas las consultas pasan por un circuit breaker sobre MySQL.
 */

const { logServiceBoot, logServiceReady } = require('@mercadoliebre/resilience');
const { PORT, SERVICE_NAME, INSTANCE_ID } = require('./config');
const { logger } = require('./logger');
const { createPool, waitForDb, ensureUsuariosPasswordHash } = require('./db');
const { createApp } = require('./app');

async function bootstrap() {
  try {
    logServiceBoot(logger, SERVICE_NAME);
    const pool = createPool();
    await waitForDb(pool);
    await ensureUsuariosPasswordHash(pool);

    const app = createApp({ pool });
    app.listen(PORT, () => {
      logServiceReady(logger, {
        serviceName: SERVICE_NAME,
        port: PORT,
        details: { instance_id: INSTANCE_ID },
      });
    });
  } catch (e) {
    logger.error({ err: e?.message }, '[usuarios] Arranque abortado.');
    process.exit(1);
  }
}

bootstrap();
