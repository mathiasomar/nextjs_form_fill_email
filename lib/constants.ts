/** Client-side limit per file AFTER image compression. Vercel rejects request bodies > 4.5 MB in total. Raise it if you self-host. */
export const MAX_FILE_MB = 4;
/** Server-side hard limits. */
export const MAX_FILE_BYTES = 7 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // keep under Gmail's 25 MB message limit
export const CHILD_ADULT_AGE = 23;
