-- PetroAtlas now ships only synthetic Venezuelan example data (docs/10).
-- Remove the Norwegian public datasets and the previous synthetic field from existing databases;
-- the seed recreates the new example field with its own source.
DELETE FROM well
WHERE source_id IN (
  SELECT id FROM data_source
  WHERE name IN ('Sodir FactPages', 'Volve (Equinor)', 'PetroAtlas synthetic seed')
);

DELETE FROM field
WHERE source_id IN (
  SELECT id FROM data_source
  WHERE name IN ('Sodir FactPages', 'Volve (Equinor)', 'PetroAtlas synthetic seed')
);

DELETE FROM data_source
WHERE name IN ('Sodir FactPages', 'Volve (Equinor)', 'PetroAtlas synthetic seed');
