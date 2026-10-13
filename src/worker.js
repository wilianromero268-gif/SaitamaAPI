const APP_NAME = "SaitamaAPI PRO";
const CREATOR = "SAI";
const YEAR = 2026;
const SESSION_SECONDS = 60 * 60 * 24 * 7;

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data, null, 2), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
});
const fail = (error, status = 400) => json({ status: false, error, creator: CREATOR, year: YEAR }, status);
const ok = (data = {}, status = 200, headers = {}) => json({ status: true, creator: CREATOR, year: YEAR, ...data }, status, headers);
const redirectWithCookies = (location, cookies = []) => {
  const headers = new Headers({ location, "cache-control": "no-store" });
  for (const value of cookies) headers.append("set-cookie", value);
  return new Response(null, { status: 302, headers });
};
const uid = () => crypto.randomUUID();
const enc = (s) => new TextEncoder().encode(s);
const hex = (buf) => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, "0")).join("");
const sha = async (s) => hex(await crypto.subtle.digest("SHA-256", enc(s)));
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
const randomToken = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));
const today = () => new Date().toISOString().slice(0, 10);
const parseCookies = (header = "") => Object.fromEntries(header.split(";").map(v => v.trim()).filter(Boolean).map(v => {
  const i = v.indexOf("="); return [v.slice(0, i), decodeURIComponent(v.slice(i + 1))];
}));
const cookie = (name, value, maxAge) => `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const clearCookie = (name) => `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
const parseBody = async (req) => { try { return await req.json(); } catch { return {}; } };
const admins = (env) => (env.ADMIN_EMAILS || "").split(",").map(x => x.trim().toLowerCase()).filter(x => x && x !== "TU_GMAIL_ADMIN");
const isAdminEmail = (email, env) => admins(env).includes(email.toLowerCase());

async function passwordHash(password, salt = randomToken(16)) {
  const material = await crypto.subtle.importKey("raw", enc(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc(salt), iterations: 120000, hash: "SHA-256" }, material, 256);
  return `${salt}.${b64url(bits)}`;
}
async function passwordMatches(password, stored) {
  if (!stored || !stored.includes(".")) return false;
  const [salt, wanted] = stored.split(".");
  return (await passwordHash(password, salt)).split(".")[1] === wanted;
}
async function getUser(req, env) {
  const token = parseCookies(req.headers.get("cookie") || "").sai_session;
  if (!token) return null;
  const tokenHash = await sha(token);
  const row = await env.DB.prepare(
    "SELECT u.id,u.email,u.name,u.role,u.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?"
  ).bind(tokenHash, Math.floor(Date.now()/1000)).first();
  return row || null;
}
async function createSession(userId, env) {
  const token = randomToken(32);
  await env.DB.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)")
    .bind(await sha(token), userId, Math.floor(Date.now()/1000) + SESSION_SECONDS).run();
  return token;
}
async function userPayload(user, env) {
  const date = today();
  const usage = await env.DB.prepare("SELECT request_count,error_count FROM usage_daily WHERE user_id=? AND usage_date=?")
    .bind(user.id, date).first();
  const key = await env.DB.prepare("SELECT id,key_prefix,created_at FROM api_keys WHERE user_id=? AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1")
    .bind(user.id).first();
  const limit = Number(env.DAILY_LIMIT || 450);
  return { user, usage: usage?.request_count || 0, errors: usage?.error_count || 0,
    limit: user.role === "admin" ? null : limit, unlimited: user.role === "admin", apiKey: key || null,
    googleEnabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) };
}
async function requireUser(req, env) {
  const user = await getUser(req, env);
  return user ? { user } : { response: fail("Inicia sesión para continuar.", 401) };
}
async function requireAdmin(req, env) {
  const auth = await requireUser(req, env);
  if (auth.response) return auth;
  if (auth.user.role !== "admin") return { response: fail("Se requieren permisos de administrador.", 403) };
  return auth;
}
async function ensureUsage(user, env) {
  await env.DB.prepare("INSERT OR IGNORE INTO usage_daily(user_id,usage_date,request_count,error_count) VALUES(?,?,0,0)")
    .bind(user.id, today()).run();
}
async function countUsage(user, env, isError = false) {
  await ensureUsage(user, env);
  await env.DB.prepare(`UPDATE usage_daily SET request_count=request_count+1${isError ? ", error_count=error_count+1" : ""} WHERE user_id=? AND usage_date=?`)
    .bind(user.id, today()).run();
}
async function apiKeyAuth(req, env) {
  const authHeader = req.headers.get("authorization") || "";
  const raw = req.headers.get("x-api-key") || (authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "");
  if (!raw || !raw.startsWith("sai_")) return null;
  const row = await env.DB.prepare(
    "SELECT u.id,u.email,u.name,u.role,u.created_at,k.id AS key_id FROM api_keys k JOIN users u ON u.id=k.user_id WHERE k.key_hash=? AND k.revoked_at IS NULL"
  ).bind(await sha(raw)).first();
  return row || null;
}
async function apiRequest(req, env, url) {
  const path = url.pathname;
  if (path === "/api/health") return ok({ name: APP_NAME, message: "API online" });
  if (path === "/api/ping") return ok({ message: "Pong", name: APP_NAME });
  if (path === "/api/info") return ok({ name: APP_NAME, creator: CREATOR, year: YEAR, dailyLimit: Number(env.DAILY_LIMIT || 450) });

  const user = await apiKeyAuth(req, env);
  if (!user) return fail("API key ausente o inválida. Usa x-api-key: sai_...", 401);
  const date = today();
  const current = await env.DB.prepare("SELECT request_count FROM usage_daily WHERE user_id=? AND usage_date=?")
    .bind(user.id, date).first();
  const limit = Number(env.DAILY_LIMIT || 450);
  if (user.role !== "admin" && (current?.request_count || 0) >= limit) {
    return fail(`Límite diario alcanzado (${limit}). Inténtalo mañana.`, 429);
  }

  const endpoint = await env.DB.prepare("SELECT * FROM endpoints WHERE path=? AND enabled=1").bind(path).first();
  if (!endpoint) return fail("Endpoint no encontrado.", 404);
  if (endpoint.path === "/api/ping" || endpoint.path === "/api/info") {
    await countUsage(user, env, false);
    return endpoint.path === "/api/ping" ? ok({ message: "Pong", name: APP_NAME }) :
      ok({ name: APP_NAME, dailyLimit: user.role === "admin" ? "unlimited" : limit });
  }

  try {
    const incoming = new URL(req.url);
    const upstream = new URL(endpoint.upstream_url);
    if (upstream.protocol !== "https:") return fail("El endpoint externo debe usar HTTPS.", 400);
    for (const [k, v] of incoming.searchParams) upstream.searchParams.set(k, v);
    const method = (endpoint.method || "GET").toUpperCase();
    const init = { method, headers: { "accept": "application/json", "user-agent": "SaitamaAPI-PRO/1.0" } };
    if (method !== "GET" && method !== "HEAD") {
      const body = await req.text();
      if (body) { init.body = body; init.headers["content-type"] = req.headers.get("content-type") || "application/json"; }
    }
    const upstreamRes = await fetch(upstream.toString(), init);
    const textBody = await upstreamRes.text();
    let data;
    try { data = JSON.parse(textBody); } catch { data = textBody; }
    await countUsage(user, env, !upstreamRes.ok);
    return json({ status: upstreamRes.ok, creator: CREATOR, year: YEAR, endpoint: endpoint.name, data },
      upstreamRes.ok ? 200 : 502);
  } catch (e) {
    await countUsage(user, env, true);
    return fail("No se pudo consultar la API externa.", 502);
  }
}
async function authRoutes(req, env, url) {
  const path = url.pathname;
  if (path === "/api/auth/providers") return ok({ googleEnabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET), passwordEnabled: true });
  if (path === "/auth/google") {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return fail("Google OAuth aún no está configurado. Puedes iniciar sesión con correo mientras tanto.", 503);
    const state = randomToken(24);
    const redirect = new URL("/auth/google/callback", env.APP_ORIGIN || url.origin).toString();
    const target = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    target.search = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID, redirect_uri: redirect, response_type: "code",
      scope: "openid email profile", state, prompt: "select_account"
    });
    return redirectWithCookies(target.toString(), [cookie("sai_oauth_state", state, 600)]);
  }
  if (path === "/auth/google/callback") {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return fail("Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Cloudflare.", 503);
    const state = url.searchParams.get("state");
    if (!state || state !== parseCookies(req.headers.get("cookie") || "").sai_oauth_state) return fail("Estado OAuth inválido. Vuelve a intentarlo.", 400);
    const code = url.searchParams.get("code");
    if (!code) return fail("Google no devolvió el código de autorización.", 400);
    const redirectUri = new URL("/auth/google/callback", env.APP_ORIGIN || url.origin).toString();
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: "authorization_code" })
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) return fail("Google no pudo validar el inicio de sesión. Revisa las URL de OAuth.", 401);
    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${tokenData.access_token}` } });
    const profile = await profileRes.json();
    if (!profile.email || profile.email_verified !== true) return fail("Google no confirmó un correo verificado.", 401);
    const email = profile.email.toLowerCase();
    let user = await env.DB.prepare("SELECT id,email,name,role FROM users WHERE email=?").bind(email).first();
    const role = isAdminEmail(email, env) ? "admin" : "user";
    if (!user) {
      const id = uid();
      await env.DB.prepare("INSERT INTO users(id,email,name,role) VALUES(?,?,?,?)").bind(id, email, profile.name || email, role).run();
      user = { id, email, name: profile.name || email, role };
    } else if (role === "admin" && user.role !== "admin") {
      await env.DB.prepare("UPDATE users SET role='admin' WHERE id=?").bind(user.id).run();
      user.role = "admin";
    }
    const session = await createSession(user.id, env);
    return redirectWithCookies(new URL("/#dashboard", env.APP_ORIGIN || url.origin).toString(), [
      cookie("sai_session", session, SESSION_SECONDS), clearCookie("sai_oauth_state")
    ]);
  }
  if (path === "/auth/logout" && req.method === "POST") {
    const token = parseCookies(req.headers.get("cookie") || "").sai_session;
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha(token)).run();
    return ok({ message: "Sesión cerrada." }, 200, { "set-cookie": clearCookie("sai_session") });
  }
  if (path === "/auth/register" && req.method === "POST") {
    const body = await parseBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || email).trim().slice(0, 100);
    const password = String(body.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Escribe un correo válido.");
    if (password.length < 8) return fail("La contraseña debe tener al menos 8 caracteres.");
    if (password.length > 200) return fail("La contraseña es demasiado larga.");
    if (await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first()) return fail("Ese correo ya está registrado.", 409);
    const id = uid(), role = isAdminEmail(email, env) ? "admin" : "user";
    await env.DB.prepare("INSERT INTO users(id,email,name,password_hash,role) VALUES(?,?,?,?,?)")
      .bind(id, email, name, await passwordHash(password), role).run();
    const session = await createSession(id, env);
    return ok({ message: "Cuenta creada." }, 201, { "set-cookie": cookie("sai_session", session, SESSION_SECONDS) });
  }
  if (path === "/auth/login" && req.method === "POST") {
    const body = await parseBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = await env.DB.prepare("SELECT id,email,name,role,password_hash FROM users WHERE email=?").bind(email).first();
    if (!user || !(await passwordMatches(password, user.password_hash))) return fail("Correo o contraseña incorrectos.", 401);
    if (isAdminEmail(email, env) && user.role !== "admin") {
      await env.DB.prepare("UPDATE users SET role='admin' WHERE id=?").bind(user.id).run();
      user.role = "admin";
    }
    const session = await createSession(user.id, env);
    return ok({ message: "Sesión iniciada." }, 200, { "set-cookie": cookie("sai_session", session, SESSION_SECONDS) });
  }
  return null;
}
async function dashboardRoutes(req, env, url) {
  const path = url.pathname;
  if (path === "/dashboard/api/me" && req.method === "GET") {
    const user = await getUser(req, env);
    if (!user) return fail("No has iniciado sesión.", 401);
    return ok(await userPayload(user, env));
  }
  if (path === "/dashboard/api/key" && req.method === "POST") {
    const auth = await requireUser(req, env); if (auth.response) return auth.response;
    const id = uid(), raw = `sai_${randomToken(32)}`;
    await env.DB.prepare("UPDATE api_keys SET revoked_at=datetime('now') WHERE user_id=? AND revoked_at IS NULL").bind(auth.user.id).run();
    await env.DB.prepare("INSERT INTO api_keys(id,user_id,key_hash,key_prefix) VALUES(?,?,?,?)")
      .bind(id, auth.user.id, await sha(raw), raw.slice(0, 12)).run();
    return ok({ key: raw, message: "Copia esta clave ahora. Por seguridad no se volverá a mostrar completa." }, 201);
  }
  if (path === "/dashboard/api/key" && req.method === "DELETE") {
    const auth = await requireUser(req, env); if (auth.response) return auth.response;
    await env.DB.prepare("UPDATE api_keys SET revoked_at=datetime('now') WHERE user_id=? AND revoked_at IS NULL").bind(auth.user.id).run();
    return ok({ message: "API key revocada." });
  }
  if (path === "/dashboard/api/endpoints" && req.method === "GET") {
    const rows = await env.DB.prepare("SELECT id,name,path,upstream_url,method,param_name,description,enabled,created_at FROM endpoints ORDER BY created_at DESC").all();
    return ok({ endpoints: rows.results || [] });
  }
  if (path === "/dashboard/api/admin/stats" && req.method === "GET") {
    const auth = await requireAdmin(req, env); if (auth.response) return auth.response;
    const [users, keys, usage, errors] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS total FROM users").first(),
      env.DB.prepare("SELECT COUNT(*) AS total FROM api_keys WHERE revoked_at IS NULL").first(),
      env.DB.prepare("SELECT COALESCE(SUM(request_count),0) AS total FROM usage_daily WHERE usage_date=?").bind(today()).first(),
      env.DB.prepare("SELECT COALESCE(SUM(error_count),0) AS total FROM usage_daily WHERE usage_date=?").bind(today()).first()
    ]);
    return ok({ stats: { users: users.total, activeKeys: keys.total, requestsToday: usage.total, errorsToday: errors.total } });
  }
  if (path === "/dashboard/api/admin/endpoints" && req.method === "POST") {
    const auth = await requireAdmin(req, env); if (auth.response) return auth.response;
    const b = await parseBody(req);
    const name = String(b.name || "").trim().slice(0, 100);
    const endpointPath = String(b.path || "").trim();
    const upstreamUrl = String(b.upstream_url || "").trim();
    const method = String(b.method || "GET").toUpperCase();
    const paramName = String(b.param_name || "q").trim().slice(0, 50);
    const description = String(b.description || "").trim().slice(0, 500);
    if (!name || !/^\/api\/[a-zA-Z0-9/_-]+$/.test(endpointPath)) return fail("Nombre o ruta inválidos. La ruta debe comenzar con /api/.");
    let parsed; try { parsed = new URL(upstreamUrl); } catch { return fail("URL externa inválida."); }
    if (parsed.protocol !== "https:") return fail("La URL externa debe usar HTTPS.");
    if (!["GET","POST","PUT","PATCH","DELETE"].includes(method)) return fail("Método HTTP no permitido.");
    if (["/api/ping","/api/info","/api/health"].includes(endpointPath)) return fail("Esa ruta está reservada.");
    const id = uid();
    try {
      await env.DB.prepare("INSERT INTO endpoints(id,name,path,upstream_url,method,param_name,description,enabled) VALUES(?,?,?,?,?,?,?,1)")
        .bind(id, name, endpointPath, parsed.toString(), method, paramName, description).run();
    } catch { return fail("Ya existe un endpoint con esa ruta.", 409); }
    return ok({ message: "Endpoint agregado.", id }, 201);
  }
  const deleteMatch = path.match(/^\/dashboard\/api\/admin\/endpoints\/([^/]+)$/);
  if (deleteMatch && req.method === "DELETE") {
    const auth = await requireAdmin(req, env); if (auth.response) return auth.response;
    const id = decodeURIComponent(deleteMatch[1]);
    if (id.startsWith("builtin-")) return fail("No se pueden eliminar endpoints integrados.", 400);
    await env.DB.prepare("DELETE FROM endpoints WHERE id=?").bind(id).run();
    return ok({ message: "Endpoint eliminado." });
  }
  return null;
}
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname.startsWith("/auth/") || url.pathname === "/api/auth/providers") {
        const res = await authRoutes(req, env, url);
        if (res) return res;
      }
      if (url.pathname.startsWith("/dashboard/api/")) {
        const res = await dashboardRoutes(req, env, url);
        if (res) return res;
      }
      if (url.pathname.startsWith("/api/")) return await apiRequest(req, env, url);
      if (env.ASSETS) return env.ASSETS.fetch(req);
      return json({ status: false, error: "No encontrado", creator: CREATOR, year: YEAR }, 404);
    } catch (err) {
      return fail("Error interno del servidor.", 500);
    }
  }
};
