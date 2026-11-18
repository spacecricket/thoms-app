import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every route in this app is dynamic and there is no ISR, so the default
// (no-op) incremental cache is enough. Enable the R2 incremental cache if
// static/ISR caching is ever added.
export default defineCloudflareConfig({});
