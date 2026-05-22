/**
 * Central Input Validation & Sanitization Library for LinkUp
 */

/** Validates a UUID (version 4) */
export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validates a room identifier which can be either a UUID or a vanity slug.
 * Slug rules: 2-100 characters, alphanumeric, hyphens or underscores.
 */
export function validateRoomId(id: string): boolean {
  if (!id) return false;
  const slugRegex = /^[A-Za-z0-9_-]{2,100}$/;
  return validateUUID(id) || slugRegex.test(id);
}

/** Sanitizes a string for safe HTML output */
export function sanitizeInput(text: string): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/** Validates a base64 encoded data string */
export function validateBase64(data: string): boolean {
  if (typeof data !== "string") return false;
  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  // If data contains a data URI prefix, strip it
  const payload = data.split(",")[1] || data;
  return base64Regex.test(payload);
}

/** Whitelist check for allowed uploaded file MIME types */
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
];

export function validateMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

/** Validates WebRTC drawing canvas color values (Hex, RGB, RGBA, or CSS keywords) */
export function validateColor(color: string): boolean {
  if (typeof color !== "string") return false;
  const hexRegex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  const rgbRegex = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+)\s*)?\)$/i;
  const namedColors = ["black", "white", "red", "green", "blue", "yellow", "orange", "purple", "pink", "gray", "indigo"];
  return hexRegex.test(color) || rgbRegex.test(color) || namedColors.includes(color.toLowerCase());
}
