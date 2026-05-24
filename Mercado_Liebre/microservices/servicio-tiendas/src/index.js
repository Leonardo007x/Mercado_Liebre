/**
 * Microservicio Tiendas — punto de entrada.
 *
 * Dominio: tiendas + temas (BD propia). Expone:
 *   - API pública/autenticada bajo `/api/*`.
 *   - API servicio-a-servicio bajo `/internal/*` (token compartido).
 *
 * Integración: consume `catalogo-service` para la vista pública, protegida
 * por circuit breaker `tiendas-catalogo-productos`.
 */

const { logServiceBoot, logServiceReady } = require('@mercadoliebre/resilience');
const { PORT, SERVICE_NAME, CATALOGO_SERVICE_URL } = require('./config');
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
        details: { catalogo_url: CATALOGO_SERVICE_URL },
      });
    });
  } catch (e) {
    logger.error({ err: e?.message }, '[tiendas] Arranque abortado.');
    process.exit(1);
  }
}

bootstrap();
