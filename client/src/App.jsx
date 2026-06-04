import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, Database, Film, Gauge, History, Loader2, UploadCloud } from 'lucide-react';
import { API_BASE_URL, fetchHealth, fetchPredictions, uploadPrediction } from './api.js';

const sequenceOptions = [10, 20, 40, 60, 80, 100];

export default function App() {
  const [file, setFile] = useState(null);
  const [sequenceLength, setSequenceLength] = useState(20);
  const [previewUrl, setPreviewUrl] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [health, setHealth] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetchHealth(), fetchPredictions()])
      .then(([healthData, historyData]) => {
        setHealth(healthData);
        setHistory(historyData.predictions || []);
      })
      .catch(() => setError('API is not reachable. Start the server with npm run server.'));
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  const selectedFileSize = useMemo(() => {
    if (!file) return '';
    return `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  }, [file]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setResult(null);

    if (!file) {
      setError('Choose a video before running detection.');
      return;
    }

    try {
      setStatus('loading');
      const data = await uploadPrediction({ file, sequenceLength });
      setResult(data.prediction);
      setHistory((current) => [data.prediction, ...current.filter((item) => item._id !== data.prediction._id)].slice(0, 25));
      setHealth((current) => ({ ...current, database: data.database }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Prediction failed. Check the server logs and try again.');
    } finally {
      setStatus('idle');
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="hero-panel">
          <div className="brand-row">
            <img src="/assets/logo1.png" alt="Deepfake Detection" />
            <div>
              <p>ResNeXt + LSTM Video Analysis</p>
              <h1>Deepfake Detection</h1>
            </div>
          </div>

          <form className="analysis-grid" onSubmit={handleSubmit}>
            <label className="drop-zone">
              <input
                type="file"
                accept="video/*,.mkv,.avi,.wmv,.flv"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
              {previewUrl ? (
                <video src={previewUrl} controls />
              ) : (
                <div className="empty-preview">
                  <Film size={42} />
                  <span>Select a video to preview and analyze</span>
                </div>
              )}
            </label>

            <div className="control-panel">
              <div className="field-block">
                <span className="label">Frame sequence</span>
                <div className="segments">
                  {sequenceOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={sequenceLength === option ? 'active' : ''}
                      onClick={() => setSequenceLength(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="file-summary">
                <UploadCloud size={20} />
                <div>
                  <strong>{file?.name || 'No video selected'}</strong>
                  <span>{selectedFileSize || 'Upload limit follows server settings'}</span>
                </div>
              </div>

              <button className="primary-action" disabled={status === 'loading'} type="submit">
                {status === 'loading' ? <Loader2 className="spin" size={20} /> : <Gauge size={20} />}
                Analyze Video
              </button>

              {error && (
                <div className="notice error">
                  <AlertTriangle size={18} />
                  {error}
                </div>
              )}
            </div>
          </form>
        </div>

        <aside className="result-panel">
          <StatusCard health={health} />
          <ResultCard result={result} />
        </aside>
      </section>

      <section className="history-section">
        <div className="section-heading">
          <History size={22} />
          <h2>Prediction History</h2>
        </div>
        <div className="history-table">
          {history.length === 0 ? (
            <p className="empty-history">Completed predictions will appear here.</p>
          ) : (
            history.map((item) => <HistoryRow key={item._id} item={item} />)
          )}
        </div>
      </section>
    </main>
  );
}

function StatusCard({ health }) {
  const databaseMessage = health?.database?.message || 'Checking API status...';
  return (
    <div className="status-card">
      <div className="card-title">
        <Database size={20} />
        <span>System</span>
      </div>
      <p>{databaseMessage}</p>
      <div className="status-pills">
        <span>{health?.predictor === 'external' ? 'Model predictor connected' : 'Demo predictor active'}</span>
        <span>{health?.ok ? 'API online' : 'API pending'}</span>
      </div>
    </div>
  );
}

function ResultCard({ result }) {
  if (!result) {
    return (
      <div className="result-card neutral">
        <div className="card-title">
          <BadgeCheck size={20} />
          <span>Result</span>
        </div>
        <p>Run an analysis to see the classification and confidence score.</p>
      </div>
    );
  }

  const isFake = result.label === 'FAKE';
  return (
    <div className={`result-card ${isFake ? 'fake' : 'real'}`}>
      <span className="result-label">{result.label}</span>
      <strong>{result.confidence}% confidence</strong>
      <p>{result.notes}</p>
      <a href={`${API_BASE_URL}${result.fileUrl}`} target="_blank" rel="noreferrer">
        Open uploaded video
      </a>
    </div>
  );
}

function HistoryRow({ item }) {
  const created = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Just now';
  return (
    <article className="history-row">
      <div>
        <strong>{item.originalName}</strong>
        <span>{created}</span>
      </div>
      <span>{item.sequenceLength} frames</span>
      <span className={item.label === 'FAKE' ? 'tag fake' : 'tag real'}>{item.label}</span>
      <span>{item.confidence}%</span>
    </article>
  );
}
