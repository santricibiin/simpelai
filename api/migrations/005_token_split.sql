ALTER TABLE api_keys
  ADD COLUMN tokens_in BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER tokens_used,
  ADD COLUMN tokens_out BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER tokens_in;

UPDATE api_keys k
LEFT JOIN (
  SELECT api_key_id,
         COALESCE(SUM(prompt_tokens), 0) AS pin,
         COALESCE(SUM(completion_tokens), 0) AS pout
  FROM usage_events
  WHERE api_key_id IS NOT NULL
  GROUP BY api_key_id
) e ON e.api_key_id = k.id
SET k.tokens_in = COALESCE(e.pin, 0),
    k.tokens_out = COALESCE(e.pout, 0);
