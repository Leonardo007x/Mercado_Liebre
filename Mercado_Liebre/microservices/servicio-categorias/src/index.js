/**
 * Microservicio Categorías — punto de entrada.
 *
 * Dominio: CRUD de categorías por tienda (BD propia).
 * Integración: ownership distribuida vía `tiendas-service` con circuit breaker.
 */

const { logServiceBoot, logServiceReady } = require('@mercadoliebre/resilience');
const { PORT, SERVICE_NAME, TIENDAS_SERVICE_URL } = require('./config');
const { logger } = require('./logger');
const { createPool, waitForDb } = require('./db');
const { createApp } = require('./app');

async function bootstrap() {
  try {
    logServiceBoot(logger, SERVICE_NAME);
    const pool = createPool();
    await waitForDb(pool);

    const app = createApp({ pool });
    app.listen(PORT, () => {
      logServiceReady(logger, {
        serviceName: SERVICE_NAME,
        port: PORT,
        details: { tiendas_url: TIENDAS_SERVICE_URL },
      });
    });
  } catch (e) {
    logger.error({ err: e?.message }, '[categorias] Arranque abortado.');
    process.exit(1);
  }
}

bootstrap();
