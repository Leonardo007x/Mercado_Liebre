/** Aplicación Express del servicio IA. */
const express = require('express');
const cors = require('cors');
const requestId = require('./middleware/requestId');
const { httpLogger, httpErrorLogger, logger } = require('./logger');
const { registerApiErrorHandlers } = require('@mercadoliebre/resilience');
const createIaRouter = require('./routes/ia.routes');
const createHealthRouter = require('./routes/health.routes');

function createApp({ pool }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(requestId);
  app.use(httpLogger);
  app.use(httpErrorLogger);

  app.use('/api/ia', createIaRouter({ pool }));
  app.use('/api', createHealthRouter({ pool }));

  registerApiErrorHandlers(app, logger);

  return app;
}

module.exports = { createApp };
