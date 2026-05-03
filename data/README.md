# Data Layout

This directory is split into two different concerns:

- `imports/` holds raw researcher-provided files that are approved for analysis.
- `databases/` holds SQLite databases, schema snapshots, and other SQL-backed artifacts.

The intent is to keep the prototype reproducible and auditable:

- imports are explicit and reviewed before the agent reads them
- databases are versioned separately from raw inputs
- runtime code should only read from approved, documented locations

Recommended workflow:

1. Drop raw files into `data/imports/`.
2. Record the approved files in a manifest.
3. Import or index them into the SQLite layer under `data/databases/`.
4. Let the agent analyze only the imported/indexed data, not arbitrary repo files.
