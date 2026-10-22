const APP_NAME = "SaitamaAPI MAX PLUS";
const CREATOR = "SAI";
const YEAR = 2026;

const json = (data, status = 200, extraHeaders = {}) =>
  Response.json({ status: status < 400 ? "success" : "error", creator: CREATOR, year: YEAR, ...data }, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders }
  });

const encode = value => new TextEncoder().encode(String(value));
async function hash(value) {
  const digest = await crypto.subtle.digest("SHA-256", encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
function token(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(data, b => b.toString(16).padStart(2, "0")).join("");
}
function cookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const item = header.split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  return item ? item.slice(name.length + 1) : "";
}
function cookieHeader(name, value, maxAge = 604800) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function redirect(url, cookies = []) {
  const headers = new Headers({ Location: url, "Cache-Control": "no-store" });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
}
const utcDay = () => new Date().toISOString().slice(0, 10);

async function getSessionUser(request, env) {
  const raw = cookie(request, "sai_session");
  if (!raw) return null;
  return env.DB.prepare(`
    SELECT u.id, u.email, u.name, u.avatar_url, u.role, u.created_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).bind(await hash(raw), Math.floor(Date.now() / 1000)).first();
}
async function getApiUser(request, env) {
  const raw = request.headers.get("x-api-key") ||
    (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!raw) return null;
  return env.DB.prepare(`
    SELECT u.id, u.email, u.name, u.role, k.id AS api_key_id
    FROM api_keys k JOIN users u ON u.id = k.user_id
    WHERE k.key_hash = ? AND k.revoked_at IS NULL LIMIT 1
  `).bind(await hash(raw)).first();
}
async function ensureApiKey(env, userId) {
  const existing = await env.DB.prepare(
    "SELECT id FROM api_keys WHERE user_id = ? AND revoked_at IS NULL LIMIT 1"
  ).bind(userId).first();
  if (existing) return null;
  const plain = "sai_" + token(28);
  await env.DB.prepare(`
    INSERT INTO api_keys (id,user_id,key_hash,key_prefix)
    VALUES (?,?,?,?)
  `).bind(token(12), userId, await hash(plain), plain.slice(0, 12)).run();
  return plain;
}
async function recordUsage(env, userId, path, failed) {
  const day = utcDay();
  await env.DB.prepare(`
    INSERT INTO usage_daily (user_id,day,total,errors) VALUES (?,?,1,?)
    ON CONFLICT(user_id,day) DO UPDATE SET total=total+1, errors=errors+excluded.errors
  `).bind(userId, day, failed ? 1 : 0).run();
  await env.DB.prepare(`
    INSERT INTO endpoint_stats (endpoint,total,errors) VALUES (?,1,?)
    ON CONFLICT(endpoint) DO UPDATE SET total=total+1, errors=errors+excluded.errors
  `).bind(path, failed ? 1 : 0).run();
  await env.DB.prepare("UPDATE stats SET total=total+1, errors=errors+? WHERE id=1")
    .bind(failed ? 1 : 0).run();
}
async function requireUser(request, env) {
  const user = await getSessionUser(request, env);
  return user;
}
async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === "GET" && path === "/healthz") return json({ healthy: true });
  if (method === "GET" && path === "/api/ping") return json({ message: `${APP_NAME} activa` });
  if (method === "GET" && path === "/api/info") return json({
    name: APP_NAME, version: "3.0.0", creator: CREATOR, year: YEAR,
    authentication: ["Google OAuth", "API key"], docs: "/#endpoints"
  });

  if (method === "GET" && path === "/auth/google") {
    const required = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "APP_ORIGIN", "SESSION_SECRET"];
    const missing = required.filter(k => !env[k] || !String(env[k]).trim());
    if (missing.length) return json({ error: "Faltan variables de configuración del Worker", missing }, 500);
    const state = token(24);
    const origin = env.APP_ORIGIN.replace(/\/$/, "");
    const callback = `${origin}/auth/google/callback`;
    const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    google.search = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID, redirect_uri: callback,
      response_type: "code", scope: "openid email profile", state,
      prompt: "select_account"
    });
    return redirect(google.toString(), [cookieHeader("sai_oauth_state", state, 600)]);
  }

  if (method === "GET" && path === "/auth/google/callback") {
    const state = url.searchParams.get("state");
    const savedState = cookie(request, "sai_oauth_state");
    const code = url.searchParams.get("code");
    if (!state || !savedState || state !== savedState || !code) {
      return json({ error: "Estado OAuth inválido. Inicia sesión desde la web e inténtalo otra vez." }, 400);
    }
    const origin = env.APP_ORIGIN.replace(/\/$/, "");
    const callback = `${origin}/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callback, grant_type: "authorization_code"
      })
    });
    if (!tokenResponse.ok) {
      console.error("Google token exchange failed", tokenResponse.status);
      return json({ error: "Google no pudo validar el inicio de sesión. Revisa el OAuth Client y el callback." }, 502);
    }
    const tokenData = await tokenResponse.json();
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    if (!profileResponse.ok) return json({ error: "No se pudo verificar el perfil de Google." }, 502);
    const profile = await profileResponse.json();
    if (!profile.sub || !profile.email || profile.email_verified !== true) {
      return json({ error: "Google no devolvió un correo verificado." }, 400);
    }

    const adminEmail = String(env.ADMIN_EMAIL || "").trim().toLowerCase();
    const role = profile.email.toLowerCase() === adminEmail ? "admin" : "user";
    // Email is the stable unique key; update the existing row instead of creating duplicates.
    await env.DB.prepare(`
      INSERT INTO users (id,email,name,avatar_url,role)
      VALUES (?,?,?,?,?)
      ON CONFLICT(email) DO UPDATE SET
        name=excluded.name,
        avatar_url=excluded.avatar_url,
        role=CASE WHEN excluded.role='admin' THEN 'admin' ELSE users.role END
    `).bind(String(profile.sub), profile.email.toLowerCase(), profile.name || "", profile.picture || "", role).run();

    const user = await env.DB.prepare("SELECT id,email,name,role FROM users WHERE email=?")
      .bind(profile.email.toLowerCase()).first();
    if (!user) return json({ error: "No se pudo crear el perfil." }, 500);
    const plainKey = await ensureApiKey(env, user.id);
    const sessionToken = token(32);
    await env.DB.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)")
      .bind(await hash(sessionToken), user.id, Math.floor(Date.now() / 1000) + 604800).run();

    const cookies = [
      cookieHeader("sai_session", sessionToken, 604800),
      cookieHeader("sai_oauth_state", "", 0)
    ];
    const dest = new URL("/", origin);
    dest.searchParams.set("login", "success");
    if (plainKey) dest.searchParams.set("newkey", plainKey);
    return redirect(dest.toString(), cookies);
  }

  if (method === "GET" && path === "/api/session") {
    const user = await getSessionUser(request, env);
    if (!user) return json({ authenticated: false, user: null });
    const key = await env.DB.prepare(
      "SELECT key_prefix,created_at FROM api_keys WHERE user_id=? AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1"
    ).bind(user.id).first();
    const daily = await env.DB.prepare(
      "SELECT total,errors FROM usage_daily WHERE user_id=? AND day=?"
    ).bind(user.id, utcDay()).first();
    return json({ authenticated: true, user, apiKey: key || null, today: daily || {total:0,errors:0} });
  }

  if (method === "POST" && path === "/api/logout") {
    const raw = cookie(request, "sai_session");
    if (raw) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await hash(raw)).run();
    return json({ message: "Sesión cerrada" }, 200, {
      "Set-Cookie": cookieHeader("sai_session", "", 0)
    });
  }

  if (method === "POST" && path === "/api/key/rotate") {
    const user = await requireUser(request, env);
    if (!user) return json({ error: "Inicia sesión para gestionar tu API key." }, 401);
    await env.DB.prepare("UPDATE api_keys SET revoked_at=datetime('now') WHERE user_id=? AND revoked_at IS NULL")
      .bind(user.id).run();
    const plain = "sai_" + token(28);
    await env.DB.prepare("INSERT INTO api_keys (id,user_id,key_hash,key_prefix) VALUES (?,?,?,?)")
      .bind(token(12), user.id, await hash(plain), plain.slice(0,12)).run();
    return json({ apiKey: plain, message: "Guarda esta clave; solo se muestra completa al crearla." });
  }

  if (method === "GET" && path === "/api/admin/overview") {
    const user = await requireUser(request, env);
    if (!user) return json({ error: "Inicia sesión." }, 401);
    if (user.role !== "admin") return json({ error: "Solo administradores." }, 403);
    const totals = await env.DB.prepare("SELECT total,errors FROM stats WHERE id=1").first();
    const people = await env.DB.prepare(`
      SELECT u.id,u.name,u.email,u.role,u.created_at,
             COALESCE(d.total,0) AS today_total, COALESCE(d.errors,0) AS today_errors
      FROM users u LEFT JOIN usage_daily d ON d.user_id=u.id AND d.day=?
      ORDER BY today_total DESC, u.created_at DESC LIMIT 100
    `).bind(utcDay()).all();
    const endpoints = await env.DB.prepare("SELECT endpoint,total,errors FROM endpoint_stats ORDER BY total DESC LIMIT 30").all();
    return json({ totals: totals || {total:0,errors:0}, users: people.results || [], endpoints: endpoints.results || [] });
  }

  if (method === "GET" && path === "/api/stats/public") {
    const totals = await env.DB.prepare("SELECT total,errors FROM stats WHERE id=1").first();
    return json({ totals: totals || { total: 0, errors: 0 } });
  }

  if (method === "GET" && path === "/api/endpoints") {
    const data = await env.DB.prepare("SELECT name,path,method,description,category FROM endpoints ORDER BY category,name").all();
    return json({ endpoints: data.results || [] });
  }

  if (path.startsWith("/api/")) {
    const user = await getApiUser(request, env);
    if (!user) return json({ error: "API key inválida o ausente. Envía x-api-key o Authorization: Bearer." }, 401);
    let result;
    const q = url.searchParams;
    if (method === "GET" && path === "/api/random") {
      const min = Number(q.get("min") ?? 0), max = Number(q.get("max") ?? 100);
      if (!Number.isFinite(min) || !Number.isFinite(max) || max < min || max-min > 1e9) result = json({error:"Rango inválido."},400);
      else result = json({ number: Math.floor(Math.random() * (max-min+1)) + min });
    } else if (method === "GET" && path === "/api/uuid") {
      result = json({ uuid: crypto.randomUUID() });
    } else if (method === "GET" && path === "/api/time") {
      result = json({ iso: new Date().toISOString(), timestamp: Date.now() });
    } else if (method === "GET" && path === "/api/text") {
      const text = q.get("text") || "";
      result = json({ text, length: text.length, uppercase: text.toUpperCase(), lowercase: text.toLowerCase() });
    } else if (method === "GET" && path === "/api/base64/encode") {
      const text = q.get("text") || "";
      result = json({ encoded: btoa(unescape(encodeURIComponent(text))) });
    } else if (method === "GET" && path === "/api/base64/decode") {
      try { result = json({ decoded: decodeURIComponent(escape(atob(q.get("text") || ""))) }); }
      catch { result = json({ error: "Base64 inválido." },400); }
    } else if (method === "GET" && path === "/api/ytsearch") {
      if (!q.get("q")) result = json({error:"Falta el parámetro q. Ejemplo: ?q=Shakira"},400);
      else if (env.YTSEARCH_URL) {
        try {
          const target = new URL(env.YTSEARCH_URL);
          target.searchParams.set("q", q.get("q"));
          target.searchParams.set("limit", String(Math.min(20, Math.max(1, Number(q.get("limit") || 10)))));
          const r = await fetch(target);
          const body = await r.json();
          result = json({ query:q.get("q"), results:body.results || body.data || body });
        } catch { result = json({error:"Falló el proveedor de búsqueda configurado."},502); }
      } else result = json({error:"Buscador no configurado. Añade YTSEARCH_URL con la URL de tu servicio de búsqueda."},503);
    } else if (method === "GET" && path === "/api/download") {
      result = json({error:"Proveedor de descargas no configurado todavía.", help:"Configura un proveedor autorizado en el Worker antes de activar descargas."},503);
    } else {
      result = json({ error: "Endpoint no encontrado", available: ["/api/ping","/api/info","/api/random","/api/uuid","/api/time","/api/text","/api/base64/encode","/api/base64/decode","/api/ytsearch","/api/download"] },404);
    }
    await recordUsage(env, user.id, path, result.status >= 400);
    return result;
  }

  if (path.startsWith("/auth/")) return json({ error: "Ruta de autenticación no encontrada" },404);
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (error) {
      console.error("SAITAMAAPI_ERROR", error?.stack || error);
      // Do not expose internal exception details publicly.
      return json({ error: "Error interno del servidor" },500);
    }
  }
};
