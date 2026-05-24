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
function createHttpLogger({ logger, genReqId, customProps }) {
  return pinoHttp({
    logger,
    serializers: httpSerializers,
    genReqId: genReqId || ((req) => req.requestId),
    customProps,
    customSuccessMessage(req, res, responseTime) {
      return `${req.method} ${req.url} → ${res.statusCode} (${responseTime}ms)`;
    },
    customErrorMessage(req, res, err) {
      return `${req.method} ${req.url} → error ${res.statusCode}: ${err?.message || 'unknown'}`;
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
  return { logger, httpLogger };
}

module.exports = {
  resolveLogFormat,
  createServiceLogger,
  createHttpLogger,
  createServiceLoggerBundle,
};
