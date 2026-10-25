/** Avatars are stored as data URLs in Better Auth's `user.image` (a MySQL TEXT column, max 65,535 bytes). */
export const AVATAR_SIZE = 256;
export const AVATAR_MAX_LENGTH = 60_000;
export const AVATAR_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
/** Largest file the user can pick; it is shrunk before upload. */
export const AVATAR_MAX_FILE_BYTES = 10 * 1024 * 1024;

const DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

export function isValidAvatar(value: string) {
  return value.length <= AVATAR_MAX_LENGTH && DATA_URL.test(value);
}

/**
 * Center-crops an image file to a square, scales it to AVATAR_SIZE and
 * encodes it as a data URL small enough to store. Browser only.
 */
export async function fileToAvatar(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();

  // WebP is smallest; browsers that can't encode it fall back to PNG, so try JPEG too.
  for (const quality of [0.85, 0.7, 0.5]) {
    for (const type of ["image/webp", "image/jpeg"]) {
      const url = canvas.toDataURL(type, quality);
      if (url.startsWith(`data:${type}`) && url.length <= AVATAR_MAX_LENGTH) return url;
    }
  }
  throw new Error("This image is too detailed to use as an avatar. Try another one.");
}
