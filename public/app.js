const $ = id => document.getElementById(id);
let session = null;
let fullKey = "";
const number = n => Number(n || 0).toLocaleString("es-PE");
const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function showNotice(text, bad=false) {
  const n=$("notice"); n.textContent=text; n.classList.remove("hidden");
  n.style.background=bad?"#321a22":"#142c26"; n.style.color=bad?"#fda4af":"#6ee7b7";
}
async function api(url, options={}) {
  const response=await fetch(url,{credentials:"same-origin",...options});
  let data; try{data=await response.json()}catch{data={error:"Respuesta no válida"}}
  return {response,data};
}
async function loadSession() {
  const {data}=await api("/api/session");
  session=data.authenticated?data:null;
  if(!session){
    $("connection").textContent="Sesión no iniciada";
    $("profileInfo").innerHTML="<p>Inicia sesión con Google para crear tu perfil y tu API key automáticamente.</p>";
    $("avatar").textContent="S"; $("loginBtn").textContent="Iniciar con Google";
    $("heroLogin").textContent="Continuar con Google ↗"; $("logoutBtn").classList.add("hidden");
    $("rotateKey").disabled=true; $("copyKey").disabled=true;
    $("apiKey").textContent="Inicia sesión para crear tu clave";
    $("myToday").textContent="—"; $("myErrors").textContent="—";
    return;
  }
  const u=session.user;
  $("connection").textContent="Conectado";
  $("profileInfo").innerHTML=`<b>${escapeHtml(u.name||"Usuario")}</b><br><span class="muted">${escapeHtml(u.email)}</span><br><span class="pill ${u.role==="admin"?"purple":"green"}">${escapeHtml(u.role)}</span>`;
  $("avatar").innerHTML=u.avatar_url?`<img src="${escapeHtml(u.avatar_url)}" alt="">`:escapeHtml((u.name||"S").slice(0,1).toUpperCase());
  $("loginBtn").textContent=u.name||"Mi cuenta"; $("heroLogin").textContent="Sesión iniciada ✓";
  $("logoutBtn").classList.remove("hidden"); $("rotateKey").disabled=false;
  $("myToday").textContent=number(session.today?.total); $("myErrors").textContent=number(session.today?.errors);
  $("keyStatus").textContent=session.apiKey?"Activa":"Pendiente";
  $("apiKey").textContent=fullKey || (session.apiKey ? `${session.apiKey.key_prefix}••••••••••••••••` : "No hay una clave activa");
  $("copyKey").disabled=!fullKey;
  $("testKey").value=fullKey||$("testKey").value;
  if(u.role==="admin") loadAdmin();
}
async function loadAdmin(){
  const {response,data}=await api("/api/admin/overview");
  if(!response.ok)return;
  $("adminPanel").classList.remove("hidden");
  $("totalRequests").textContent=number(data.totals?.total);
  $("totalErrors").textContent=number(data.totals?.errors);
  $("usersTable").innerHTML=(data.users||[]).map(u=>`<tr><td>${escapeHtml(u.name||"Usuario")}</td><td>${escapeHtml(u.email)}</td><td>${number(u.today_total)}</td><td>${number(u.today_errors)}</td><td><span class="pill ${u.role==="admin"?"purple":""}">${escapeHtml(u.role)}</span></td></tr>`).join("")||'<tr><td colspan="5">Todavía no hay usuarios.</td></tr>';
  $("endpointStats").innerHTML=(data.endpoints||[]).map(e=>`<div><b>${number(e.total)} solicitudes</b><span>${escapeHtml(e.endpoint)} · ${number(e.errors)} errores</span></div>`).join("")||"<p class='muted'>Sin solicitudes registradas.</p>";
}
async function loadStats(){
  const {response,data}=await api("/api/stats/public");
  if(response.ok){$("totalRequests").textContent=number(data.totals?.total);$("totalErrors").textContent=number(data.totals?.errors)}
}
function login(){location.href="/auth/google"}
$("loginBtn").addEventListener("click",login); $("heroLogin").addEventListener("click",login);
$("menuToggle").addEventListener("click",()=>$("nav").classList.toggle("open"));
document.querySelectorAll("#nav a").forEach(a=>a.addEventListener("click",()=>$("nav").classList.remove("open")));
$("copyKey").addEventListener("click",async()=>{if(!fullKey)return;try{await navigator.clipboard.writeText(fullKey);showNotice("API key copiada. Guárdala en privado.")}catch{showNotice("No se pudo copiar automáticamente; selecciona la clave.",true)}});
$("rotateKey").addEventListener("click",async()=>{
 if(!confirm("La clave actual dejará de funcionar. ¿Crear otra?"))return;
 const {response,data}=await api("/api/key/rotate",{method:"POST"});
 if(!response.ok)return showNotice(data.error||"No se pudo regenerar la clave.",true);
 fullKey=data.apiKey;$("apiKey").textContent=fullKey;$("testKey").value=fullKey;$("copyKey").disabled=false;
 showNotice("Nueva API key creada. Cópiala y guárdala ahora.");
});
$("logoutBtn").addEventListener("click",async()=>{await api("/api/logout",{method:"POST"});fullKey="";location.href="/"});
$("runTest").addEventListener("click",async()=>{
 const path=$("endpointSelect").value;
 const headers={};const key=$("testKey").value.trim();if(key)headers["x-api-key"]=key;
 $("testResult").textContent="Consultando…";
 const {response,data}=await api(path,{headers});
 $("testResult").textContent=JSON.stringify({http_status:response.status,...data},null,2);
});
document.querySelectorAll(".copy-snippet").forEach(b=>b.addEventListener("click",async()=>{try{await navigator.clipboard.writeText($(b.dataset.target).textContent);showNotice("Código copiado.")}catch{showNotice("No se pudo copiar; selecciona el código.",true)}}));
$("loadAudio").addEventListener("click",()=>{const value=$("audioUrl").value.trim();if(!value)return showNotice("Pega una URL directa de audio.",true);try{const u=new URL(value);if(!["http:","https:"].includes(u.protocol))throw Error();$("audioPlayer").src=u.href;$("audioPlayer").load();showNotice("Audio cargado. Pulsa reproducir.")}catch{showNotice("URL no válida.",true)}});
(async()=>{
 const params=new URLSearchParams(location.search);
 if(params.get("login")==="success"){
   if(params.get("newkey")){fullKey=params.get("newkey");showNotice("¡Cuenta conectada! Tu API key se creó automáticamente. Cópiala y guárdala ahora.");}
   history.replaceState({}, "", location.pathname+location.hash);
 }
 await loadSession();
 if(fullKey){$("apiKey").textContent=fullKey;$("testKey").value=fullKey;$("copyKey").disabled=false;}
 await loadStats();
})();
