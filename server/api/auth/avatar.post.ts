import { join, dirname } from 'path';
import db from '../../utils/db';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

export default defineEventHandler(async (event) => {
  const userId = getCookie(event, 'auth_session');
  if (!userId) throw createError({ statusCode: 401 });

  // Read the uploaded file
  const formData = await readMultipartFormData(event);
  const file = formData?.find(f => f.name === 'avatar');
  if (!file) throw createError({ statusCode: 400, statusMessage: 'No file uploaded' });

  // Create a unique filename
  const filename = `${userId}-${Date.now()}.webp`; // Convert to WebP for better compression
  const uploadPath = join(process.cwd(), '.storage', 'avatars', filename);

  //make sure dir is created
  const dirPath = dirname(uploadPath);
  await mkdir(dirPath, { recursive: true});

  // Process image with Sharp
  await sharp(file.data)
    .resize(300, 300, { fit: 'cover' }) // Force consistent size and crop
    .webp({ quality: 80 })             // High-quality webp compression
    .toFile(uploadPath);

  // Update Database
  db.prepare('UPDATE users SET avatar_path = ? WHERE id = ?').run(filename, userId);

  return { success: true, path: filename };
});