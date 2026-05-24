/** Logger del servicio (Pino legible o JSON según LOG_FORMAT). */

const { createServiceLoggerBundle } = require('@mercadoliebre/resilience');
const { LOG_LEVEL, SERVICE_NAME, LOG_FORMAT } = require('./config');

const { logger, httpLogger, httpErrorLogger } = createServiceLoggerBundle({
  serviceName: SERVICE_NAME,
  level: LOG_LEVEL,
  format: LOG_FORMAT,
  genReqId: (req) => req.requestId,
  customProps: (req) => ({ requestId: req.requestId }),
});

module.exports = { logger, httpLogger, httpErrorLogger };
