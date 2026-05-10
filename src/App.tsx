import React, { useState, useCallback } from 'react';
import { Eye, ClipboardList, Box, Map } from 'lucide-react';
import type { CourtConfig, CourtType, PropertyType, AccessoryId, CourtDimensions, CourtColors, SurfaceFinish } from './types/court';
import { DEFAULT_COLORS, COURT_PRESETS, ACCESSORIES } from './utils/courtData';
import { CourtSVG } from './components/Court/CourtSVG';
import { Court3D } from './components/Court/Court3D';
import { StepProgress } from './components/Wizard/StepProgress';
import { Step1Property } from './components/Wizard/Step1Property';
import { Step2CourtType } from './components/Wizard/Step2CourtType';
import { Step3Size } from './components/Wizard/Step3Size';
import { Step4Colors } from './components/Wizard/Step4Colors';
import { Step5Accessories } from './components/Wizard/Step5Accessories';
import { Step6Contact } from './components/Wizard/Step6Contact';
import type { ContactData } from './components/Wizard/Step6Contact';
import { StepDone } from './components/Wizard/StepDone';

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

export default function App() {
  const [step, setStep]           = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [config, setConfig]       = useState<CourtConfig>(initialConfig);
  const [submitted, setSubmitted] = useState<ContactData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [view3D, setView3D]       = useState(false);

  const next = () => { setDirection('forward'); setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)); };
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
    setConfig((prev) => {
      const exclusionGroups: AccessoryId[][] = [
        ['lighting-2-pole', 'lighting-4-pole', 'lighting-6-pole'],
        ['basketball-hoop-single', 'basketball-hoop-double'],
      ];
      let next = [...prev.selectedAccessories];
      if (next.includes(id)) {
        next = next.filter((x) => x !== id);
      } else {
        for (const group of exclusionGroups) {
          if (group.includes(id)) next = next.filter((x) => !group.includes(x));
        }
        next.push(id);
      }
      return { ...prev, selectedAccessories: next };
    });
  }, []);

  const handleSubmit = (data: ContactData) => { setSubmitted(data); setStep(-1); };
  const handleReset  = () => { setConfig(initialConfig); setSubmitted(null); setStep(0); setShowPreview(false); };

  const renderStep = () => {
    switch (step) {
      case 0: return <Step1Property propertyType={config.propertyType} onChange={handlePropertyChange} onNext={next} />;
      case 1: return <Step2CourtType courtType={config.type} onChange={handleCourtTypeChange} onBack={back} onNext={next} />;
      case 2: return (
        <Step3Size
          courtType={config.type} dimensions={config.dimensions} customDimensions={config.customDimensions}
          onDimensionsChange={(d: CourtDimensions) => update('dimensions', d)}
          onCustomToggle={(v: boolean) => update('customDimensions', v)}
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
      case 4: return <Step5Accessories courtType={config.type} selected={config.selectedAccessories} onToggle={handleAccessoryToggle} onBack={back} onNext={next} />;
      case 5: return <Step6Contact config={config} onBack={back} onSubmit={handleSubmit} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-theme-base text-theme-primary font-sans flex flex-col">

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
          <span className="text-pink-500 font-semibold">mbsportsbuilders.com</span>
          <span className="text-theme-faint">·</span>
          <span className="text-theme-muted">Tennis · Basketball · Pickleball · Multi-Sport</span>
        </div>
        {step >= 0 && (
          <button
            className="sm:hidden text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-all active:scale-95 bg-pink-600 border border-pink-500 text-white shadow-sm shadow-pink-900/30"
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
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Wizard panel */}
        <div className={`
          ${showPreview ? 'hidden' : 'flex'} sm:flex
          flex-col w-full sm:w-[400px] lg:w-[440px]
          bg-theme-panel border-r border-theme-border flex-shrink-0 overflow-hidden
        `}>
          {step === -1 ? (
            <StepDone name={submitted?.name ?? ''} email={submitted?.email ?? ''} onReset={handleReset} />
          ) : (
            <>
              <StepProgress current={step} />
              <div
                key={step}
                className={`flex-1 overflow-hidden ${direction === 'forward' ? 'animate-step-enter' : 'animate-step-enter-back'}`}
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
              <p className="text-xs text-theme-muted mt-0.5">Updates as you configure your court</p>
            </div>
            {step > 0 && (
              <div className="flex items-center gap-3 text-xs text-theme-muted">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Live
                </span>
                <span>·</span>
                <span className="font-mono">{config.dimensions.length} × {config.dimensions.width} ft</span>
                <span>·</span>
                <button
                  onClick={() => setView3D((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition-all active:scale-95 ${
                    view3D
                      ? 'border-pink-500 bg-pink-600 text-white shadow-sm shadow-pink-900/30'
                      : 'border-pink-500/60 bg-theme-raised text-pink-400 hover:bg-pink-600 hover:text-white hover:border-pink-500'
                  }`}
                >
                  {view3D ? <Map className="w-3 h-3" /> : <Box className="w-3 h-3" />}
                  {view3D ? '2D' : '3D'}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
            {step === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 text-center animate-fade-in">
                <img
                  src="/mb-sports-builders-logo.webp"
                  alt="MB Sports Builders"
                  className="w-48 opacity-60"
                />
                <p className="text-theme-muted text-sm max-w-xs">
                  Your court preview will appear here as you configure your build.
                </p>
              </div>
            ) : view3D ? (
              <div key={`3d-${config.type}`} className="w-full h-full animate-fade-in rounded-xl overflow-hidden">
                <Court3D config={config} />
              </div>
            ) : (
              <div key={config.type} className="w-full max-w-4xl aspect-[16/10] animate-fade-in">
                <CourtSVG config={config} width={900} height={560} />
              </div>
            )}
          </div>

          <div className="px-6 py-3 border-t border-theme-border bg-theme-panel/50 flex-shrink-0">
            <CourtLegend config={config} step={step} />
          </div>
        </div>
      </div>
    </div>
  );
}

const COURT_DESC: Record<string, string> = {
  basketball:  'Basketball court · key areas · three-point arcs · free throw circles',
  tennis:      'Tennis court · service boxes · singles & doubles sidelines',
  pickleball:  'Pickleball court · NVZ kitchen zones · centerline',
  'multi-sport': 'Multi-sport surface · basketball + 2 pickleball overlays',
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
    <div className="text-xs text-theme-faint">
      <p className="text-pink-400/60">{STEP_HINTS[0]}</p>
    </div>
  );
  return (
    <div className="text-xs text-theme-faint space-y-0.5">
      <p>{COURT_DESC[config.type]}</p>
      <p className="flex gap-3">
        <span>{config.dimensions.length} × {config.dimensions.width} ft</span>
        <span>·</span>
        <span>{area.toLocaleString()} sq ft</span>
        {config.selectedAccessories.length > 0 && (
          <><span>·</span><span>{config.selectedAccessories.length} accessor{config.selectedAccessories.length === 1 ? 'y' : 'ies'}</span></>
        )}
      </p>
      {step >= 0 && <p className="text-pink-400/60">{STEP_HINTS[step]}</p>}
    </div>
  );
}
