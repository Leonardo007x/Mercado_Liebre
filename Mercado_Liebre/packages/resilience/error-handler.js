/**
 * Manejadores globales de Express: rutas inexistentes y errores 500 no capturados.
 * Garantiza que toda respuesta de error del microservicio sea JSON.
 */

/**
 * @param {import('pino').Logger} [logger]
 */
function createNotFoundHandler(logger) {
  return (req, res) => {
    const log = req.log || logger;
    log?.warn(
      { event: 'http_error', http_status: 404, url: req.originalUrl || req.url },
      `[HTTP 404] ${req.method} ${req.originalUrl || req.url} — ruta no encontrada`
    );
    res.status(404).json({
      error: 'Ruta no encontrada',
      status: 404,
      path: req.originalUrl || req.url,
      requestId: req.requestId,
    });
  };
}

/**
 * @param {import('pino').Logger} [logger]
 */
function createErrorHandler(logger) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, _next) => {
    const log = req.log || logger;
    log?.error(
      { event: 'http_error', http_status: 500, err: err?.message, url: req.originalUrl || req.url },
      `[HTTP 500] ${req.method} ${req.originalUrl || req.url} — error no manejado: ${err?.message || 'desconocido'}`
    );

    if (res.headersSent) return;

    res.status(500).json({
      error: 'Error interno del servidor',
      status: 500,
      detail: err?.message || 'Error desconocido',
      requestId: req.requestId,
    });
  };
}

/**
 * Registra 404 + manejador global de errores al final de la app Express.
 * @param {import('express').Application} app
 * @param {import('pino').Logger} [logger]
 */
function registerApiErrorHandlers(app, logger) {
  app.use(createNotFoundHandler(logger));
  app.use(createErrorHandler(logger));
}

module.exports = {
  createNotFoundHandler,
  createErrorHandler,
  registerApiErrorHandlers,
};
