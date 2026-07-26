# Catalog record-shape inventory

This note records the current checked-in catalog shapes used by the strict schemas. It is an inventory, not a
normalization rule: catalog and query layers retain each validated raw record unchanged inside provenance envelopes.

## Shared layer

Every enabled entity record currently has `name` and `source`. `page` is present when the source has a page reference.
`edition`, `reprintedAs`, `additionalSources`, and `otherSources` are optional provenance relationships. `entries` is
optional recursive tagged text; tags such as `{@spell shield}` remain raw strings and are never rendered or rewritten.

The shared TypeScript model is `src/recordShapes.ts`. It explicitly walks nested `entries` and `items` arrays while
leaving all text byte/value equivalent. It supports the observed entry object types:

`abilityAttackMod`, `abilityDc`, `entries`, `inset`, `item`, `itemSpell`, `list`, `options`, `quote`,
`refClassFeature`, `refFeat`, `refOptionalfeature`, `refSubclassFeature`, `section`, `statblock`, and `table`.

## Enabled collections

| Collection        | Identity and relationship fields                                                               | Domain-specific shape families observed                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `race`            | `name`, `source`, `page`, `edition`, `reprintedAs`, source links                               | size, speed, ability, creature type, senses, defenses, proficiencies, spells, feats, lineage, trait tags, and entries                |
| `subrace`         | `name`, `source`, `page`, `raceName`, `raceSource`, `reprintedAs`, source links                | inherited/overwritten race traits, ability, speed, proficiencies, spells, feats, tags, and entries                                   |
| `background`      | `name`, `source`, `page`, `edition`, `reprintedAs`, source links                               | ability, skill/tool/language proficiencies, starting equipment, feat choices, spells, prerequisites, and entries                     |
| `feat`            | `name`, `source`, `page`, `reprintedAs`, source links                                          | ability changes, prerequisites, repeatability, proficiencies, senses, defenses, optional-feature progression, and entries            |
| `optionalfeature` | `name`, `source`, `page`, `reprintedAs`, source links                                          | feature type, prerequisites, progression, consumption metadata, proficiencies, senses, spells, and entries                           |
| `facility`        | `name`, `source`, `page`, `level`                                                              | facility type, space, hirelings, orders, prerequisites, presentation flag, and entries; stored in `bastions.json`                    |
| `spell`           | `name`, `source`, `page`, `level`, `school`, source links                                      | time, range, components, duration, scaling, effects/tags, higher-level entries, and metadata; discovered through `spells/index.json` |
| `item`            | `name`, `source`, `page`, type, rarity, source links                                           | raw base-item references, properties, attached-spell references, entries, and equipment statistics; no inheritance resolution        |
| `itemBase`        | `name`, `source`, `page`, type, rarity, source links                                           | raw base equipment statistics, properties, pack contents, and entries                                                                |
| `vehicle`         | `name`, `source`, `page`, vehicle type, source links                                           | raw vehicle statistics, stations, actions, movement, weapons, and entries                                                            |
| `class`           | `name`, `source`, `page`, `edition`, `reprintedAs`, source links                               | hit dice, proficiencies, spellcasting/progression, class feature references, tables, equipment, multiclassing, and subclass title    |
| `subclass`        | `name`, `source`, `page`, `className`, `classSource`, `shortName`, `reprintedAs`, source links | subclass feature references, spellcasting/progression overrides, and subclass tables                                                 |
| `classFeature`    | `name`, `source`, `page`, `className`, `classSource`, `level`, source links                    | entries, header/variant flags, and consumption metadata                                                                              |
| `subclassFeature` | `name`, `source`, `page`, class and subclass identifiers, `level`, source links                | entries, header/variant flags, and consumption metadata                                                                              |

## Explicit extension points

The current files use `_copy` and `_versions` as source-data inheritance/version metadata. They are documented extension
points, not arbitrary passthrough fields. `hasFluff`, `hasFluffImages`, `fluff`, and presentation-only class files are
also explicit presentation metadata and are not a new public MCP domain.

`src/validation.ts` uses strict collection schemas: an unknown top-level record field, renamed field, incompatible
type, or unknown nested structure fails validation unless this note and the schema are amended intentionally.
Domain-specific payloads remain in the raw record rather than being flattened into the shared layer.

## Equipment collections

Phase 5 G3 treats every top-level equipment collection as public raw data, rather than hiding companion collections
as metadata. Each has the same provenance envelope as the other catalog records.

| Collection                  | Public domain               | Stable identity          | Notes                                                                               |
| --------------------------- | --------------------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| `item`                      | `item`                      | `name`, `source`         | Raw equipment, including unresolved base-item and attached-spell references.        |
| `itemGroup`                 | `itemGroup`                 | `name`, `source`         | Named item bundles from `items.json`.                                               |
| `baseitem`                  | `itemBase`                  | `name`, `source`         | Raw base equipment statistics from `items-base.json`.                               |
| `itemProperty`              | `itemProperty`              | `abbreviation`, `source` | Most current records have no `name`; the abbreviation is the stable identity field. |
| `itemType`                  | `itemType`                  | `name`, `source`         | Item-type definitions from `items-base.json`.                                       |
| `itemTypeAdditionalEntries` | `itemTypeAdditionalEntries` | `name`, `source`         | Additional raw entries associated with item types.                                  |
| `itemEntry`                 | `itemEntry`                 | `name`, `source`         | Reusable raw item-entry templates.                                                  |
| `itemMastery`               | `itemMastery`               | `name`, `source`         | Weapon-mastery definitions.                                                         |
| `vehicleUpgrade`            | `vehicleUpgrade`            | `name`, `source`         | Named vehicle upgrades from `vehicles.json`.                                        |

References remain raw; exposing them does not authorize inheritance resolution, inventory management, pricing
workflows, or character-state writes.
