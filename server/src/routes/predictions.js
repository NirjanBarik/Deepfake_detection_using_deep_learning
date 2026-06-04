import { Router } from 'express';
import { createPrediction, listPredictions } from '../controllers/predictionController.js';
import { createUploader } from '../middleware/upload.js';

export function predictionRoutes() {
  const router = Router();
  const upload = createUploader(process.env.MAX_UPLOAD_MB);

  router.get('/', listPredictions);
  router.post('/', upload.single('video'), createPrediction);

  return router;
}
