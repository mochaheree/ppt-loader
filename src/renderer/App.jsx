import { useState, useCallback, useEffect } from 'react';
import {
  Broadcast,
  CaretLeft,
  CaretRight,
  FilePpt,
  Prohibit,
  Warning,
} from '@phosphor-icons/react';
import Button from './components/ui/Button.jsx';
import Card from './components/ui/Card.jsx';
import Field from './components/ui/Field.jsx';
import Input from './components/ui/Input.jsx';
import Toggle from './components/ui/Toggle.jsx';
import Badge from './components/ui/Badge.jsx';
import Segmented from './components/ui/Segmented.jsx';

const TABS = [
  { id: 'perform', label: 'Perform' },
  { id: 'setup', label: 'Setup' },
];

const SCALE_MODES = [
  { value: 'native', label: 'Native' },
  { value: 'fit', label: 'Fit' },
  { value: 'fill', label: 'Fill' },
  { value: 'stretch', label: 'Stretch' },
];

const AUTOPILOT_MODES = [
  { value: 'off', label: 'Off' },
  { value: 'forward', label: 'Forward' },
  { value: 'reverse', label: 'Reverse' },
  { value: 'random', label: 'Random' },
];

export default function App() {
  const [tab, setTab] = useState('perform');
  const [deck, setDeck] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [spoutStatus, setSpoutStatus] = useState(null);
  const [scaleMode, setScaleMode] = useState('fit');
  const [fade, setFade] = useState(true);
  const [fadeDurationMs, setFadeDurationMs] = useState(400);
  const [engines, setEngines] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const offProgress = window.api.onConvertProgress((p) => setProgress(p.stage));
    const offComplete = window.api.onConvertComplete((d) => {
      setProgress(null);
      setDeck(d);
    });
    const offDeckUpdate = window.api.onDeckUpdate((d) => setDeck(d));
    window.api.spoutStatus().then(setSpoutStatus);
    window.api.engineList().then(setEngines);
    window.api.fileGetRecent().then(setRecent);
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

  const handleLoad = useCallback(async () => {
    setError(null);
    try {
      const result = await window.api.fileLoad();
      if (result) {
        setDeck(result);
        setRecent(await window.api.fileGetRecent());
      }
    } catch (err) {
      setProgress(null);
      setError(String(err?.message || err));
    }
  }, []);

  const handleOpenRecent = useCallback(async (filePath) => {
    setError(null);
    try {
      setDeck(await window.api.fileOpen(filePath));
    } catch (err) {
      setProgress(null);
      setError(String(err?.message || err));
    }
  }, []);

  const handleSpoutToggle = useCallback(async () => {
    setError(null);
    try {
      setSpoutStatus(
        spoutStatus?.running ? await window.api.spoutStop() : await window.api.spoutStart(),
      );
    } catch (err) {
      setError(String(err?.message || err));
    }
  }, [spoutStatus]);

  const handleNext = useCallback(async () => {
    const d = await window.api.playbackNext();
    if (d) setDeck(d);
  }, []);

  const handlePrev = useCallback(async () => {
    const d = await window.api.playbackPrev();
    if (d) setDeck(d);
  }, []);

  const handleScaleChange = useCallback(async (mode) => {
    setScaleMode(mode);
    await window.api.scaleSet(mode);
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

  const currentSlide = deck?.slides?.[deck.currentIndex];
  const sending = Boolean(spoutStatus?.running);
  const autopilotOn = deck && deck.autopilot !== 'off';

  return (
    <div className="flex h-full flex-col">
      {/* Doubles as the window title bar: 48px to match titleBarOverlay.height
          in src/main/index.js. */}
      <header className="drag-region flex h-12 shrink-0 items-center border-b border-border">
        <div className="titlebar-inner flex h-full items-center justify-between pr-4 pl-4">
          <div className="flex items-center gap-5">
            <span className="font-heading text-[14px] tracking-tight">
              <span className="text-muted-foreground">CUEVO</span>{' '}
              <span className="font-semibold">PPT Loader</span>
            </span>

            <nav className="no-drag flex gap-1 rounded-md bg-secondary p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-sm px-3 py-1 text-[13px] font-medium transition-colors
                    ${tab === t.id
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Status never hides behind a tab: it is what you glance at mid-set. */}
          <div className="flex items-center gap-3.5 text-[12px]">
            {spoutStatus && !spoutStatus.available && (
              <span
                className="flex items-center gap-1.5 rounded-full border border-destructive/40
                  bg-destructive/15 px-2.5 py-1 text-destructive"
              >
                <Warning size={13} weight="fill" /> spout addon missing
              </span>
            )}

            <span
              className={`flex items-center gap-1.5 ${sending ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              {sending ? <Broadcast size={14} /> : <Prohibit size={14} />}
              {sending ? spoutStatus.senderName : 'not sending'}
            </span>

            <Badge
              tone={autopilotOn ? 'live' : 'muted'}
              className={autopilotOn ? 'autopilot-breathe' : ''}
            >
              {autopilotOn ? `AUTO ${deck.autopilot.toUpperCase()}` : 'manual'}
            </Badge>

            <span
              className={`font-mono tabular-nums ${deck ? 'text-primary-bright' : 'text-muted-foreground'}`}
            >
              {deck ? `${deck.currentIndex + 1} / ${deck.slideCount}` : '-- / --'}
            </span>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        {error && (
          <div
            className="mx-auto mb-4 flex max-w-[960px] items-center gap-2 rounded-md border
              border-destructive/40 bg-destructive/15 px-4 py-2.5 text-[13px] text-destructive"
          >
            <Warning size={15} weight="fill" /> {error}
          </div>
        )}

        {tab === 'perform' ? (
          <div className="flex min-h-full items-center justify-center">
            {!deck && !progress && (
              <div className="flex flex-col items-center gap-5 text-center">
                <FilePpt size={44} className="text-muted-foreground" />
                <div className="grid gap-1.5">
                  <p className="font-heading text-[17px] font-semibold">No presentation loaded</p>
                  <p className="text-[13px] text-muted-foreground">
                    Load a .pptx or .ppt file to send its slides to Resolume.
                  </p>
                </div>
                <Button size="lg" onClick={handleLoad}>
                  Load presentation
                </Button>
              </div>
            )}

            {progress && (
              <p className="text-[13px] text-muted-foreground">Converting… ({progress})</p>
            )}

            {deck && !progress && (
              <div className="flex w-full max-w-[960px] flex-col items-center gap-5">
                <div
                  className="flex aspect-video w-full items-center justify-center overflow-hidden
                    rounded-lg border border-border bg-black"
                >
                  {currentSlide && (
                    <img
                      src={currentSlide.url}
                      alt={`Slide ${deck.currentIndex + 1}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="secondary" size="lg" onClick={handlePrev}>
                    <CaretLeft size={16} weight="bold" /> Prev
                  </Button>
                  <span className="min-w-[88px] text-center font-mono text-[15px] tabular-nums">
                    {deck.currentIndex + 1} / {deck.slideCount}
                  </span>
                  <Button variant="secondary" size="lg" onClick={handleNext}>
                    Next <CaretRight size={16} weight="bold" />
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[13px] text-muted-foreground">Autopilot</span>
                  <Segmented
                    options={AUTOPILOT_MODES}
                    value={deck.autopilot}
                    onChange={handleAutopilot}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-[960px] gap-4 md:grid-cols-2">
            <div className="grid content-start gap-4">
              <Card
                title="Output"
                description="Resolume picks this up as a Spout source."
                action={
                  <Button
                    variant={sending ? 'destructive' : 'default'}
                    size="sm"
                    onClick={handleSpoutToggle}
                    disabled={spoutStatus ? !spoutStatus.available : true}
                  >
                    {sending ? 'Stop' : 'Start'}
                  </Button>
                }
              >
                <div className="grid gap-5">
                  <Field
                    label="Sender name"
                    hint={
                      spoutStatus?.available
                        ? 'Select this name in Resolume’s Spout source.'
                        : `Addon not built: ${spoutStatus?.loadError ?? 'unknown error'}`
                    }
                  >
                    <Input value={spoutStatus?.senderName ?? 'CUEVO PPT Loader'} readOnly />
                  </Field>

                  <Field label="Scale mode" hint="How each slide fills the output frame.">
                    <Segmented
                      options={SCALE_MODES}
                      value={scaleMode}
                      onChange={handleScaleChange}
                      className="w-fit"
                    />
                  </Field>
                </div>
              </Card>

              <Card title="Source" description="The presentation being sent.">
                <div className="grid gap-4">
                  <p className="truncate text-[13px] text-muted-foreground" title={deck?.filePath}>
                    {deck ? deck.filePath : 'Nothing loaded yet.'}
                  </p>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={handleLoad}>
                      {deck ? 'Load another' : 'Load presentation'}
                    </Button>
                    {deck && (
                      <span className="text-[12px] text-muted-foreground">
                        {deck.slideCount} slides
                      </span>
                    )}
                  </div>

                  {recent.length > 0 && (
                    <div className="grid gap-1.5 border-t border-border pt-4">
                      <span className="text-[12px] font-medium text-muted-foreground">Recent</span>
                      {recent.slice().reverse().map((filePath) => (
                        <button
                          key={filePath}
                          onClick={() => handleOpenRecent(filePath)}
                          title={filePath}
                          className="truncate rounded-sm px-2 py-1 text-left text-[13px]
                            text-muted-foreground transition-colors hover:bg-accent
                            hover:text-foreground"
                        >
                          {filePath.split(/[\\/]/).pop()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className="grid content-start gap-4">
              <Card title="Playback" description="How autopilot moves through the deck.">
                <div className="grid gap-5">
                  <Field label="Hold each slide for" htmlFor="duration">
                    <div className="flex items-center gap-2">
                      <Input
                        id="duration"
                        type="number"
                        min="0.5"
                        step="0.5"
                        className="w-28"
                        value={deck?.duration ?? 5}
                        disabled={!deck}
                        onChange={(e) => handleDuration(Number(e.target.value))}
                      />
                      <span className="text-[13px] text-muted-foreground">seconds</span>
                    </div>
                  </Field>

                  <Toggle
                    checked={deck?.loop ?? true}
                    label="Loop"
                    hint="Wrap around instead of stopping at the last slide."
                    onChange={handleLoop}
                  />

                  <Toggle
                    checked={fade}
                    label="Fade between slides"
                    hint="Crossfades instead of cutting."
                    onChange={(v) => handleFade(v, fadeDurationMs)}
                  />

                  <Field label="Fade length" htmlFor="fade-ms">
                    <div className="flex items-center gap-2">
                      <Input
                        id="fade-ms"
                        type="number"
                        min="0"
                        step="50"
                        className="w-28"
                        value={fadeDurationMs}
                        disabled={!fade}
                        onChange={(e) => handleFade(fade, Number(e.target.value))}
                      />
                      <span className="text-[13px] text-muted-foreground">ms</span>
                    </div>
                  </Field>
                </div>
              </Card>

              <Card title="Render engine" description="What turns the file into slide images.">
                {engines && (
                  <Segmented
                    className="w-fit"
                    value={engines.current}
                    onChange={handleEngine}
                    options={[
                      { value: 'libreoffice', label: 'LibreOffice' },
                      {
                        value: 'powerpoint',
                        label: 'PowerPoint',
                        disabled: !engines.powerPointAvailable,
                        title: engines.powerPointAvailable
                          ? 'Render with Microsoft PowerPoint'
                          : 'Microsoft PowerPoint is not installed',
                      },
                    ]}
                  />
                )}
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
