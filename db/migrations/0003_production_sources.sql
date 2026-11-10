-- Each series keeps the source it came from (RNF-02, docs/05).
-- New columns are filled from the well/field source for rows loaded before this migration.

ALTER TABLE production_daily
  ADD COLUMN source_id int REFERENCES data_source(id);

ALTER TABLE trajectory_station
  ADD COLUMN source_id int REFERENCES data_source(id);

ALTER TABLE field_production_monthly
  ADD COLUMN source_id int REFERENCES data_source(id);

UPDATE production_daily p
SET source_id = w.source_id
FROM well w
WHERE w.id = p.well_id;

UPDATE trajectory_station t
SET source_id = w.source_id
FROM well w
WHERE w.id = t.well_id;

UPDATE field_production_monthly m
SET source_id = f.source_id
FROM field f
WHERE f.id = m.field_id;

ALTER TABLE production_daily ALTER COLUMN source_id SET NOT NULL;
ALTER TABLE trajectory_station ALTER COLUMN source_id SET NOT NULL;
ALTER TABLE field_production_monthly ALTER COLUMN source_id SET NOT NULL;
