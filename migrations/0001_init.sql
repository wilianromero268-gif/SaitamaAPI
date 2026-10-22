CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS endpoint_stats (
  endpoint TEXT PRIMARY KEY,
  total INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS usage_daily (
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO stats (id, total, errors) VALUES (1, 0, 0);

CREATE TABLE IF NOT EXISTS endpoints (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  method TEXT NOT NULL DEFAULT 'GET',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General'
);

INSERT OR IGNORE INTO endpoints (id,name,path,method,description,category) VALUES
('ping','Ping','/api/ping','GET','Comprueba si la API está activa.','Sistema'),
('info','Información','/api/info','GET','Información de la API.','Sistema'),
('random','Número aleatorio','/api/random','GET','Genera un número aleatorio.','Utilidades'),
('uuid','UUID','/api/uuid','GET','Genera un UUID.','Utilidades'),
('time','Hora','/api/time','GET','Fecha y hora UTC.','Utilidades'),
('ytsearch','Buscar YouTube','/api/ytsearch','GET','Busca videos; requiere configurar YTSEARCH_URL para un proveedor externo.','Buscadores'),
('download','Descarga multimedia','/api/download','GET','Endpoint preparado para conectar un proveedor de descargas.','Descargas');
