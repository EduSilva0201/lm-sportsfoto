CREATE TABLE categories(id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN ('album','photo')),name TEXT NOT NULL,normalized_name TEXT NOT NULL,UNIQUE(kind,normalized_name));
INSERT INTO categories VALUES ('corrida','album','Corrida','corrida'),('futebol','album','Futebol','futebol');
CREATE TABLE events(id TEXT PRIMARY KEY,name TEXT NOT NULL,type TEXT NOT NULL,platform TEXT NOT NULL CHECK(platform IN ('Foco Radical','Banlek','Outra plataforma')),place TEXT NOT NULL,date TEXT NOT NULL,url TEXT NOT NULL,image TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('draft','published')),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,photo_type TEXT NOT NULL DEFAULT '',description TEXT NOT NULL DEFAULT '');
CREATE INDEX events_status_date ON events(status,date DESC);
CREATE TABLE site_content(id INTEGER PRIMARY KEY CHECK(id=1),content TEXT NOT NULL);
