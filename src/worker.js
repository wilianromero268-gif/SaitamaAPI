const LIMIT = 500;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-headers':
        'content-type,x-api-key,authorization,x-admin-token,x-dashboard-secret',
      'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS'
    }
  });

const day = () => new Date().toISOString().slice(0, 10);

const rand = (n = 16) => {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return [...bytes]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

async function hash(value) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );

  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function keyOf(req) {
  return req.headers.get('x-api-key') ||
    (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
}

function dashboardAuthorized(req, env) {
  const supplied = req.headers.get('x-dashboard-secret');
  return Boolean(env.DASHBOARD_SECRET && supplied === env.DASHBOARD_SECRET);
}

async function auth(req, env) {
  const key = keyOf(req);

  if (!key?.startsWith('sai_')) {
    return {
      error: json({
        creator: 'SAI',
        status: false,
        error: 'API key requerida en x-api-key'
      }, 401)
    };
  }

  const row = await env.DB.prepare(
    'SELECT id FROM api_keys WHERE key_hash = ? AND active = 1'
  ).bind(await hash(key)).first();

  if (!row) {
    return {
      error: json({
        creator: 'SAI',
        status: false,
        error: 'API key inválida o eliminada'
      }, 401)
    };
  }

  const usage = await env.DB.prepare(
    'SELECT requests FROM usage_daily WHERE key_id = ? AND day = ?'
  ).bind(row.id, day()).first();

  const used = usage?.requests || 0;

  if (used >= LIMIT) {
    return {
      error: json({
        creator: 'SAI',
        status: false,
        error: 'Límite diario alcanzado',
        limit: LIMIT,
        used
      }, 429)
    };
  }

  await env.DB.prepare(`
    INSERT INTO usage_daily(key_id, day, requests)
    VALUES(?, ?, 1)
    ON CONFLICT(key_id, day)
    DO UPDATE SET requests = requests + 1
  `).bind(row.id, day()).run();

  await env.DB.prepare(
    'UPDATE metrics SET total_requests = total_requests + 1 WHERE id = 1'
  ).run();

  return { row, key };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers':
            'content-type,x-api-key,authorization,x-admin-token,x-dashboard-secret',
          'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS'
        }
      });
    }

    try {
      // Dashboard: todas estas rutas requieren DASHBOARD_SECRET.
      if (path.startsWith('/dashboard/api/')) {
        if (!dashboardAuthorized(req, env)) {
          return json({
            creator: 'SAI',
            status: false,
            error: 'DASHBOARD_SECRET inválido o no configurado'
          }, 403);
        }

        if (path === '/dashboard/api/stats' && req.method === 'GET') {
          const active = await env.DB.prepare(
            'SELECT id FROM api_keys WHERE active = 1 ORDER BY created_at DESC LIMIT 1'
          ).first();

          const total = await env.DB.prepare(
            'SELECT total_requests FROM metrics WHERE id = 1'
          ).first();

          const usage = active
            ? await env.DB.prepare(
                'SELECT requests FROM usage_daily WHERE key_id = ? AND day = ?'
              ).bind(active.id, day()).first()
            : null;

          const used = usage?.requests || 0;

          return json({
            creator: 'SAI',
            year: 2026,
            requests: used,
            limit: LIMIT,
            remaining: Math.max(0, LIMIT - used),
            errors: 0,
            keyActive: Boolean(active),
            keyPrefix: active ? 'sai_••••••••' : '',
            totalRequests: total?.total_requests || 0
          });
        }

        if (
          path === '/dashboard/api/key/generate' &&
          req.method === 'POST'
        ) {
          // Solo se mantiene una clave activa desde el panel.
          await env.DB.prepare(
            'UPDATE api_keys SET active = 0 WHERE active = 1'
          ).run();

          const key = 'sai_' + rand();
          const id = rand(12);

          await env.DB.prepare(
            'INSERT INTO api_keys(id, key_hash, created_at) VALUES(?, ?, ?)'
          ).bind(id, await hash(key), new Date().toISOString()).run();

          return json({
            creator: 'SAI',
            status: true,
            message: 'Guarda tu clave; solo se muestra una vez.',
            apiKey: key,
            limit: LIMIT,
            period: 'daily'
          }, 201);
        }

        if (
          path === '/dashboard/api/key/delete' &&
          req.method === 'DELETE'
        ) {
          await env.DB.prepare(
            'UPDATE api_keys SET active = 0 WHERE active = 1'
          ).run();

          return json({
            creator: 'SAI',
            status: true,
            message: 'API Key eliminada correctamente.'
          });
        }

        return json({
          creator: 'SAI',
          status: false,
          error: 'Ruta del dashboard no encontrada'
        }, 404);
      }

      // La creación pública de claves queda protegida.
      if (path === '/api/keys' && req.method === 'POST') {
        if (!dashboardAuthorized(req, env)) {
          return json({
            creator: 'SAI',
            status: false,
            error: 'Operación no autorizada'
          }, 403);
        }

        return json({
          creator: 'SAI',
          status: false,
          error: 'Genera la clave desde el dashboard'
        }, 400);
      }

      if (!path.startsWith('/api/')) {
        return env.ASSETS.fetch(req);
      }

      if (path === '/api/health') {
        return json({
          creator: 'SAI',
          status: true,
          name: 'SaitamaAPI PRO',
          year: 2026
        });
      }

      if (path === '/api/keys/current' && req.method === 'GET') {
        const result = await auth(req, env);
        if (result.error) return result.error;

        const usage = await env.DB.prepare(
          'SELECT requests FROM usage_daily WHERE key_id = ? AND day = ?'
        ).bind(result.row.id, day()).first();

        const used = usage?.requests || 0;

        return json({
          creator: 'SAI',
          status: true,
          limit: LIMIT,
          used,
          remaining: Math.max(0, LIMIT - used),
          reset: '00:00 UTC'
        });
      }

      if (path === '/api/keys/current' && req.method === 'DELETE') {
        const key = keyOf(req);

        if (!key) {
          return json({
            creator: 'SAI',
            status: false,
            error: 'Falta API key'
          }, 401);
        }

        await env.DB.prepare(
          'UPDATE api_keys SET active = 0 WHERE key_hash = ?'
        ).bind(await hash(key)).run();

        return json({
          creator: 'SAI',
          status: true,
          message: 'API Key eliminada'
        });
      }

      if (path === '/api/stats') {
        const result = await auth(req, env);
        if (result.error) return result.error;

        const [users, total, routes] = await Promise.all([
          env.DB.prepare(
            'SELECT COUNT(*) AS n FROM api_keys WHERE active = 1'
          ).first(),
          env.DB.prepare(
            'SELECT total_requests FROM metrics WHERE id = 1'
          ).first(),
          env.DB.prepare(
            'SELECT COUNT(*) AS n FROM api_routes WHERE enabled = 1'
          ).first()
        ]);

        return json({
          creator: 'SAI',
          status: true,
          year: 2026,
          users: users.n,
          totalRequests: total.total_requests,
          activeApis: routes.n,
          limitPerUserDaily: LIMIT
        });
      }

      if (path === '/api/docs') {
        const { results = [] } = await env.DB.prepare(`
          SELECT slug, title, description, method, param_name
          FROM api_routes
          WHERE enabled = 1
          ORDER BY title
        `).all();

        const endpoints = results.map(item => ({
          ...item,
          path: '/api/run/' + item.slug,
          endpoint: '/api/run/' + item.slug
        }));

        return json({
          creator: 'SAI',
          status: true,
          year: 2026,
          apis: endpoints,
          endpoints
        });
      }

      if (path === '/api/admin/routes' && req.method === 'POST') {
        if (
          !env.ADMIN_TOKEN ||
          req.headers.get('x-admin-token') !== env.ADMIN_TOKEN
        ) {
          return json({
            creator: 'SAI',
            status: false,
            error: 'Admin token inválido'
          }, 403);
        }

        const body = await req.json();
        const slug = String(body.slug || '')
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '');
        const title = String(body.title || '').slice(0, 80);
        const upstream = String(body.upstream_url || '');
        const method = String(body.method || 'GET').toUpperCase();
        const param = String(body.param_name || 'q')
          .replace(/[^a-zA-Z0-9_]/g, '');

        if (
          !slug ||
          !title ||
          !/^https:\/\/[^ ]+/.test(upstream) ||
          !['GET', 'POST'].includes(method)
        ) {
          return json({
            creator: 'SAI',
            status: false,
            error: 'Revisa slug, título, URL HTTPS y método'
          }, 400);
        }

        await env.DB.prepare(`
          INSERT INTO api_routes
            (slug, title, description, upstream_url, method, param_name, enabled, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?)
          ON CONFLICT(slug) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            upstream_url = excluded.upstream_url,
            method = excluded.method,
            param_name = excluded.param_name,
            enabled = 1
        `).bind(
          slug,
          title,
          String(body.description || '').slice(0, 250),
          upstream,
          method,
          param,
          new Date().toISOString()
        ).run();

        return json({
          creator: 'SAI',
          status: true,
          message: 'API guardada correctamente',
          slug
        });
      }

      if (path.startsWith('/api/run/')) {
        const result = await auth(req, env);
        if (result.error) return result.error;

        const slug = path.slice('/api/run/'.length);
        const route = await env.DB.prepare(
          'SELECT * FROM api_routes WHERE slug = ? AND enabled = 1'
        ).bind(slug).first();

        if (!route) {
          return json({
            creator: 'SAI',
            status: false,
            error: 'Endpoint no encontrado'
          }, 404);
        }

        const target = new URL(route.upstream_url);

        for (const [key, value] of url.searchParams) {
          if (!['key', 'apikey'].includes(key.toLowerCase())) {
            target.searchParams.set(key, value);
          }
        }

        const response = await fetch(target.toString(), {
          headers: { accept: 'application/json' }
        });

        const raw = await response.text();
        let resultData;

        try {
          resultData = JSON.parse(raw);
        } catch {
          resultData = { result: raw.slice(0, 20000) };
        }

        return json({
          creator: 'SAI',
          status: response.ok,
          year: 2026,
          endpoint: slug,
          result: resultData
        }, response.ok ? 200 : 502);
      }

      return json({
        creator: 'SAI',
        status: false,
        error: 'Ruta no encontrada'
      }, 404);
    } catch (error) {
      return json({
        creator: 'SAI',
        status: false,
        error: 'Error interno del servidor'
      }, 500);
    }
  }
};
