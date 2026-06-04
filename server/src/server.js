import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { connectDatabase, dbState } from './config/db.js';
import { predictionRoutes } from './routes/predictions.js';

const app = express();
const port = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true
  })
);
app.use(express.json());
app.use('/uploads', express.static(path.resolve('uploads')));

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    database: dbState,
    predictor: process.env.PYTHON_PREDICTOR ? 'external' : 'demo'
  });
});

app.use('/api/predictions', predictionRoutes());

app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_request, response) => {
  response.sendFile(path.join(clientDist, 'index.html'));
});

app.use((error, _request, response, _next) => {
  const status = error.message?.includes('Only video') || error.message?.includes('Sequence') ? 400 : 500;
  response.status(status).json({
    message: error.message || 'Something went wrong while processing the video.'
  });
});

await connectDatabase(process.env.MONGO_URI);

app.listen(port, () => {
  console.log(`Deepfake MERN API running on http://localhost:${port}`);
  console.log(dbState.message);
});
