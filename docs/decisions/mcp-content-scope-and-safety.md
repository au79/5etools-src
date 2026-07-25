# MCP Content Scope and Adventure Safety

Status: approved

## Decision

Enable the primary checked-in `data/` tree by default. Support `prerelease/` and `homebrew/` as explicit options, but keep both disabled by default.

Exclude adventures by default to reduce spoiler risk. Support both an explicit adventure-source allowlist and a broad include-all mode; both modes must produce clear warnings. A future helper may translate readable adventure names into source-ID configuration, but that helper is outside the steel thread.

Validate and use `data/generated/` internally for navigation, redirects, and cross-references. Expose meaningful generated content through normal domains, not a separate `generated` domain.

## Rationale

The default should be safe for player use while still supporting deliberate DM workflows. Generated artifacts are useful implementation data but are not an independent source of truth.

## Consequences

- Adventure configuration must be enforced consistently in startup validation, search, exact retrieval, and response warnings.
- All-adventure mode is convenient but carries higher spoiler risk than an allowlist.
- The adventure helper and its readable-name UX are deferred.

## Revisit triggers

Revisit when the DM workflow needs campaign-specific adventure configuration, when homebrew/prerelease defaults become appropriate, or when generated data needs a user-facing capability not represented by an existing domain.
