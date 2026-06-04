import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

const uploadDir = path.resolve('uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const allowedExtensions = new Set(['.mp4', '.gif', '.webm', '.avi', '.3gp', '.wmv', '.flv', '.mkv', '.mov']);

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, uploadDir),
  filename: (_request, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    callback(null, `${safeBase || 'video'}-${Date.now()}${ext}`);
  }
});

export function createUploader(maxUploadMb) {
  return multer({
    storage,
    limits: { fileSize: Number(maxUploadMb || 100) * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!file.mimetype.startsWith('video/') && !allowedExtensions.has(ext)) {
        callback(new Error('Only video files are allowed.'));
        return;
      }
      callback(null, true);
    }
  });
}
