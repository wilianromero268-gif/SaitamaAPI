const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { authMode: "login", me: null, keyOnce: null, endpoints: [] };
const toast = (msg) => { const el = $("#toast"); el.textContent = msg; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2600); };
async function api(path, options = {}) {
  const res = await fetch(path, { credentials: "same-origin", ...options, headers: { ...(options.body ? {"content-type":"application/json"} : {}), ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === false) throw new Error(data.error || `Error HTTP ${res.status}`);
  return data;
}
function showNotice(text) { const n=$("#notice"); n.textContent=text; n.classList.remove("hidden"); }
function setAuthMode(mode) {
  state.authMode = mode;
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.auth === mode));
  $("#nameWrap").classList.toggle("hidden", mode !== "register");
  $("#authSubmit").innerHTML = mode === "register" ? 'Crear cuenta <span>→</span>' : 'Entrar al dashboard <span>→</span>';
}
function showSection(name) {
  const logged = !!state.me;
  $("#authView").classList.toggle("hidden", logged);
  $("#appView").classList.toggle("hidden", !logged || name !== "dashboard");
  $("#docsView").classList.toggle("hidden", name !== "docs");
  $("#adminView").classList.toggle("hidden", name !== "admin" || state.me?.user?.role !== "admin");
  const titles = {dashboard:"Dashboard",account:"Mi API Key",docs:"Documentación",admin:"Administración"};
  $("#pageTitle").textContent = titles[name] || "Dashboard";
  $$(".nav-link").forEach(a => a.classList.toggle("active", a.dataset.view === name));
  if (name === "account" && logged) $("#appView").classList.remove("hidden");
  if (name === "account" && logged) { $("#pageTitle").textContent = "Mi API Key"; }
}
function route() {
  const hash = location.hash.replace("#","") || "dashboard";
  const allowed = ["dashboard","account","docs","admin"];
  showSection(allowed.includes(hash) ? hash : "dashboard");
}
async function loadMe() {
  try {
    state.me = await api("/dashboard/api/me");
    const u = state.me.user;
    $("#userName").textContent = u.name || u.email;
    $("#avatar").textContent = (u.name || u.email || "S").slice(0,1).toUpperCase();
    $("#roleBadge").textContent = u.role === "admin" ? "ADMIN • UNLIMITED" : "USER";
    $("#usageNum").textContent = state.me.usage;
    $("#errorsNum").textContent = state.me.errors;
    $("#usageSub").textContent = state.me.unlimited ? "Solicitudes ilimitadas" : `de ${state.me.limit} disponibles`;
    $("#usageBar").style.width = state.me.unlimited ? "100%" : `${Math.min(100, state.me.usage / state.me.limit * 100)}%`;
    $("#keyState").textContent = state.me.apiKey ? "Activa" : "Sin clave";
    $("#keyText").textContent = state.keyOnce || (state.me.apiKey ? `${state.me.apiKey.key_prefix}••••••••` : "Sin API Key");
    $("#logoutBtn").classList.remove("hidden");
    $$(".admin-only").forEach(el => el.classList.toggle("hidden", u.role !== "admin"));
    $("#authView").classList.add("hidden");
    $("#appView").classList.remove("hidden");
    await loadEndpoints();
    if (u.role === "admin") await loadAdmin();
    route();
  } catch {
    state.me = null;
    $("#authView").classList.remove("hidden");
    $("#appView").classList.add("hidden");
    $("#logoutBtn").classList.add("hidden");
    route();
  }
}
async function loadEndpoints() {
  try {
    const data = await api("/dashboard/api/endpoints");
    state.endpoints = data.endpoints || [];

    const cards = state.endpoints.map(e => `
      <article class="endpoint-card">
        <span class="method">${escapeHtml(e.method || "GET")}</span>
        <h4>${escapeHtml(e.name)}</h4>
        <code>${escapeHtml(e.path)}</code>
        <p>${escapeHtml(e.description || "Endpoint de SaitamaAPI")}</p>
        ${e.path === "/api/ytsearch" && e.method === "GET" ? `
          <label for="ytSearchQuery">Buscar videos en YouTube</label>
          <input id="ytSearchQuery" type="text" placeholder="Ejemplo: Shakira">
          <button class="primary" type="button" data-test-ytsearch>Probar búsqueda</button>
          <button class="secondary" type="button" data-copy-node>Copiar ejemplo Node.js</button>
          <pre class="yt-result"><code id="ytSearchResult">Escribe una búsqueda y pulsa Probar búsqueda.</code></pre>
        ` : ""}
      </article>
    `).join("");

    $("#endpointCards").innerHTML = cards || '<p class="muted">Todavía no hay endpoints.</p>';

    $("#docsEndpoints").innerHTML = state.endpoints.map(e =>
      `<div class="doc-item"><h4>${escapeHtml(e.name)} <span class="method">${escapeHtml(e.method)}</span></h4><p class="muted">${escapeHtml(e.description || "")}</p><p><code>${escapeHtml(e.path)}</code></p><pre><code>curl -H "x-api-key: sai_TU_CLAVE" "${location.origin}${escapeHtml(e.path)}?${encodeURIComponent(e.param_name || "q")}=ejemplo"</code></pre></div>`
    ).join("");

    $("#adminEndpointList").innerHTML = state.endpoints.map(e =>
      `<div class="admin-endpoint"><div><b>${escapeHtml(e.name)}</b><br><code>${escapeHtml(e.path)}</code><p class="tiny muted">${escapeHtml(e.upstream_url || "Endpoint integrado")}</p></div>${String(e.id).startsWith("builtin-") ? '<span class="badge">INTEGRADO</span>' : `<button class="danger" data-delete-endpoint="${escapeHtml(e.id)}">Eliminar</button>`}</div>`
    ).join("");
  } catch(e) {
    showNotice(e.message);
  }
}
async function loadAdmin() {
  try {
    const d = await api("/dashboard/api/admin/stats");
    $("#adminUsers").textContent = d.stats.users; $("#adminKeys").textContent = d.stats.activeKeys;
    $("#adminRequests").textContent = d.stats.requestsToday; $("#adminErrors").textContent = d.stats.errorsToday;
    $("#totalUsers").textContent = d.stats.users;
  } catch(e) { showNotice(e.message); }
}
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
$$(".tab").forEach(t => t.addEventListener("click", () => setAuthMode(t.dataset.auth)));
$("#authForm").addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const body = Object.fromEntries(fd.entries());
  try {
    const path = state.authMode === "register" ? "/auth/register" : "/auth/login";
    await api(path, { method:"POST", body:JSON.stringify(body) });
    toast(state.authMode === "register" ? "Cuenta creada correctamente" : "Bienvenido a SaitamaAPI PRO");
    await
document.addEventListener("click", async e => {
  const testButton = e.target.closest("[data-test-ytsearch]");
  const copyButton = e.target.closest("[data-copy-node]");

  if (testButton) {
    const query = document.querySelector("#ytSearchQuery")?.value.trim();
    const output = document.querySelector("#ytSearchResult");
    if (!query) {
      toast("Escribe qué video quieres buscar.");
      return;
    }
    testButton.disabled = true;
    testButton.textContent = "Buscando...";
    if (output) output.textContent = "Consultando SaitamaAPI...";
    try {
      const result = await api("/dashboard/api/test", {
        method: "POST",
        body: JSON.stringify({ path: "/api/ytsearch", q: query, limit: 10 })
      });
      if (output) output.textContent = JSON.stringify(result, null, 2);
    } catch (err) {
      if (output) output.textContent = JSON.stringify({ status: false, error: err.message }, null, 2);
      toast(err.message);
    } finally {
      testButton.disabled = false;
      testButton.textContent = "Probar búsqueda";
    }
  }

  if (copyButton) {
    const sample = `const response = await fetch("https://saitamaapi.wilianromero268.workers.dev/api/ytsearch?q=Shakira&limit=10", {
  headers: { "x-api-key": "sai_TU_CLAVE" }
});
console.log(await response.json());`;
    try {
      await navigator.clipboard.writeText(sample);
      toast("Ejemplo Node.js copiado.");
    } catch (_) {
      toast("No se pudo copiar automáticamente. Revisa los permisos del navegador.");
    }
  }
});

loadMe();
  } catch(err) { toast(err.message); }
});
$("#googleBtn").addEventListener("click", async e => {
  try {
    const providers = await api("/api/auth/providers");
    if (!providers.googleEnabled) { e.preventDefault(); toast("Google OAuth no está configurado en Cloudflare. Usa correo o configura los secretos."); }
  } catch { e.preventDefault(); toast("No se pudo comprobar el acceso con Google."); }
});
$("#generateKey").addEventListener("click", async () => {
  if (!confirm("Crear una nueva clave revocará la anterior. ¿Continuar?")) return;
  try {
    const d = await api("/dashboard/api/key", { method:"POST", body:"{}" });
    state.keyOnce = d.key; $("#keyText").textContent = d.key; $("#keyState").textContent = "Activa";
    toast("Clave generada. Cópiala y guárdala ahora.");
    await loadMe();
  } catch(e) { toast(e.message); }
});
$("#revokeKey").addEventListener("click", async () => {
  if (!confirm("¿Revocar tu API Key actual?")) return;
  try { await api("/dashboard/api/key", {method:"DELETE"}); state.keyOnce=null; toast("API Key revocada"); await loadMe(); }
  catch(e) { toast(e.message); }
});
$("#copyKey").addEventListener("click", async () => {
  const text = state.keyOnce || "";
  if (!text) return toast("La clave completa solo aparece al generarla.");
  try { await navigator.clipboard.writeText(text); toast("API Key copiada"); } catch { toast("No se pudo copiar. Mantén pulsada la clave."); }
});
$$(".copy-base").forEach(b => b.addEventListener("click", async () => { try { await navigator.clipboard.writeText(location.origin); toast("URL copiada"); } catch { toast(location.origin); } }));
$("#endpointForm").addEventListener("submit", async e => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.currentTarget).entries());
  try { await api("/dashboard/api/admin/endpoints", {method:"POST", body:JSON.stringify(body)}); e.currentTarget.reset(); toast("Endpoint publicado"); await loadEndpoints(); await loadAdmin(); }
  catch(err) { toast(err.message); }
});
$("#adminEndpointList").addEventListener("click", async e => {
  const b = e.target.closest("[data-delete-endpoint]"); if (!b) return;
  if (!confirm("¿Eliminar este endpoint?")) return;
  try { await api(`/dashboard/api/admin/endpoints/${encodeURIComponent(b.dataset.deleteEndpoint)}`, {method:"DELETE"}); toast("Endpoint eliminado"); await loadEndpoints(); }
  catch(err) { toast(err.message); }
});
$("#logoutBtn").addEventListener("click", async () => { try { await api("/auth/logout", {method:"POST",body:"{}"}); } catch {} state.me=null; state.keyOnce=null; location.hash="#dashboard"; await loadMe(); });
$("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$$("[data-view]").forEach(a => a.addEventListener("click", () => { $("#sidebar").classList.remove("open"); }));
window.addEventListener("hashchange", route);
loadMe();
