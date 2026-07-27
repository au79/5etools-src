# Condition reference catalog manifest

P5-06B exposes `condition`, `disease`, and `status` from `data/conditionsdiseases.json` as separate raw,
source-aware domains. Each uses a stable `<domain>/<name>/<source>` ID; duplicate names require a source or ID.

Recursive tagged entries remain raw. Fluff is excluded from this reference slice.
