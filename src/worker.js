import {endpoints,findEndpoint} from './endpoints/index.js';
const LIMIT=450, CREATOR='SAI', YEAR=2026;
const json=(d,s=200)=>new Response(JSON.stringify(d,null,2),{status:s,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
const day=()=>new Date().toISOString().slice(0,10);
async function hash(v){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function getKey(req){const u=new URL(req.url);const q=u.searchParams.get('apikey')||u.searchParams.get('api_key');if(q)return q;const h=req.headers.get('x-api-key');if(h)return h;const a=req.headers.get('authorization')||'';return a.toLowerCase().startsWith('bearer ')?a.slice(7).trim():null;}
async function keyRow(env,key){if(!key)return null;return env.DB.prepare('SELECT * FROM api_keys WHERE key_hash=? AND active=1').bind(await hash(key)).first();}
async function usage(env,id){return env.DB.prepare('SELECT requests,errors FROM usage_daily WHERE key_id=? AND day=?').bind(id,day()).first()||{requests:0,errors:0};}
async function log(env,keyId,path,method,status,error){await env.DB.prepare('INSERT INTO request_logs(key_id,path,method,status,error,created_at) VALUES(?,?,?,?,?,?)').bind(keyId,path,method,status,error?1:0,new Date().toISOString()).run();}
async function bump(env,id,isError){await env.DB.prepare(`INSERT INTO usage_daily(key_id,day,requests,errors) VALUES(?,?,1,?) ON CONFLICT(key_id,day) DO UPDATE SET requests=requests+1, errors=errors+excluded.errors`).bind(id,day(),isError?1:0).run();}
async function admin(req,env){return req.headers.get('x-dashboard-secret')===env.DASHBOARD_SECRET||new URL(req.url).searchParams.get('secret')===env.DASHBOARD_SECRET;}
async function dashboardApi(req,env,u){
 if(!(await admin(req,env)))return json({status:false,error:'Dashboard secret requerido'},401);
 if(u.pathname==='/dashboard/api/stats'){
  const k=await env.DB.prepare('SELECT id,key_prefix,created_at FROM api_keys WHERE active=1 ORDER BY id DESC LIMIT 1').first();
  const us=k?await usage(env,k.id):{requests:0,errors:0};
  return json({status:true,creator:CREATOR,year:YEAR,limit:LIMIT,keyActive:!!k,keyPrefix:k?.key_prefix||null,createdAt:k?.created_at||null,requests:us.requests,errors:us.errors,remaining:Math.max(0,LIMIT-us.requests)});
 }
 if(u.pathname==='/dashboard/api/key/generate'&&req.method==='POST'){
  await env.DB.prepare('UPDATE api_keys SET active=0,deleted_at=? WHERE active=1').bind(new Date().toISOString()).run();
  const raw='sai_'+[...crypto.getRandomValues(new Uint8Array(24))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const h=await hash(raw), now=new Date().toISOString();
  await env.DB.prepare('INSERT INTO api_keys(key_hash,key_prefix,active,created_at) VALUES(?,?,1,?,?)').bind(h,raw.slice(0,12)+'...',1,now).run().catch(async()=>{await env.DB.prepare('INSERT INTO api_keys(key_hash,key_prefix,active,created_at) VALUES(?,?,?,?)').bind(h,raw.slice(0,12)+'...',1,now).run()});
  return json({status:true,message:'Guarda esta clave. Se muestra completa una sola vez.',apiKey:raw,limitPerDay:LIMIT});
 }
 if(u.pathname==='/dashboard/api/key/delete'&&req.method==='DELETE'){
  await env.DB.prepare('UPDATE api_keys SET active=0,deleted_at=? WHERE active=1').bind(new Date().toISOString()).run();return json({status:true,message:'Clave eliminada'});
 }
 if(u.pathname==='/dashboard/api/logs'){
  const r=await env.DB.prepare('SELECT path,method,status,error,created_at FROM request_logs ORDER BY id DESC LIMIT 100').all();return json({status:true,logs:r.results||[]});
 }
 return json({status:false,error:'Ruta dashboard no encontrada'},404);
}
async function handleApi(req,env,u){
 const ep=findEndpoint(u.pathname,req.method);if(!ep)return json({status:false,error:'Endpoint no encontrado'},404);
 const raw=getKey(req);const k=await keyRow(env,raw);if(!k){await log(env,null,u.pathname,req.method,401,true);return json({status:false,error:'API key inválida o ausente'},401);}
 const us=await usage(env,k.id);if(us.requests>=LIMIT){await log(env,k.id,u.pathname,req.method,429,true);return json({status:false,error:'Límite diario alcanzado',limit:LIMIT,used:us.requests},429);}
 try{const data=await ep.run(req,env);await bump(env,k.id,false);await log(env,k.id,u.pathname,req.method,200,false);return json(data,200)}catch(e){await bump(env,k.id,true);await log(env,k.id,u.pathname,req.method,500,true);return json({status:false,error:'Error interno',message:e.message},500)}
}
export default {async fetch(req,env){const u=new URL(req.url);if(u.pathname==='/api/docs')return json({status:true,creator:CREATOR,year:YEAR,limitPerDay:LIMIT,endpoints:endpoints.map(e=>e.meta)});if(u.pathname.startsWith('/dashboard/api/'))return dashboardApi(req,env,u);if(u.pathname.startsWith('/api/'))return handleApi(req,env,u);if(env.ASSETS)return env.ASSETS.fetch(req);return new Response('SaitamaAPI',{status:200})}};
