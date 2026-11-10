-- Log curves keep the source they came from, like the other series (RNF-02, docs/05).
-- Curves loaded before this migration take the source of their well.

ALTER TABLE log_curve
  ADD COLUMN source_id int REFERENCES data_source(id);

UPDATE log_curve l
SET source_id = w.source_id
FROM well w
WHERE w.id = l.well_id;

ALTER TABLE log_curve ALTER COLUMN source_id SET NOT NULL;
