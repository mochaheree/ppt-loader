import { useState, useCallback, useEffect } from 'react';

const SCALE_MODES = ['native', 'fit', 'fill', 'stretch'];

export default function App() {
  const [deck, setDeck] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [spoutStatus, setSpoutStatus] = useState(null);
  const [scaleMode, setScaleMode] = useState('fit');

  useEffect(() => {
    const offProgress = window.api.onConvertProgress((p) => setProgress(p.stage));
    const offComplete = window.api.onConvertComplete((d) => {
      setProgress(null);
      setDeck(d);
    });
    window.api.spoutStatus().then(setSpoutStatus);
    window.api.settingsLoad().then((s) => setScaleMode(s.scaleMode));
    return () => {
      offProgress();
      offComplete();
    };
  }, []);

  const handleSpoutToggle = useCallback(async () => {
    setError(null);
    try {
      const status = spoutStatus?.running
        ? await window.api.spoutStop()
        : await window.api.spoutStart();
      setSpoutStatus(status);
    } catch (err) {
      setError(String(err?.message || err));
    }
  }, [spoutStatus]);

  const handleScaleChange = useCallback(async (mode) => {
    setScaleMode(mode);
    await window.api.scaleSet(mode);
  }, []);

  const handleLoad = useCallback(async () => {
    setError(null);
    try {
      const result = await window.api.fileLoad();
      if (result) setDeck(result);
    } catch (err) {
      setProgress(null);
      setError(String(err?.message || err));
    }
  }, []);

  const handleNext = useCallback(async () => {
    const d = await window.api.playbackNext();
    if (d) setDeck(d);
  }, []);

  const handlePrev = useCallback(async () => {
    const d = await window.api.playbackPrev();
    if (d) setDeck(d);
  }, []);

  const currentSlide = deck?.slides?.[deck.currentIndex];

  return (
    <div className="app">
      <header className="header">
        <h1>CUEVO PPT Loader</h1>
        <div className="header-right">
          <span className="spout-status">
            {spoutStatus?.running
              ? `Spout: sending "${spoutStatus.senderName}"`
              : 'Spout: stopped'}
          </span>
          <button
            className={spoutStatus?.running ? 'btn-secondary' : 'btn-primary'}
            onClick={handleSpoutToggle}
            disabled={spoutStatus ? !spoutStatus.available : true}
          >
            {spoutStatus?.running ? 'Stop Spout' : 'Start Spout'}
          </button>
        </div>
      </header>

      <main className="main">
        {!deck && !progress && (
          <div className="deck-placeholder">
            <p>No presentation loaded yet.</p>
            {error && <p className="error-text">{error}</p>}
            <button className="btn-primary" onClick={handleLoad}>
              Load .pptx / .ppt
            </button>
          </div>
        )}

        {progress && (
          <div className="deck-placeholder">
            <p>Converting… ({progress})</p>
          </div>
        )}

        {deck && !progress && (
          <div className="slide-viewer">
            <div className="slide-frame">
              {currentSlide && <img src={currentSlide.url} alt={`Slide ${deck.currentIndex + 1}`} />}
            </div>
            <div className="slide-controls">
              <button className="btn-secondary" onClick={handlePrev}>◀ Prev</button>
              <span className="slide-counter">
                {deck.currentIndex + 1} / {deck.slideCount}
              </span>
              <button className="btn-secondary" onClick={handleNext}>Next ▶</button>
              <button className="btn-primary" onClick={handleLoad}>Load another</button>
            </div>

            <div className="scale-modes">
              <span className="scale-label">Scale</span>
              {SCALE_MODES.map((mode) => (
                <button
                  key={mode}
                  className={mode === scaleMode ? 'chip chip-active' : 'chip'}
                  onClick={() => handleScaleChange(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
