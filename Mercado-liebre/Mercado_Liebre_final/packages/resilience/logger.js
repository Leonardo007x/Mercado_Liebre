/**
 * Logger compartido: Pino + pino-http con salida JSON (prod) o legible (dev/Docker).
 *
 * LOG_FORMAT=pretty  → líneas de texto en consola (docker compose logs).
 * LOG_FORMAT=json    → una línea JSON por evento (producción / agregadores).
 */

const pino = require('pino');
const pinoHttp = require('pino-http');

function resolveLogFormat(explicit) {
  const v = String(explicit || process.env.LOG_FORMAT || 'pretty').toLowerCase();
  if (v === 'pretty' || v === 'dev' || v === 'human') return 'pretty';
  return 'json';
}

/**
 * @param {{ serviceName: string, level?: string, format?: string }} opts
 */
function createServiceLogger({ serviceName, level = 'info', format }) {
  const logFormat = resolveLogFormat(format);
  const base = { service: serviceName };

  if (logFormat === 'pretty') {
    const pretty = require('pino-pretty');
    const stream = pretty({
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname',
      singleLine: true,
      messageFormat: '{service} | {msg}',
    });
    return pino({ level, base }, stream);
  }

  return pino({ level, base });
}

const httpSerializers = {
  req: (req) => ({
    method: req.method,
    url: req.url,
  }),
  res: (res) => ({
    statusCode: res.statusCode,
  }),
};

/**
 * @param {{ logger: import('pino').Logger, genReqId?: Function, customProps?: Function }} opts
 */
function httpStatusLabel(code) {
  if (code >= 500) return 'error interno del servidor';
  if (code === 404) return 'recurso no encontrado';
  if (code === 403) return 'acceso denegado';
  if (code === 401) return 'no autenticado';
  if (code === 400) return 'solicitud inválida';
  if (code === 409) return 'conflicto';
  if (code === 503) return 'servicio no disponible';
  if (code >= 400) return 'solicitud rechazada';
  return 'OK';
}

function createHttpLogger({ logger, genReqId, customProps }) {
  return pinoHttp({
    logger,
    serializers: httpSerializers,
    genReqId: genReqId || ((req) => req.requestId),
    customProps,
    customLogLevel(_req, res, err) {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage(req, res, responseTime) {
      const code = res.statusCode;
      const line = `${req.method} ${req.url}`;
      if (code >= 400) {
        return `[HTTP ${code}] ${line} — ${httpStatusLabel(code)} (${responseTime}ms)`;
      }
      return `${line} → ${code} OK (${responseTime}ms)`;
    },
    customErrorMessage(req, res, err) {
      return `[HTTP ${res.statusCode}] ${req.method} ${req.url} — excepción: ${err?.message || 'desconocida'}`;
    },
  });
}

/**
 * @param {{ serviceName: string, level?: string, format?: string, genReqId?: Function, customProps?: Function }} opts
 */
function createServiceLoggerBundle(opts) {
  const logger = createServiceLogger(opts);
  const httpLogger = createHttpLogger({
    logger,
    genReqId: opts.genReqId,
    customProps: opts.customProps,
  });
  const { createHttpErrorLogger } = require('./http-error-logger');
  const httpErrorLogger = createHttpErrorLogger(logger);
  return { logger, httpLogger, httpErrorLogger };
}

module.exports = {
  resolveLogFormat,
  httpStatusLabel,
  createServiceLogger,
  createHttpLogger,
  createServiceLoggerBundle,
};
