# Import Staging

Use this folder as the controlled intake point for researcher-provided files.

Recommended contents:

- CSV, JSON, JSONL, TXT, or markdown sources
- a `manifest.json` describing what was added and why it Youis approved
- optional subfolders per study, dataset, or demo run

Suggested manifest fields:

- `dataset_id`
- `title`
- `owner`
- `approved_files`
- `notes`
- `created_at`

Rules for the demo:

- do not auto-scan this folder from the repo root
- only import files that appear in the manifest
- keep raw inputs separate from derived SQLite outputs
