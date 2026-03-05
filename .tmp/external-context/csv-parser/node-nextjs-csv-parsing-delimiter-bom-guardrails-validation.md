---
source: Context7 API
library: csv-parser
package: csv-parser
topic: Node/Next.js CSV parsing with delimiter BOM guardrails and validation
fetched: 2026-03-04T00:00:00Z
official_docs: https://github.com/mafintosh/csv-parser
---

## Recommended parser pattern for Node/Next.js pipeline

- Use streaming parse (`fs.createReadStream(...).pipe(csv(...))`) to avoid loading whole CSV into memory.
- For BOM-prefixed files, pipe through `strip-bom-stream` before `csv-parser`.

```js
const fs = require("fs");
const csv = require("csv-parser");
const stripBom = require("strip-bom-stream");

fs.createReadStream("data.csv").pipe(stripBom()).pipe(csv());
```

Source: `README.md` (csv-parser)

## Delimiter handling

- Configure non-comma delimiters with `separator` (for example TSV `\t`).

```js
fs.createReadStream("data.tsv").pipe(csv({ separator: "\t" }));
```

Source: `llms.txt` snippets for csv-parser

## Size guardrails

- Use `maxRowBytes` to cap per-row byte size and fail malformed/oversized rows.
- Example from docs sets `10KB` row cap and handles parser errors.

```js
fs.createReadStream("data.csv")
  .pipe(csv({ maxRowBytes: 1024 * 10 }))
  .on("error", (error) => {
    console.error(error.message);
  });
```

Source: `llms.txt` snippets for csv-parser

## Structural validation options

- Use `strict: true` to require row column counts to match headers.
- Use explicit `headers` and `skipLines` when input has no header row or custom prelude lines.

```js
fs.createReadStream("data.csv").pipe(csv({ strict: true }));

fs.createReadStream("data.csv").pipe(csv({ headers: ["name", "age", "city"], skipLines: 0 }));
```

Source: `llms.txt` snippets for csv-parser

## Next.js-specific integration guidance (from fetched docs)

- Next.js route handlers parse multipart upload metadata with `request.formData()`.
- Form values are strings by default; docs suggest `zod-form-data` for validation/type coercion.
- In a CSV staging pipeline, apply row-level schema validation after parsing and before normalization/staging writes.

Source: Next.js `route.mdx` docs fetched via Context7
