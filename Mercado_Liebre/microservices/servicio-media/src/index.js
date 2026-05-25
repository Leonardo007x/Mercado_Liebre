/**
 * Microservicio Media — punto de entrada.
 *
 * Dominio: subida de archivos (imágenes) y auditoría en BD propia.
 * Integración: Cloudinary (SaaS externo) detrás de circuit breaker.
 */

const { logServiceBoot, logServiceReady } = require('@mercadoliebre/resilience');
const { PORT, SERVICE_NAME } = require('./config');
const { logger } = require('./logger');
const { createPool, waitForDb } = require('./db');
const { initCloudinary } = require('./clients/cloudinary.client');
const { createApp } = require('./app');

async function bootstrap() {
  try {
    logServiceBoot(logger, SERVICE_NAME);
    const pool = createPool();
    await waitForDb(pool);

    let cloudinaryEnabled = initCloudinary();
    const isCloudinaryEnabled = () => cloudinaryEnabled;

    const app = createApp({ pool, isCloudinaryEnabled });
    app.listen(PORT, () => {
      logServiceReady(logger, {
        serviceName: SERVICE_NAME,
        port: PORT,
        details: { cloudinary_enabled: cloudinaryEnabled },
      });
    });
  } catch (e) {
    logger.error({ err: e?.message }, '[media] Arranque abortado.');
    process.exit(1);
  }
}

bootstrap();
