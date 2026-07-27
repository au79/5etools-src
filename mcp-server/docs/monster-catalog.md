# Monster catalog manifest

P5-07A exposes the `monster` records named by `data/bestiary/index.json`. Only index-listed
`bestiary-*.json` entity files are loaded; fluff, Foundry data, `legendarygroups.json`, and `template.json` remain
excluded. IDs use `monster/<name>/<source>`.

On the supported local Node 24 runtime, catalog construction measured 695 ms for 154 loaded entity/catalog files,
12,898 total records, and 4,528 monsters. This is the current development budget baseline; later changes should
measure against it rather than assume a cost.
