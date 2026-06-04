# Deepfake Detection MERN App

This workspace now includes a MERN implementation beside the original Django application.

## Structure

```text
client/   React + Vite interface
server/   Express API, MongoDB persistence, upload handling
uploads/  Created automatically for uploaded videos
```

## Run Locally

1. Install dependencies:

```bash
npm run install:all
```

2. Copy the server environment file and edit it if needed:

```bash
copy server\.env.example server\.env
```

3. Start MongoDB locally, or leave `MONGO_URI` blank to use temporary in-memory history.

4. Build and start the MERN app:

```bash
npm run serve
```

The app and API run together at `http://localhost:5000`.

For separate development servers, run `npm run server` and `npm run client` in two terminals.

## Connecting The Trained Model

The Express server supports a real model integration through `PYTHON_PREDICTOR`.

Set this in `server/.env`:

```bash
PYTHON_PREDICTOR=python ../model_service/predict.py
```

The command receives:

```text
<videoPath> <sequenceLength>
```

It must print JSON to stdout:

```json
{"label":"REAL","confidence":91.2}
```

Until a Python predictor is configured, the app uses a deterministic demo predictor so the MERN workflow, uploads, Mongo records, and UI can be tested end to end.
