# Equipment catalog manifest

Phase 5 G3 exposes every checked-in top-level equipment collection as a separate raw-record domain.

| Source file            | Collection                  | Public domain               | Identity                 |
| ---------------------- | --------------------------- | --------------------------- | ------------------------ |
| `data/items.json`      | `item`                      | `item`                      | `name`, `source`         |
| `data/items.json`      | `itemGroup`                 | `itemGroup`                 | `name`, `source`         |
| `data/items-base.json` | `baseitem`                  | `itemBase`                  | `name`, `source`         |
| `data/items-base.json` | `itemProperty`              | `itemProperty`              | `abbreviation`, `source` |
| `data/items-base.json` | `itemType`                  | `itemType`                  | `name`, `source`         |
| `data/items-base.json` | `itemTypeAdditionalEntries` | `itemTypeAdditionalEntries` | `name`, `source`         |
| `data/items-base.json` | `itemEntry`                 | `itemEntry`                 | `name`, `source`         |
| `data/items-base.json` | `itemMastery`               | `itemMastery`               | `name`, `source`         |
| `data/vehicles.json`   | `vehicle`                   | `vehicle`                   | `name`, `source`         |
| `data/vehicles.json`   | `vehicleUpgrade`            | `vehicleUpgrade`            | `name`, `source`         |

The manifest must reject a new or renamed top-level collection until it has an explicit domain, schema, and identity
contract. Each collection is served as raw validated data with source-file provenance. No relation is resolved or
merged across collections.
