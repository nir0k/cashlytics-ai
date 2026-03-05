---
source: Context7 API
library: Next.js
package: nextjs
topic: Next.js 16 route handlers and server actions file upload patterns
fetched: 2026-03-04T00:00:00Z
official_docs: https://nextjs.org/docs
---

## Route handlers: multipart upload entrypoint

- In App Router route handlers, parse multipart bodies with `await request.formData()`.
- Access submitted values with `formData.get('field')`.
- Next.js docs note this path is recommended for form submissions and file uploads.

```ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const name = formData.get("name");
  const email = formData.get("email");
  return Response.json({ name, email });
}
```

Source: `docs/01-app/03-api-reference/03-file-conventions/route.mdx`

## Server Actions: form action receives FormData

- Server Actions receive `FormData` directly when used as `<form action={serverFn}>`.
- This is the documented path for server-side form processing.

```ts
"use server";

export async function createPost(formData: FormData) {
  const title = formData.get("title");
  const content = formData.get("content");
}
```

Source: `docs/01-app/01-getting-started/08-updating-data.mdx`, `docs/01-app/02-guides/forms.mdx`

## File input caveat in Next.js Form component

- If `<Form action="/path">` uses a string action, file inputs submit filename strings (native navigation behavior).
- For real file upload objects, use a function action (Server Action) instead.

Source: `docs/01-app/03-api-reference/02-components/form.mdx`

## Upload/body size guardrails

- `experimental.serverActions.bodySizeLimit` controls max Server Action request body size.
- Default is `1MB`; docs frame this as resource and DDoS protection.
- Supports string values like `'2mb'`.

```js
module.exports = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};
```

Source: `docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.mdx`

- `proxyClientMaxBodySize` controls proxy buffering size; when exceeded, Next.js buffers only the first N bytes and logs a warning.
- Request handling continues, but downstream reads only partial body unless you raise the limit or handle partial data.

Source: `docs/01-app/03-api-reference/05-config/01-next-config-js/proxyClientMaxBodySize.mdx`

## Validation recommendation from docs

- Route handler form values are strings by default.
- Docs recommend `zod-form-data` for typed validation/conversion before processing.

Source: `docs/01-app/03-api-reference/03-file-conventions/route.mdx`
