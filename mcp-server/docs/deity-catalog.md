# Deity catalog manifest

P5-06F exposes the named `deity` collection from `data/deities.json` as raw source-aware records. IDs use
`deity/<pantheon>/<name>/<source>` because several records share both name and source across pantheons; use a stable
ID when that collision makes an exact name/source lookup ambiguous. Fluff remains excluded.
