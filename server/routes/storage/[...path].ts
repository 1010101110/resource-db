import { createReadStream, existsSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { sendStream, setResponseHeader } from 'h3';

// Basic map so browsers display images instead of downloading them
const mimeTypes: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pbf': 'application/x-protobuf', // Common for vector tiles
};

export default defineEventHandler((event) => {
  // e.g., if requested URL is /storage/avatars/me.png, path is 'avatars/me.png'
  const filePath = getRouterParam(event, 'path');
  if(!filePath){
    return;
  }

  const storageRoot = join(process.cwd(), '.storage');

  // resolve() computes the absolute path
  const safePath = resolve(join(storageRoot, filePath));

  // SECURITY CHECK: Ensure the resolved path is still inside storageRoot.
  // This prevents directory traversal attacks (e.g., someone requesting ../../../etc/passwd)
  if (!safePath.startsWith(resolve(storageRoot)) || !existsSync(safePath)) {
    throw createError({ statusCode: 404, statusMessage: 'File not found' });
  }

  // Set the correct Content-Type header
  const ext = extname(safePath).toLowerCase();
  if (mimeTypes[ext]) {
    setResponseHeader(event, 'Content-Type', mimeTypes[ext]);
  }

  return sendStream(event, createReadStream(safePath));
});