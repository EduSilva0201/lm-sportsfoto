CREATE TABLE categories (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('album','photo')),
 name TEXT NOT NULL,
 normalized_name TEXT NOT NULL,
 UNIQUE(kind,normalized_name)
);
INSERT INTO categories VALUES ('corrida','album','Corrida','corrida'),('futebol','album','Futebol','futebol');
CREATE TABLE events_new (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
 platform TEXT NOT NULL CHECK(platform IN ('Foco Radical','Banlek','Outra plataforma')),
 place TEXT NOT NULL, date TEXT NOT NULL, url TEXT NOT NULL, image TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('draft','published')),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 photo_type TEXT NOT NULL DEFAULT ''
);
INSERT INTO events_new (id,name,type,platform,place,date,url,image,status,created_at,updated_at)
 SELECT id,name,type,platform,place,date,url,image,status,created_at,updated_at FROM events;
DROP TABLE events;
ALTER TABLE events_new RENAME TO events;
CREATE INDEX events_status_date ON events(status,date DESC);
