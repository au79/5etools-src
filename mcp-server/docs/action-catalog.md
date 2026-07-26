# Action catalog manifest

Phase 5 G4's first released reference slice exposes the `action` collection from `data/actions.json` as raw,
source-aware records. Each action has a stable `action/<name>/<source>` ID; duplicate names remain ambiguous until a
caller supplies a source or stable ID.

The catalog validates recursive tagged `entries` without rendering them. It excludes Foundry and fluff action files,
which are presentation data rather than this raw reference domain.
