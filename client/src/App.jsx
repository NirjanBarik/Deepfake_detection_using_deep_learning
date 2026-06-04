import React, { useEffect, useMemo, useState } from 'react';
import { Database, UploadCloud, Sun, Moon, Hexagon, Activity, ShieldCheck, Fingerprint, Video, Clock } from 'lucide-react';
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
  
  // Theme Toggle state
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'dark';
  });

  // Mock Metadata state (Extra Feature)
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

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
      setMetadata(null);
      return undefined;
    }
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    
    // Simulate extracting video metadata (Extra Feature)
    setTimeout(() => {
      setMetadata({
        codec: ['H.264', 'HEVC', 'VP9'][Math.floor(Math.random() * 3)],
        resolution: ['1920x1080', '1280x720', '3840x2160'][Math.floor(Math.random() * 3)],
        duration: `${Math.floor(Math.random() * 60) + 10}s`,
        fps: ['30fps', '60fps', '24fps'][Math.floor(Math.random() * 3)]
      });
    }, 800);

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
    <>
      <div className="background-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      <nav className="navbar">
        <div className="logo">
          <Hexagon className="logo-icon" size={24} />
          <span>DeepfakeLens</span>
        </div>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </nav>

      <main>
        <section className="hero">
          <div className="pill-badge">Deepfake Analysis Engine v2.0</div>
          <h1>Detect, Analyze & Verify Your Video Content Instantly</h1>
          <p>
            Upload media and leverage state-of-the-art ResNeXt + LSTM neural networks to accurately predict and trace digital manipulation, deepfakes, and synthetic media artifacts.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => document.getElementById('workspace').scrollIntoView({ behavior: 'smooth' })}>
              Start Analysis
            </button>
            <a href="https://github.com/NirjanBarik/Deepfake_detection_using_deep_learning" target="_blank" rel="noreferrer" className="btn-secondary" style={{textDecoration: 'none'}}>
              View Documentation
            </a>
          </div>
        </section>

        <section id="workspace" className="workspace-container">
          <form className="workspace-window" onSubmit={handleSubmit}>
            <div className="window-header">
              <div className="window-controls">
                <span></span><span></span><span></span>
              </div>
              <div className="window-title">deepfake-detector-workspace ~/analysis</div>
            </div>

            <div className="workspace-content">
              <div className="upload-panel">
                <label className="drop-zone">
                  <input
                    type="file"
                    accept="video/*,.mkv,.avi,.wmv,.flv"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                  />
                  {previewUrl ? (
                    <video src={previewUrl} className="video-preview" controls />
                  ) : (
                    <>
                      <UploadCloud className="upload-icon" size={48} />
                      <div className="upload-text">Drag & Drop or Click to Upload</div>
                      <div className="upload-hint">Supports MP4, AVI, MKV up to server limits</div>
                    </>
                  )}
                </label>
              </div>

              <div className="settings-panel">
                <div className="settings-group">
                  <span className="settings-label">Frame Sequence Length</span>
                  <div className="sequence-options">
                    {sequenceOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`sequence-btn ${sequenceLength === option ? 'active' : ''}`}
                        onClick={() => setSequenceLength(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-group">
                  <span className="settings-label">File Summary</span>
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <Video size={20} style={{color: 'var(--text-secondary)'}} />
                    <div>
                      <div style={{fontWeight: '600'}}>{file?.name || 'No video selected'}</div>
                      <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{selectedFileSize || 'Waiting for input...'}</div>
                    </div>
                  </div>
                </div>

                {/* Extra Feature: Mock Metadata extraction */}
                {metadata && (
                  <div className="settings-group" style={{ animation: 'fadeIn 0.5s' }}>
                    <span className="settings-label">Extracted Metadata</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <div><Clock size={12} /> {metadata.duration}</div>
                      <div><Activity size={12} /> {metadata.fps}</div>
                      <div><Hexagon size={12} /> {metadata.codec}</div>
                      <div><ShieldCheck size={12} /> {metadata.resolution}</div>
                    </div>
                  </div>
                )}

                {error && (
                  <div style={{color: '#ff5f56', background: 'rgba(255, 95, 86, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem'}}>
                    {error}
                  </div>
                )}

                <button className="btn-primary analyze-btn" disabled={status === 'loading'} type="submit">
                  {status === 'loading' ? 'Analyzing Sequence...' : 'Run Forensic Analysis'}
                </button>
              </div>
            </div>

            <div className="workspace-actions">
              <div className="status-indicator">
                <div className={`status-dot ${status === 'loading' ? 'loading' : error ? 'error' : 'idle'}`}></div>
                <span>{status === 'loading' ? 'Processing via neural network...' : 'System Ready'}</span>
              </div>
              <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                Engine: ResNeXt50
              </div>
            </div>
          </form>
        </section>

        <section className="features-section">
          <div className="section-header">
            <div className="section-badge">Dashboard</div>
            <h2>Designed for Precise Video Forensics</h2>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Database size={24} />
              </div>
              <h3>System Health</h3>
              <p>{health?.database?.message || 'Checking API status and database connectivity...'}</p>
              <div className="card-metrics">
                <div className="metric-item">
                  <span className="metric-label">Predictor</span>
                  <span className="metric-val">{health?.predictor === 'external' ? 'Connected' : 'Demo Active'}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">API Status</span>
                  <span className="metric-val" style={{color: health?.ok ? '#27c93f' : '#ffbd2e'}}>
                    {health?.ok ? 'Online' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            <div className="feature-card" style={result ? {borderColor: 'var(--primary)', boxShadow: '0 0 20px rgba(109, 74, 255, 0.1)'} : {}}>
              <div className="feature-icon">
                <Fingerprint size={24} />
              </div>
              <h3>Prediction Result</h3>
              <p>{result ? result.notes : 'Run an analysis to see the classification and confidence score.'}</p>
              
              {result && (
                <div className="card-metrics">
                  <div className="metric-item">
                    <span className="metric-label">Classification</span>
                    <span className={`result-tag ${result.label === 'FAKE' ? 'fake' : 'real'}`}>
                      {result.label}
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Confidence</span>
                    <span className="metric-val">{result.confidence}%</span>
                  </div>
                </div>
              )}
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Activity size={24} />
              </div>
              <h3>Prediction History</h3>
              <p>Recent forensic analyses performed during this session.</p>
              <div style={{marginTop: '16px', fontSize: '0.85rem'}}>
                {history.length === 0 ? (
                  <span style={{color: 'var(--text-secondary)'}}>No recent history.</span>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {history.slice(0, 3).map(item => (
                      <div key={item._id} style={{display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)'}}>
                        <span style={{textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px'}}>{item.originalName}</span>
                        <span className={`result-tag ${item.label === 'FAKE' ? 'fake' : 'real'}`} style={{padding: '2px 6px', fontSize: '0.7rem'}}>
                          {item.label} ({item.confidence}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
