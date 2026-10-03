import React, { useState, useCallback, useRef, lazy, Suspense, useEffect } from 'react';
import { Eye, ClipboardList, Box, Map, ImagePlus, History, Columns2 } from 'lucide-react';
import type { CourtConfig, CourtType, PropertyType, AccessoryId, CourtDimensions, CourtColors, SurfaceFinish } from './types/court';
import { DEFAULT_COLORS, COURT_PRESETS, ACCESSORIES, COURT_LABELS, toggleAccessory } from './utils/courtData';
import { trackEvent, loadRecaptcha } from './utils/analytics';
import { designUrl, readSharedDesign, saveDraft, loadDraft, clearDraft } from './utils/shareLink';
import { Showcase } from './components/Showcase';
import type { ShowcaseItem } from './utils/showcase';
import { CourtSVG } from './components/Court/CourtSVG';

const Court3D = lazy(() => import('./components/Court/Court3D').then((m) => ({ default: m.Court3D })));
const YardView = lazy(() => import('./components/Yard/YardView'));
const CompareView = lazy(() => import('./components/CompareView'));
import { StepProgress } from './components/Wizard/StepProgress';
import { Step1Property } from './components/Wizard/Step1Property';
import { Step2CourtType } from './components/Wizard/Step2CourtType';
import { Step3Size } from './components/Wizard/Step3Size';
import { Step4Colors } from './components/Wizard/Step4Colors';
import { Step5Accessories } from './components/Wizard/Step5Accessories';
import { Step6Contact } from './components/Wizard/Step6Contact';
import type { ContactData } from './components/Wizard/Step6Contact';
import { StepDone } from './components/Wizard/StepDone';
import { EmailGate } from './components/Auth/EmailGate';

function getDefaultDimensions(type: CourtType, propertyType: PropertyType): CourtDimensions {
  const pref = COURT_PRESETS.find(
    (p) => p.type === type && (p.recommended === propertyType || p.recommended === 'both'),
  );
  return pref?.dimensions ?? COURT_PRESETS.find((p) => p.type === type)!.dimensions;
}

const initialConfig: CourtConfig = {
  type:                'basketball',
  propertyType:        'residential',
  dimensions:          getDefaultDimensions('basketball', 'residential'),
  colors:              DEFAULT_COLORS['basketball'],
  surfaceFinish:       'smooth',
  selectedAccessories: [],
  customDimensions:    false,
};

const TOTAL_STEPS = 6;

const STEP_NAMES: Record<number, string> = {
  0: 'property_type', 1: 'court_type', 2: 'size',
  3: 'colors', 4: 'accessories', 5: 'contact',
};

export default function App() {
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(
    'bypass', // TODO: re-enable gate → localStorage.getItem('mb_verified_email')
  );
  // A shared design link (#d=…) opens straight onto the Colors step
  const [sharedDesign] = useState(() => readSharedDesign());
  const [step, setStep]           = useState(sharedDesign ? 3 : 0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [config, setConfig]       = useState<CourtConfig>(sharedDesign ?? initialConfig);
  const [linkCopied, setLinkCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (sharedDesign) trackEvent('shared_design_opened', { court_type: sharedDesign.type });
  }, [sharedDesign]);

  // Autosave: an unfinished design is kept in this browser and offered back
  // on the next visit. A shared link takes priority over a saved draft.
  const [draft, setDraft] = useState(() => (sharedDesign ? null : loadDraft()));
  useEffect(() => {
    if (step === 0 || step < 0 || draft) return;
    const t = setTimeout(() => saveDraft(config, step), 400);
    return () => clearTimeout(t);
  }, [config, step, draft]);
  useEffect(() => {
    // Starting a new design without using the offer replaces the old draft
    if (step !== 0 && draft) setDraft(null);
  }, [step, draft]);

  const resumeDraft = () => {
    if (!draft) return;
    setConfig(draft.config);
    setDirection('forward');
    setStep(draft.step);
    setDraft(null);
    trackEvent('draft_resumed', { court_type: draft.config.type, step_number: draft.step });
  };
  const discardDraft = () => { clearDraft(); setDraft(null); };

  // "Start with this design" from the Step 1 showcase: load it and go to Colors
  const applyShowcaseDesign = (item: ShowcaseItem) => {
    setConfig(item.config);
    setDirection('forward');
    setStep(3);
    setDraft(null);
    trackEvent('showcase_design_used', { showcase_id: item.id, court_type: item.config.type });
  };

  const shareDesign = async () => {
    const url = designUrl(config);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this link to share your design:', url);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    trackEvent('design_shared', { court_type: config.type });
  };
  const [submitted, setSubmitted] = useState<ContactData | null>(null);
  const [render3D, setRender3D] = useState<string | undefined>();
  const render3DPromise = useRef<Promise<string | undefined> | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [view3D, setView3D]       = useState(false);
  const [showYard, setShowYard]   = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleVerified = (email: string) => {
    setVerifiedEmail(email);
  };

  useEffect(() => {
    if (step >= 0) trackEvent('step_view', { step_number: step, step_name: STEP_NAMES[step] });
  }, [step]);

  const getCaptureImage = useCallback(async (): Promise<string | undefined> => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    try {
      const xml = new XMLSerializer().serializeToString(svg);
      const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
      return await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 900; canvas.height = 560;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('no ctx')); return; }
          ctx.drawImage(img, 0, 0, 900, 560);
          resolve(canvas.toDataURL('image/jpeg', 0.88).split(',')[1]);
        };
        img.onerror = reject;
        img.src = uri;
      });
    } catch {
      return undefined;
    }
  }, []);

  // Once a design is under way, fetch the 3D code in idle time so opening the
  // 3D view (and the email picture) doesn't wait on the download
  useEffect(() => {
    if (step < 1) return;
    const load = () => { void import('./components/Court/Court3D'); };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(load, { timeout: 4000 });
    else setTimeout(load, 1500);
  }, [step >= 1]);

  // reCAPTCHA is only needed to submit, so load it when the contact step opens
  useEffect(() => {
    if (step === TOTAL_STEPS - 1) loadRecaptcha().catch(() => undefined);
  }, [step]);

  // Render the 3D picture for the quote email in the background as soon as the
  // customer reaches the contact step, so submitting isn't slowed down.
  useEffect(() => {
    if (step !== TOTAL_STEPS - 1) return;
    render3DPromise.current = import('./components/Court/Court3D')
      .then((m) => m.renderCourtSnapshot(config))
      .catch(() => undefined);
  }, [step, config]);

  const getCapture3D = useCallback(async (): Promise<string | undefined> => {
    const img = await (render3DPromise.current ?? Promise.resolve(undefined));
    setRender3D(img);
    return img;
  }, []);

  // Two-page PDF: 3D picture and specs, then the 2D layout. Everything loads
  // only when a customer asks for it.
  const downloadPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const [{ buildDesignPdf }, court3D, plan] = await Promise.all([
        import('./utils/designPdf'),
        import('./components/Court/Court3D'),
        getCaptureImage(),
      ]);
      const shot = render3D ?? await court3D.renderCourtSnapshot(config);
      const blob = buildDesignPdf(
        config,
        shot ? { b64: shot, w: 1200, h: 750 } : undefined,
        plan ? { b64: plan, w: 900, h: 560 } : undefined,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MB-Sports-${config.type}-court-design.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      trackEvent('pdf_downloaded', { court_type: config.type });
    } finally {
      setPdfBusy(false);
    }
  };

  // Latest values for handlers that fire after a delay (Step 1 advances 250 ms
  // after the click, from a closure that predates the state update)
  const configRef = useRef(config);
  configRef.current = config;
  const stepRef = useRef(step);
  stepRef.current = step;

  // GA4: record what the customer chose each time they complete a step, so
  // popular sports, sizes, colors and extras show up in reports alongside the
  // step_view drop-off funnel.
  const trackStepChoices = (s: number) => {
    const c = configRef.current;
    const preset = COURT_PRESETS.find((p) =>
      p.type === c.type && p.dimensions.length === c.dimensions.length && p.dimensions.width === c.dimensions.width);
    const choices: Record<string, unknown>[] = [
      { property_type: c.propertyType },
      { court_type: c.type },
      { court_type: c.type, court_size: preset?.name ?? 'Custom', length_ft: c.dimensions.length, width_ft: c.dimensions.width },
      { court_type: c.type, surface_color: c.colors.surface, line_color: c.colors.lines,
        border_color: c.colors.border, surface_finish: c.surfaceFinish },
      { court_type: c.type, accessories: c.selectedAccessories.join(',') || 'none',
        accessories_count: c.selectedAccessories.length },
    ];
    if (choices[s]) trackEvent('step_completed', { step_number: s, step_name: STEP_NAMES[s], ...choices[s] });
  };

  const next = () => {
    trackStepChoices(stepRef.current);
    setDirection('forward');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };
  const back = () => { setDirection('back');    setStep((s) => Math.max(s - 1, 0)); };

  const update = useCallback(<K extends keyof CourtConfig>(key: K, value: CourtConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleCourtTypeChange = useCallback((type: CourtType) => {
    setConfig((prev) => ({
      ...prev, type,
      dimensions:          getDefaultDimensions(type, prev.propertyType),
      colors:              DEFAULT_COLORS[type],
      selectedAccessories: [],
      customDimensions:    false,
    }));
  }, []);

  const handlePropertyChange = useCallback((propertyType: PropertyType) => {
    setConfig((prev) => ({
      ...prev, propertyType,
      dimensions:       getDefaultDimensions(prev.type, propertyType),
      customDimensions: false,
    }));
  }, []);

  const handleAccessoryToggle = useCallback((id: AccessoryId) => {
    const c = configRef.current;
    trackEvent('accessory_toggled', {
      accessory_id: id, court_type: c.type,
      action: c.selectedAccessories.includes(id) ? 'removed' : 'added',
    });
    setConfig((prev) => ({ ...prev, selectedAccessories: toggleAccessory(prev.selectedAccessories, id) }));
  }, []);

  const handleSubmit = (data: ContactData) => { clearDraft(); setSubmitted(data); setStep(-1); };
  const handleReset  = () => { clearDraft(); if (location.hash) history.replaceState(null, '', location.pathname + location.search); setConfig(initialConfig); setSubmitted(null); setRender3D(undefined); setStep(0); setShowPreview(false); };

  const renderStep = () => {
    switch (step) {
      case 0: return <Step1Property propertyType={config.propertyType} onChange={handlePropertyChange} onNext={next} />;
      case 1: return <Step2CourtType courtType={config.type} onChange={handleCourtTypeChange} onBack={back} onNext={next} />;
      case 2: return (
        <Step3Size
          courtType={config.type} dimensions={config.dimensions} customDimensions={config.customDimensions}
          onDimensionsChange={(d: CourtDimensions) => update('dimensions', d)}
          onCustomToggle={(v: boolean) => update('customDimensions', v)}
          space={config.space} onSpaceChange={(space) => setConfig((c) => ({ ...c, space }))}
          onBack={back} onNext={next}
        />
      );
      case 3: return (
        <Step4Colors
          courtType={config.type} colors={config.colors} surfaceFinish={config.surfaceFinish}
          onColorsChange={(c: CourtColors) => update('colors', c)}
          onSurfaceFinishChange={(f: SurfaceFinish) => update('surfaceFinish', f)}
          onBack={back} onNext={next}
        />
      );
      case 4: return <Step5Accessories courtType={config.type} selected={config.selectedAccessories} onToggle={handleAccessoryToggle}
        logo={config.logo} onLogoChange={(logo) => setConfig((c) => ({ ...c, logo }))} onBack={back} onNext={next} />;
      case 5: return <Step6Contact config={config} onBack={back} onSubmit={handleSubmit} getCaptureImage={getCaptureImage} getCapture3D={getCapture3D} verifiedEmail={verifiedEmail === 'bypass' ? undefined : verifiedEmail ?? undefined} />;
      default: return null;
    }
  };

  if (!verifiedEmail) {
    return <EmailGate onVerified={handleVerified} />;
  }

  return (
    <div className="h-dvh bg-theme-base text-theme-primary font-sans flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-theme-panel border-b border-theme-border px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/mb-sports-builders-logo.webp"
            alt="MB Sports Builders"
            className="h-10 w-auto"
          />
          <div>
            <div className="font-bold text-theme-primary text-sm leading-tight">Court Builder</div>
            <div className="text-xs text-theme-muted">Design your custom court</div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs">
          <span className="text-pink-700 dark:text-pink-300 font-semibold">mbsportsbuilders.com</span>
          <span className="text-theme-faint">·</span>
          <span className="text-theme-muted">12 court types · Residential &amp; Commercial</span>
        </div>
        {step >= 0 && (
          <button
            className="sm:hidden text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-all active:scale-95 bg-pink-700 border border-pink-500 text-white shadow-sm shadow-pink-900/30"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview
              ? <><ClipboardList className="w-3.5 h-3.5" />Form</>
              : <><Eye className="w-3.5 h-3.5" />Preview</>
            }
          </button>
        )}
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* Left: Wizard panel */}
        <div className={`
          ${showPreview ? 'hidden' : 'flex'} sm:flex
          flex-col w-full sm:w-[400px] lg:w-[440px]
          bg-theme-panel border-r border-theme-border flex-shrink-0 overflow-hidden
        `}>
          {step === -1 ? (
            <StepDone name={submitted?.name ?? ''} email={submitted?.email ?? ''} render3D={render3D} onDownloadPdf={downloadPdf} pdfBusy={pdfBusy}
              onShare={shareDesign} linkCopied={linkCopied} onReset={handleReset} />
          ) : (
            <>
              <StepProgress current={step} />
              {step === 0 && (
                <div className="sm:hidden mx-4 mt-3 flex-shrink-0">
                  <Showcase onUse={applyShowcaseDesign} compact />
                </div>
              )}
              {step === 0 && draft && (
                <div className="mx-4 mt-3 p-3 rounded-xl border border-pink-500/50 bg-pink-600/10 flex-shrink-0">
                  <div className="flex items-start gap-2.5">
                    <History className="w-4 h-4 text-pink-700 dark:text-pink-300 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-theme-primary">Pick up where you left off?</p>
                      <p className="text-xs text-theme-muted mt-0.5">
                        Your {COURT_LABELS[draft.config.type]} court ({draft.config.dimensions.length} × {draft.config.dimensions.width} ft) is saved on this device.
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={resumeDraft}
                          className="px-3 py-1.5 rounded-lg bg-pink-700 hover:bg-pink-800 text-white text-xs font-semibold">
                          Continue my design
                        </button>
                        <button onClick={discardDraft}
                          className="px-3 py-1.5 rounded-lg border border-theme-mid text-theme-muted hover:text-theme-primary text-xs font-semibold">
                          Start fresh
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Phones: small live preview on every step; tap to open the full view */}
              {step > 0 && (
                <button
                  onClick={() => setShowPreview(true)}
                  className="sm:hidden relative mx-4 mt-3 h-32 flex-shrink-0 rounded-xl overflow-hidden border border-theme-border bg-theme-canvas"
                  aria-label="Open the full court preview"
                >
                  <div className="absolute inset-0 pointer-events-none">
                    <CourtSVG config={config} width={900} height={560} />
                  </div>
                  <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 text-[10px] font-semibold bg-black/60 text-white px-2 py-0.5 rounded-full">
                    <Eye className="w-3 h-3" /> Tap for 3D &amp; full view
                  </span>
                </button>
              )}
              <div
                key={step}
                className={`flex-1 min-h-0 overflow-hidden ${direction === 'forward' ? 'animate-step-enter' : 'animate-step-enter-back'}`}
              >
                {renderStep()}
              </div>
            </>
          )}
        </div>

        {/* Right: Live court preview */}
        <div className={`
          ${showPreview ? 'flex' : 'hidden'} sm:flex
          flex-1 flex-col bg-theme-canvas overflow-hidden relative canvas-grid
        `}>
          {/* Animated background orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/5 w-80 h-80 rounded-full blur-3xl animate-orb-float"
              style={{ background: 'var(--orb-pink)' }} />
            <div className="absolute bottom-1/4 right-1/5 w-72 h-72 rounded-full blur-3xl animate-orb-float-alt"
              style={{ background: 'var(--orb-cyan)', animationDelay: '-10s' }} />
            <div className="absolute top-2/3 left-1/2 w-56 h-56 rounded-full blur-2xl animate-orb-float"
              style={{ background: 'var(--orb-pink)', animationDelay: '-16s', animationDuration: '24s' }} />
          </div>
          <div className="px-6 py-3 border-b border-theme-border flex items-center justify-between bg-theme-panel/70 flex-shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-theme-primary">Live Court Preview</h2>
              <p className="hidden sm:block text-xs text-theme-muted mt-0.5">Updates as you configure your court</p>
            </div>
            {step > 0 && (
              <div className="flex items-center gap-2 lg:gap-3 text-xs text-theme-muted whitespace-nowrap">
                <span className="hidden lg:flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Live
                </span>
                <span className="hidden lg:inline">·</span>
                <span className="hidden md:inline font-mono">{config.dimensions.length} × {config.dimensions.width} ft</span>
                <span className="hidden md:inline">·</span>
                <button
                  onClick={() => {
                    if (!view3D) trackEvent('view_3d_opened', { court_type: config.type });
                    setView3D((v) => !v);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition-all active:scale-95 ${
                    view3D
                      ? 'border-pink-500 bg-pink-700 text-white shadow-sm shadow-pink-900/30'
                      : 'border-pink-500/60 bg-theme-raised text-pink-700 dark:text-pink-300 hover:bg-pink-700 hover:text-white hover:border-pink-500'
                  }`}
                >
                  {view3D ? <Map className="w-3 h-3" /> : <Box className="w-3 h-3" />}
                  {view3D ? '2D' : '3D'}
                </button>
                <button
                  onClick={() => setShowYard(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition-all active:scale-95 border-pink-500/60 bg-theme-raised text-pink-700 dark:text-pink-300 hover:bg-pink-700 hover:text-white hover:border-pink-500"
                >
                  <ImagePlus className="w-3 h-3" />
                  <span className="hidden lg:inline">See it in my yard</span>
                  <span className="lg:hidden">My yard</span>
                </button>
                <button
                  onClick={() => { setShowCompare(true); trackEvent('compare_opened', { court_type: config.type }); }}
                  title="Save designs and compare them side by side"
                  aria-label="Compare designs"
                  className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg border font-semibold text-xs transition-all active:scale-95 border-pink-500/60 bg-theme-raised text-pink-700 dark:text-pink-300 hover:bg-pink-700 hover:text-white hover:border-pink-500"
                >
                  <Columns2 className="w-3 h-3" />
                  <span className="hidden lg:inline">Compare</span>
                </button>
              </div>
            )}
          </div>

          {/* Size container: the showcase and 2D plan grow to the largest 16:10 box
              that fits (cqw/cqh are this box's width/height), on any screen size */}
          <div className="flex-1 min-h-0 flex items-center justify-center p-4 lg:p-8 [container-type:size]">
            {step === 0 ? (
              <div className="w-[min(100cqw,calc((100cqh_-_2rem)_*_1.6),1600px)] animate-fade-in">
                <Showcase onUse={applyShowcaseDesign} />
                <p className="text-theme-muted text-xs text-center mt-3">
                  Start from a sample or choose your property type to design from scratch.
                </p>
              </div>
            ) : view3D ? (
              <div key={`3d-${config.type}`} className="w-full h-full animate-fade-in rounded-xl overflow-hidden">
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-theme-muted text-sm">Loading 3D…</div>}>
                  <Court3D config={config} />
                </Suspense>
              </div>
            ) : (
              <div key={config.type} className="w-[min(100cqw,calc(100cqh_*_1.607))] aspect-[900/560] animate-fade-in">
                <CourtSVG config={config} width={900} height={560} />
              </div>
            )}
          </div>

          <div className="px-6 py-3 border-t border-theme-border bg-theme-panel/50 flex-shrink-0">
            <CourtLegend config={config} step={step} />
          </div>
        </div>
      </div>

      {showCompare && (
        <Suspense fallback={null}>
          <CompareView
            current={config}
            onClose={() => setShowCompare(false)}
            onUse={(c) => { setConfig((prev) => ({ ...c, logo: prev.logo })); setShowCompare(false); }}
          />
        </Suspense>
      )}

      {showYard && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center text-white/70 text-sm">Loading…</div>}>
          <YardView config={config} onClose={() => setShowYard(false)} />
        </Suspense>
      )}

      {/* Off-screen SVG kept in DOM from step 1 onward (and on the thank-you
          screen) for the email and PDF layout image */}
      {step !== 0 && (
        <div aria-hidden style={{ position: 'fixed', left: '-9999px', top: 0, width: '900px', height: '560px', overflow: 'hidden', pointerEvents: 'none' }}>
          <CourtSVG ref={svgRef} config={config} width={900} height={560} hideHotspots />
        </div>
      )}
    </div>
  );
}

const COURT_DESC: Record<CourtType, string> = {
  basketball:     'Basketball court · key areas · three-point arcs · free throw circles',
  tennis:         'Tennis court · service boxes · singles & doubles sidelines',
  pickleball:     'Pickleball court · NVZ kitchen zones · centerline',
  'multi-sport':  'Multi-sport surface · basketball + 2 pickleball overlays',
  'bocce-ball':   'Bocce ball court · foul lines · center line · lane markers',
  shuffleboard:   'Shuffleboard court · scoring triangles · 1-2-3 point zones',
  volleyball:     'Volleyball court · net line · attack lines · service zones',
  badminton:      'Badminton court · net line · service boxes · singles & doubles lines',
  futsal:         'Futsal court · center circle · penalty areas · goal areas',
  'inline-hockey': 'Inline hockey rink · center line · blue lines · face-off circles · goal creases',
  handball:       'Handball court · goal areas · free-throw line · penalty spot',
  'four-square':  'Four square court · four equal quadrants · serving square',
};

const STEP_HINTS: Record<number, string> = {
  0: 'Choose your property type to get started.',
  1: 'Select the sport — the court lines update live.',
  2: 'Pick a standard size or enter custom dimensions.',
  3: 'Tap any color swatch to change the court colors.',
  4: 'Add lighting, nets, hoops, fencing, and more.',
  5: 'Fill in your info and submit to get a free quote.',
};

function CourtLegend({ config, step }: { config: CourtConfig; step: number }) {
  const area = config.dimensions.length * config.dimensions.width;
  if (step === 0) return (
    <div className="text-xs text-theme-muted">
      <p className="text-pink-700 dark:text-pink-300">{STEP_HINTS[0]}</p>
    </div>
  );
  return (
    <div className="text-xs text-theme-muted space-y-0.5">
      <p>{COURT_DESC[config.type]}</p>
      <p className="flex gap-3">
        <span>{config.dimensions.length} × {config.dimensions.width} ft</span>
        <span>·</span>
        <span>{area.toLocaleString()} sq ft</span>
        {config.selectedAccessories.length > 0 && (
          <><span>·</span><span>{config.selectedAccessories.length} accessor{config.selectedAccessories.length === 1 ? 'y' : 'ies'}</span></>
        )}
      </p>
      {step >= 0 && <p className="text-pink-700 dark:text-pink-300">{STEP_HINTS[step]}</p>}
    </div>
  );
}
