CREATE TABLE IF NOT EXISTS events (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 type TEXT NOT NULL CHECK(type IN ('Corrida','Futebol')),
 platform TEXT NOT NULL CHECK(platform IN ('Foco Radical','Banlek','Outra plataforma')),
 place TEXT NOT NULL,
 date TEXT NOT NULL,
 url TEXT NOT NULL,
 image TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('draft','published')),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_status_date ON events(status,date DESC);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY,
 expires_at INTEGER NOT NULL
);
