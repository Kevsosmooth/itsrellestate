export const MAX_FILE_SIZE = 25 * 1024 * 1024;           // 25 MB per file
export const MAX_FILES_PER_APP = 40;                     // abuse guard
export const MAX_BYTES_PER_APP = 300 * 1024 * 1024;      // abuse guard

export function sanitizeFilename(name: string): string {
  return name
    .replace(/^[.\s]+/, "")
    .replace(/[/\\:\0*?"<>|]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 200) || "unnamed";
}
