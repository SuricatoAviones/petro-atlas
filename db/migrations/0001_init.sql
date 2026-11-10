-- Initial schema: the DDL section of docs/05-base-de-datos.md.
-- Published migrations are never edited; changes go in a new numbered file.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE data_source (
  id          serial PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  license     text NOT NULL,
  url         text NOT NULL,
  ingested_at timestamptz
);

CREATE TABLE field (
  id        serial PRIMARY KEY,
  source_id int  NOT NULL REFERENCES data_source(id),
  name      text NOT NULL,
  operator  text,
  status    text,
  geom      geometry(MultiPolygon, 4326)
);

CREATE TABLE well (
  id            serial PRIMARY KEY,
  field_id      int  REFERENCES field(id),
  source_id     int  NOT NULL REFERENCES data_source(id),
  name          text NOT NULL,
  well_type     text CHECK (well_type IN ('producer','injector','exploration','observation')),
  status        text,
  spud_date     date,
  total_depth_m real,
  geom          geometry(Point, 4326) NOT NULL,
  UNIQUE (source_id, name)
);

CREATE TABLE production_daily (
  well_id       int  NOT NULL REFERENCES well(id) ON DELETE CASCADE,
  date          date NOT NULL,
  oil_sm3       real,
  gas_sm3       real,
  water_sm3     real,
  water_inj_sm3 real,
  on_stream_h   real,
  bhp_bar       real,
  whp_bar       real,
  bht_c         real,
  wht_c         real,
  choke_pct     real,
  PRIMARY KEY (well_id, date)
);

CREATE TABLE field_production_monthly (
  field_id  int  NOT NULL REFERENCES field(id) ON DELETE CASCADE,
  month     date NOT NULL,
  oil_sm3   real,
  gas_sm3   real,
  water_sm3 real,
  PRIMARY KEY (field_id, month)
);

CREATE TABLE trajectory_station (
  well_id  int  NOT NULL REFERENCES well(id) ON DELETE CASCADE,
  md_m     real NOT NULL,
  tvd_m    real NOT NULL,
  incl_deg real,
  azim_deg real,
  PRIMARY KEY (well_id, md_m)
);

CREATE TABLE log_curve (
  id       serial PRIMARY KEY,
  well_id  int  NOT NULL REFERENCES well(id) ON DELETE CASCADE,
  mnemonic text NOT NULL,
  unit     text,
  top_m    real NOT NULL,
  base_m   real NOT NULL,
  samples  real[] NOT NULL,
  UNIQUE (well_id, mnemonic)
);

CREATE INDEX well_geom_idx   ON well  USING gist (geom);
CREATE INDEX field_geom_idx  ON field USING gist (geom);
CREATE INDEX well_field_idx  ON well (field_id);
CREATE INDEX well_status_idx ON well (status, well_type);
