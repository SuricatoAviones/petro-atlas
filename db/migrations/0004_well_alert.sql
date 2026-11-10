-- Alerts for public wells (docs/05, "Vista de alertas"; docs/09).
-- The thresholds must match the defaults of petro-calc/alerts when that module exists.

CREATE VIEW well_alert AS
WITH last AS (
  SELECT well_id, max(date) AS d
  FROM production_daily
  GROUP BY well_id
),
agg AS (
  SELECT p.well_id,
    avg(p.oil_sm3) FILTER (WHERE p.date > l.d - 7)                       AS oil_7d,
    avg(p.oil_sm3) FILTER (WHERE p.date <= l.d - 7 AND p.date > l.d - 37) AS oil_prev30,
    sum(p.oil_sm3) FILTER (WHERE p.date > l.d - 7)                       AS oil_sum_7d,
    sum(p.water_sm3) FILTER (WHERE p.date > l.d - 7)                     AS water_sum_7d,
    sum(coalesce(p.oil_sm3, 0) + coalesce(p.gas_sm3, 0))
      FILTER (WHERE p.date > l.d - 3)                                    AS prod_3d,
    l.d AS as_of
  FROM production_daily p
  JOIN last l USING (well_id)
  GROUP BY p.well_id, l.d
)
SELECT well_id,
  as_of,
  oil_7d,
  oil_prev30,
  water_sum_7d / nullif(water_sum_7d + oil_sum_7d, 0) AS water_cut_7d,
  prod_3d,
  CASE
    WHEN oil_prev30 > 0 AND oil_7d < 0.50 * oil_prev30 THEN 'critical'
    WHEN oil_prev30 > 0 AND oil_7d < 0.75 * oil_prev30 THEN 'warning'
  END AS production_drop,
  water_sum_7d / nullif(water_sum_7d + oil_sum_7d, 0) > 0.80 AS high_water_cut,
  prod_3d = 0 AS no_production
FROM agg;
