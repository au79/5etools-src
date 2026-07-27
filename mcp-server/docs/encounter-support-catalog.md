# Encounter support catalog manifest

P5-08 exposes raw, source-aware `encounter`, `lootIndividual`, `lootHoard`, `lootDragon`, `lootGem`,
`lootArtObject`, and `lootMagicItem` records from `encounters.json` and `loot.json`. IDs use
`<domain>/<name>/<source>`. Random-table entries remain raw; the server performs no selection, rolling, mutation, or
persistence.

`lootDragonMundaneItemTable` exposes the anonymous `dragonMundaneItems` array as one raw collection-level record:
`lootdragonmundaneitemtable/ftd`, named `Dragon Mundane Items`, source `FTD`, page 72. Its `data` is the unchanged
array of 25 rows; MCP does not select from, roll on, mutate, or persist that table.
