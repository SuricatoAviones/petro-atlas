/**
 * SQL expression of the alert level of a well (docs/05, "Vista de alertas"; docs/09).
 * The aliases `a` (well_alert) and `w` (well) must be in scope.
 */
export const WELL_ALERT_LEVEL_SQL = `CASE
  WHEN a.production_drop = 'critical'
    OR (a.no_production AND w.well_type = 'producer' AND w.status <> 'abandoned')
    THEN 'critical'
  WHEN a.production_drop = 'warning' OR a.high_water_cut
    THEN 'warning'
END`;
