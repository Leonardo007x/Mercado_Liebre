/** Aplicación Express del servicio Tiendas: middlewares + montaje de rutas. */

const express = require('express');
const cors = require('cors');
const requestId = require('./middleware/requestId');
const { httpLogger, httpErrorLogger, logger } = require('./logger');
const { registerApiErrorHandlers } = require('@mercadoliebre/resilience');
const createInternalRouter = require('./routes/internal.routes');
const createTiendasRouter = require('./routes/tiendas.routes');
const createTemasRouter = require('./routes/temas.routes');
const createHealthRouter = require('./routes/health.routes');

function createApp({ pool }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(requestId);
  app.use(httpLogger);
  app.use(httpErrorLogger);

  // Endpoints servicio-a-servicio (NO expuestos al cliente final).
  app.use('/internal', createInternalRouter({ pool }));

  // Endpoints públicos / autenticados.
  app.use('/api/tiendas', createTiendasRouter({ pool }));
  app.use('/api/temas', createTemasRouter({ pool }));
  app.use('/api', createHealthRouter({ pool }));

  registerApiErrorHandlers(app, logger);

  return app;
}

module.exports = { createApp };
