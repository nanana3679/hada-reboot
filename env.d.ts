/// <reference types="@cloudflare/workers-types" />

// Augment the global CloudflareEnv interface declared by @opennextjs/cloudflare
// to include project-specific Cloudflare bindings.
// Access via: const { env } = await getCloudflareContext({ async: true })
declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }
}

export {};
