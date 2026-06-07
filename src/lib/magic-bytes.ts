/**
 * Magic-byte helpers for upload validation.
 *
 * This module checks the leading bytes of a file buffer to catch mislabeled
 * uploads (e.g. an HTML file renamed to .pdf). It does NOT detect malware,
 * polyglot files, or embedded payloads — only that the declared MIME type
 * matches the known signature bytes.
 *
 * Limitation: The DOCX signature is the generic ZIP header (PK\x03\x04),
 * so any zip-based file (xlsx, odt, jar, zip, …) will pass the DOCX check.
 * That is inherent to the format; there is no deeper fix without parsing the
 * ZIP central directory.
 */

export const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

export const MAGIC_BYTES: [string, Uint8Array][] = [
  ["application/pdf", new Uint8Array([0x25, 0x50, 0x44, 0x46])],
  ["image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
  ["image/jpeg", new Uint8Array([0xff, 0xd8, 0xff])],
  ["application/msword", new Uint8Array([0xd0, 0xcf, 0x11, 0xe0])],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
  ],
];

/**
 * Returns true if the leading bytes of `buffer` match the known signature
 * for `declaredType`. Returns false when no signature is registered for the
 * type or when the buffer is too short.
 */
export function matchesMagic(buffer: Buffer, declaredType: string): boolean {
  for (const [mimeType, magic] of MAGIC_BYTES) {
    if (mimeType === declaredType) {
      if (buffer.length < magic.length) return false;
      return magic.every((byte, i) => buffer[i] === byte);
    }
  }
  return false;
}
