-- Readable identifiers for URLs (docs/09, "Estado en la URL"; docs/10, ETL rule 6).
-- The database derives them from the official name, so every writer gets the same result.
--   well:  '15/9-F-12'  -> '15-9-F-12'
--   field: 'VOLVE'      -> 'volve'

ALTER TABLE well
  ADD COLUMN slug text GENERATED ALWAYS AS (
    regexp_replace(btrim(name), '[/[:space:]]+', '-', 'g')
  ) STORED;

ALTER TABLE field
  ADD COLUMN slug text GENERATED ALWAYS AS (
    lower(regexp_replace(btrim(name), '[/[:space:]]+', '-', 'g'))
  ) STORED;

CREATE UNIQUE INDEX well_slug_idx  ON well  (slug);
CREATE UNIQUE INDEX field_slug_idx ON field (slug);
