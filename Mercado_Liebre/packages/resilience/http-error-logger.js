/**
 * Middleware Express: registra en consola cada respuesta HTTP 4xx/5xx
 * con el detalle exacto enviado al cliente (campo error, message, etc.).
 */

function extractErrorDetail(body) {
  if (body == null) return 'sin detalle en el cuerpo de la respuesta';
  if (typeof body === 'string') return body.slice(0, 500);
  if (body.error) return String(body.error);
  if (body.message) return String(body.message);
  try {
    return JSON.stringify(body).slice(0, 500);
  } catch {
    return 'respuesta no serializable';
  }
}

/**
 * @param {import('pino').Logger} logger Logger del servicio (fallback si req.log no existe).
 */
function createHttpErrorLogger(logger) {
  return function httpErrorLogger(req, res, next) {
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    function logIfError(body) {
      const code = res.statusCode;
      if (code < 400) return;

      const detail = extractErrorDetail(body);
      const log = req.log || logger;
      const url = req.originalUrl || req.url;
      const payload = {
        event: 'http_error',
        http_status: code,
        method: req.method,
        url,
        detail,
        requestId: req.requestId,
      };
      const msg = `[HTTP ${code}] ${req.method} ${url} — ${detail}`;

      if (code >= 500) log.error(payload, msg);
      else log.warn(payload, msg);
    }

    res.json = function jsonWithLog(body) {
      logIfError(body);
      return originalJson(body);
    };

    res.send = function sendWithLog(body) {
      logIfError(body);
      return originalSend(body);
    };

    next();
  };
}

module.exports = {
  createHttpErrorLogger,
  extractErrorDetail,
};
