/**
 * Mensajes de arranque uniformes para todos los microservicios.
 * Visibles en consola con LOG_FORMAT=pretty (docker compose logs -f).
 */

/**
 * @param {import('pino').Logger} logger
 * @param {string} serviceName
 */
function logServiceBoot(logger, serviceName) {
  logger.info(
    { event: 'service_boot', service: serviceName },
    `[inicio] Arrancando ${serviceName}...`
  );
}

/**
 * @param {import('pino').Logger} logger
 * @param {{ serviceName: string, port: number|string, details?: Record<string, unknown> }} opts
 */
function logServiceReady(logger, { serviceName, port, details = {} }) {
  const detailStr = Object.entries(details)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  const suffix = detailStr ? ` | ${detailStr}` : '';

  logger.info(
    { event: 'service_started', service: serviceName, port, ...details },
    `[OK] Servicio iniciado correctamente: ${serviceName} escuchando en puerto ${port}${suffix}`
  );
}

module.exports = {
  logServiceBoot,
  logServiceReady,
};
