import { useState, useCallback, useEffect } from 'react';

const SCALE_MODES = ['native', 'fit', 'fill', 'stretch'];
const AUTOPILOT_MODES = [
  ['off', 'Off'],
  ['forward', 'Forward'],
  ['reverse', 'Reverse'],
  ['random', 'Random'],
];

export default function App() {
  const [deck, setDeck] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [spoutStatus, setSpoutStatus] = useState(null);
  const [scaleMode, setScaleMode] = useState('fit');
  const [fade, setFade] = useState(true);
  const [fadeDurationMs, setFadeDurationMs] = useState(400);
  const [engines, setEngines] = useState(null);

  useEffect(() => {
    const offProgress = window.api.onConvertProgress((p) => setProgress(p.stage));
    const offComplete = window.api.onConvertComplete((d) => {
      setProgress(null);
      setDeck(d);
    });
    const offDeckUpdate = window.api.onDeckUpdate((d) => setDeck(d));
    window.api.spoutStatus().then(setSpoutStatus);
    window.api.engineList().then(setEngines);
    window.api.settingsLoad().then((s) => {
      setScaleMode(s.scaleMode);
      setFade(s.fade);
      setFadeDurationMs(s.fadeDurationMs);
    });
    return () => {
      offProgress();
      offComplete();
      offDeckUpdate();
    };
  }, []);

  const handleAutopilot = useCallback(async (mode) => {
    setDeck(await window.api.autopilotSet(mode));
  }, []);

  const handleDuration = useCallback(async (seconds) => {
    setDeck(await window.api.durationSet(seconds));
  }, []);

  const handleLoop = useCallback(async (enabled) => {
    setDeck(await window.api.loopSet(enabled));
  }, []);

  const handleFade = useCallback(async (enabled, ms) => {
    const result = await window.api.fadeSet(enabled, ms);
    setFade(result.fade);
    setFadeDurationMs(result.fadeDurationMs);
  }, []);

  const handleEngine = useCallback(async (name) => {
    setEngines((prev) => ({ ...prev, current: name }));
    await window.api.engineSet(name);
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

            <div className="chip-row">
              <span className="row-label">Scale</span>
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

            <div className="chip-row">
              <span className="row-label">Autopilot</span>
              {AUTOPILOT_MODES.map(([mode, label]) => (
                <button
                  key={mode}
                  className={mode === deck.autopilot ? 'chip chip-active' : 'chip'}
                  onClick={() => handleAutopilot(mode)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="chip-row">
              <label className="row-label" htmlFor="duration">Every</label>
              <input
                id="duration"
                type="number"
                min="0.5"
                step="0.5"
                value={deck.duration}
                onChange={(e) => handleDuration(Number(e.target.value))}
                className="number-input"
              />
              <span className="unit">sec</span>

              <label className="toggle">
                <input
                  type="checkbox"
                  checked={deck.loop}
                  onChange={(e) => handleLoop(e.target.checked)}
                />
                Loop
              </label>

              <label className="toggle">
                <input
                  type="checkbox"
                  checked={fade}
                  onChange={(e) => handleFade(e.target.checked, fadeDurationMs)}
                />
                Fade
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={fadeDurationMs}
                disabled={!fade}
                onChange={(e) => handleFade(fade, Number(e.target.value))}
                className="number-input"
              />
              <span className="unit">ms</span>
            </div>

            {engines && (
              <div className="chip-row">
                <span className="row-label">Engine</span>
                <button
                  className={engines.current === 'libreoffice' ? 'chip chip-active' : 'chip'}
                  onClick={() => handleEngine('libreoffice')}
                >
                  LibreOffice
                </button>
                <button
                  className={engines.current === 'powerpoint' ? 'chip chip-active' : 'chip'}
                  onClick={() => handleEngine('powerpoint')}
                  disabled={!engines.powerPointAvailable}
                  title={
                    engines.powerPointAvailable
                      ? 'Render with Microsoft PowerPoint'
                      : 'Microsoft PowerPoint is not installed'
                  }
                >
                  PowerPoint
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
