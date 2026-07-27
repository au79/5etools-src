# Adventure and book metadata catalog

Adventure and book catalog metadata is disabled by default. Enable it with the existing `adventures` policy:
`allowlist` returns only approved source IDs, while `all` returns every metadata record and emits the configuration
warning.

These records are sanitized metadata only: identity, name, source, grouping, publication, author, and selected
adventure storyline/level fields. The service does not discover or load contents, covers, maps, images, or text files
in this release.
