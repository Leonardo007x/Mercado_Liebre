/**
 * Agregador de monitoreo del gateway.
 * Consulta health + breakers de todos los microservicios en paralelo,
 * aunque algunos estén caídos (reachable: false).
 */

const http = require('http');

const PORT = Number(process.env.HEALTH_AGGREGATOR_PORT || 9090);
const TIMEOUT_MS = Number(process.env.HEALTH_PROBE_TIMEOUT_MS || 3500);

/** Servicios lógicos a monitorear (red Docker interna). */
const SERVICE_TARGETS = [
  { id: 'usuarios-1', label: 'usuarios', host: 'usuarios-service', port: Number(process.env.USUARIOS_SERVICE_PORT || 3001) },
  { id: 'usuarios-2', label: 'usuarios', host: 'usuarios-service-2', port: Number(process.env.USUARIOS_SERVICE_PORT || 3001), replica: true },
  { id: 'tiendas', label: 'tiendas', host: 'tiendas-service', port: Number(process.env.TIENDAS_SERVICE_PORT || 3002) },
  { id: 'catalogo', label: 'catalogo', host: 'catalogo-service', port: Number(process.env.CATALOGO_SERVICE_PORT || 3003) },
  { id: 'media', label: 'media', host: 'media-service', port: Number(process.env.MEDIA_SERVICE_PORT || 3004) },
  { id: 'categorias', label: 'categorias', host: 'categorias-service', port: Number(process.env.CATEGORIAS_SERVICE_PORT || 3005) },
  { id: 'ia', label: 'ia', host: 'ia-service', port: Number(process.env.IA_SERVICE_PORT || 3006) },
];

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    return {
      ok: res.ok,
      http_status: res.status,
      latency_ms: Date.now() - t0,
      data,
    };
  } catch (err) {
    return {
      ok: false,
      http_status: null,
      latency_ms: Date.now() - t0,
      error: err?.name === 'AbortError' ? 'timeout' : (err?.message || 'fetch_failed'),
      data: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function probeService(target) {
  const base = `http://${target.host}:${target.port}`;
  const [health, breakers] = await Promise.all([
    fetchJson(`${base}/api/health`, TIMEOUT_MS),
    fetchJson(`${base}/api/health/breakers`, TIMEOUT_MS),
  ]);

  const reachable = health.http_status != null || breakers.http_status != null;
  const healthStatus = health.data?.status || (reachable ? 'unknown' : 'unreachable');

  return {
    id: target.id,
    label: target.label,
    host: `${target.host}:${target.port}`,
    replica: !!target.replica,
    reachable,
    health: {
      http_status: health.http_status,
      latency_ms: health.latency_ms,
      status: reachable ? healthStatus : 'unreachable',
      error: health.error || null,
      payload: health.data,
    },
    breakers: {
      http_status: breakers.http_status,
      latency_ms: breakers.latency_ms,
      error: breakers.error || null,
      payload: breakers.data,
    },
  };
}

function buildSummary(services) {
  const logical = {};
  for (const s of services) {
    const key = s.label;
    if (!logical[key]) {
      logical[key] = { reachable: false, status: 'unreachable' };
    }
    if (s.reachable) {
      logical[key].reachable = true;
      const st = s.health.payload?.status || s.health.status;
      if (st === 'down') logical[key].status = 'down';
      else if (st === 'degraded' && logical[key].status !== 'down') logical[key].status = 'degraded';
      else if (logical[key].status === 'unreachable') logical[key].status = st || 'ok';
    }
  }

  const values = Object.values(logical);
  return {
    services_logical: Object.keys(logical).length,
    targets_polled: services.length,
    reachable: values.filter((v) => v.reachable).length,
    unreachable: values.filter((v) => !v.reachable).length,
    ok: values.filter((v) => v.status === 'ok').length,
    degraded: values.filter((v) => v.status === 'degraded').length,
    down: values.filter((v) => v.status === 'down').length,
    by_service: logical,
  };
}

async function handleHealthAll(_req, res) {
  const results = await Promise.all(SERVICE_TARGETS.map((t) => probeService(t)));
  const summary = buildSummary(results);

  let overall = 'ok';
  if (summary.unreachable > 0 || summary.down > 0) overall = 'degraded';
  if (summary.reachable === 0) overall = 'down';

  const payload = {
    monitored_by: 'gateway-health-aggregator',
    gateway: { status: 'ok', endpoint: '/api/health/all' },
    checked_at: new Date().toISOString(),
    overall,
    summary,
    services: results,
  };

  const httpStatus = overall === 'down' ? 503 : 200;
  res.writeHead(httpStatus, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

const server = http.createServer((req, res) => {
  if (req.url === '/health/all' && req.method === 'GET') {
    handleHealthAll(req, res).catch((err) => {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'aggregator_failed', detail: err?.message }));
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log(`[gateway] health-aggregator escuchando en 127.0.0.1:${PORT}`);
});
