/** Aplicación Express del servicio Media. */
const express = require('express');
const cors = require('cors');
const requestId = require('./middleware/requestId');
const { httpLogger, httpErrorLogger, logger } = require('./logger');
const { registerApiErrorHandlers } = require('@mercadoliebre/resilience');
const createMediaRouter = require('./routes/media.routes');
const createHealthRouter = require('./routes/health.routes');

function createApp({ pool, isCloudinaryEnabled }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(requestId);
  app.use(httpLogger);
  app.use(httpErrorLogger);

  app.use('/api/media', createMediaRouter({ pool, isCloudinaryEnabled }));
  app.use('/api', createHealthRouter({ pool, isCloudinaryEnabled }));

  registerApiErrorHandlers(app, logger);

  return app;
}

module.exports = { createApp };
