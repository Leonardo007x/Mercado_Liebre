/**
 * Construye la aplicación Express con middlewares y rutas montadas.
 *
 * Patrón factoría: recibe el `pool` ya creado para que pueda ser inyectado
 * en cada router. Esto evita estado global y facilita pruebas.
 */

const express = require('express');
const cors = require('cors');
const requestId = require('./middleware/requestId');
const { httpLogger, httpErrorLogger, logger } = require('./logger');
const { registerApiErrorHandlers } = require('@mercadoliebre/resilience');
const createProductosRouter = require('./routes/productos.routes');
const createHealthRouter = require('./routes/health.routes');

function createApp({ pool }) {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(requestId);
  app.use(httpLogger);
  app.use(httpErrorLogger);

  app.use('/api/productos', createProductosRouter({ pool }));
  app.use('/api', createHealthRouter({ pool }));

  registerApiErrorHandlers(app, logger);

  return app;
}

module.exports = { createApp };
