import React, { useState, useCallback } from 'react';
import type { CourtConfig, CourtType, PropertyType, AccessoryId, CourtDimensions, CourtColors, SurfaceFinish } from './types/court';
import { DEFAULT_COLORS, COURT_PRESETS, ACCESSORIES } from './utils/courtData';
import { CourtSVG } from './components/Court/CourtSVG';
import { CourtTypeSelector } from './components/Controls/CourtTypeSelector';
import { DimensionsPanel } from './components/Controls/DimensionsPanel';
import { ColorsPanel } from './components/Controls/ColorsPanel';
import { AccessoriesPanel } from './components/Controls/AccessoriesPanel';
import { QuotePanel } from './components/Quote/QuotePanel';

type Tab = 'type' | 'size' | 'colors' | 'accessories' | 'quote';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'type',        label: 'Court',       icon: '🏟️' },
  { id: 'size',        label: 'Size',         icon: '📐' },
  { id: 'colors',      label: 'Colors',       icon: '🎨' },
  { id: 'accessories', label: 'Extras',       icon: '⚡' },
  { id: 'quote',       label: 'Get Quote',    icon: '💬' },
];

function getDefaultDimensions(type: CourtType, propertyType: PropertyType): CourtDimensions {
  const preferred = COURT_PRESETS.find(
    (p) => p.type === type && (p.recommended === propertyType || p.recommended === 'both'),
  );
  return preferred?.dimensions ?? COURT_PRESETS.find((p) => p.type === type)!.dimensions;
}

const initialType: CourtType     = 'basketball';
const initialProperty: PropertyType = 'residential';

const initialConfig: CourtConfig = {
  type:                initialType,
  propertyType:        initialProperty,
  dimensions:          getDefaultDimensions(initialType, initialProperty),
  colors:              DEFAULT_COLORS[initialType],
  surfaceFinish:       'smooth',
  selectedAccessories: ['basketball-hoop-double'],
  customDimensions:    false,
};

export default function App() {
  const [config, setConfig]     = useState<CourtConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<Tab>('type');
  const [showPreview, setShowPreview] = useState(false);

  const updateConfig = useCallback(<K extends keyof CourtConfig>(key: K, value: CourtConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleCourtTypeChange = useCallback((type: CourtType) => {
    setConfig((prev) => ({
      ...prev,
      type,
      dimensions:          getDefaultDimensions(type, prev.propertyType),
      colors:              DEFAULT_COLORS[type],
      selectedAccessories: [],
      customDimensions:    false,
    }));
  }, []);

  const handlePropertyTypeChange = useCallback((propertyType: PropertyType) => {
    setConfig((prev) => ({
      ...prev,
      propertyType,
      dimensions: getDefaultDimensions(prev.type, propertyType),
      customDimensions: false,
    }));
  }, []);

  const handleAccessoryToggle = useCallback((id: AccessoryId) => {
    setConfig((prev) => {
      const acc = ACCESSORIES.find((a) => a.id === id)!;
      // Mutual exclusion within lighting and hoops
      const mutualExclusionGroups: AccessoryId[][] = [
        ['lighting-2-pole', 'lighting-4-pole', 'lighting-6-pole'],
        ['basketball-hoop-single', 'basketball-hoop-double'],
      ];
      let updated = [...prev.selectedAccessories];
      if (updated.includes(id)) {
        updated = updated.filter((x) => x !== id);
      } else {
        // Remove siblings
        for (const group of mutualExclusionGroups) {
          if (group.includes(id)) updated = updated.filter((x) => !group.includes(x));
        }
        updated.push(id);
      }
      return { ...prev, selectedAccessories: updated };
    });
  }, []);

  const accessoryCount  = config.selectedAccessories.length;
  const selectedAreaStr = `${config.dimensions.length}×${config.dimensions.width} ft`;

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sky-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-sky-900/40">
            🏟️
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">MB Sports Court Builder</div>
            <div className="text-xs text-gray-500">Asphalt Court Installation</div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
          <span>📍 Residential &amp; Commercial</span>
          <span>·</span>
          <span>Tennis · Basketball · Pickleball</span>
        </div>
        {/* Mobile preview toggle */}
        <button
          className="sm:hidden text-xs bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-lg"
          onClick={() => setShowPreview((v) => !v)}
        >
          {showPreview ? '⚙️ Controls' : '👁️ Preview'}
        </button>
      </header>

      {/* ── Main Layout ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Panel — Controls */}
        <aside className={`
          ${showPreview ? 'hidden' : 'flex'} sm:flex
          flex-col w-full sm:w-80 lg:w-96 bg-gray-900 border-r border-gray-800
          overflow-y-auto flex-shrink-0
        `}>
          {/* Tab bar */}
          <div className="flex border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 text-center transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
                title={tab.label}
              >
                <div className="text-base">{tab.icon}</div>
                <div className="text-xs font-medium mt-0.5 hidden lg:block">{tab.label}</div>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {/* Court info strip */}
            <div className="flex items-center gap-2 mb-4 p-2 bg-gray-800/60 rounded-lg border border-gray-700 text-xs">
              <span className="font-semibold text-sky-400">{config.type.charAt(0).toUpperCase() + config.type.slice(1)}</span>
              <span className="text-gray-600">·</span>
              <span className="text-gray-400">{selectedAreaStr}</span>
              {accessoryCount > 0 && (
                <>
                  <span className="text-gray-600">·</span>
                  <span className="text-gray-400">{accessoryCount} accessory{accessoryCount !== 1 ? 'ies' : ''}</span>
                </>
              )}
            </div>

            {activeTab === 'type' && (
              <CourtTypeSelector
                courtType={config.type}
                propertyType={config.propertyType}
                onCourtTypeChange={handleCourtTypeChange}
                onPropertyTypeChange={handlePropertyTypeChange}
              />
            )}
            {activeTab === 'size' && (
              <DimensionsPanel
                courtType={config.type}
                dimensions={config.dimensions}
                customDimensions={config.customDimensions}
                onDimensionsChange={(d: CourtDimensions) => updateConfig('dimensions', d)}
                onCustomToggle={(v: boolean) => updateConfig('customDimensions', v)}
              />
            )}
            {activeTab === 'colors' && (
              <ColorsPanel
                courtType={config.type}
                colors={config.colors}
                surfaceFinish={config.surfaceFinish}
                onColorsChange={(c: CourtColors) => updateConfig('colors', c)}
                onSurfaceFinishChange={(f: SurfaceFinish) => updateConfig('surfaceFinish', f)}
              />
            )}
            {activeTab === 'accessories' && (
              <AccessoriesPanel
                courtType={config.type}
                selected={config.selectedAccessories}
                onToggle={handleAccessoryToggle}
              />
            )}
            {activeTab === 'quote' && (
              <QuotePanel config={config} />
            )}
          </div>

          {/* Next step CTA */}
          {activeTab !== 'quote' && (
            <div className="p-4 border-t border-gray-800">
              <button
                onClick={() => {
                  const idx = TABS.findIndex((t) => t.id === activeTab);
                  setActiveTab(TABS[Math.min(idx + 1, TABS.length - 1)].id);
                }}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-sky-900/30"
              >
                Next: {TABS[TABS.findIndex((t) => t.id === activeTab) + 1]?.label ?? 'Get Quote'} →
              </button>
            </div>
          )}
        </aside>

        {/* Right Panel — Court Preview */}
        <main className={`
          ${showPreview ? 'flex' : 'hidden'} sm:flex
          flex-1 flex-col bg-gray-950 overflow-hidden
        `}>
          {/* Preview header */}
          <div className="px-6 py-3 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
            <div>
              <h2 className="text-sm font-semibold text-white">Live Court Preview</h2>
              <p className="text-xs text-gray-500 mt-0.5">Updates in real-time as you configure</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                Live
              </span>
              <span>·</span>
              <span className="font-mono">{config.dimensions.length} × {config.dimensions.width} ft</span>
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
            <div className="w-full max-w-4xl aspect-[16/10]">
              <CourtSVG config={config} width={900} height={560} />
            </div>
          </div>

          {/* Legend */}
          <div className="px-6 py-3 border-t border-gray-800 bg-gray-900/30">
            <CourtLegend config={config} />
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Legend ─────────────────────────────────────────────────────────────────
const COURT_DESCRIPTIONS: Record<string, string> = {
  basketball:  'Asphalt basketball court with regulation markings, key areas, and three-point arcs.',
  tennis:      'Asphalt tennis court with service boxes, singles and doubles sidelines.',
  pickleball:  'Asphalt pickleball court with NVZ kitchen zones and centerline markings.',
  'multi-sport': 'Multi-sport asphalt surface combining basketball + 2 pickleball courts (yellow overlay).',
};

function CourtLegend({ config }: { config: CourtConfig }) {
  const area = config.dimensions.length * config.dimensions.width;
  const perim = 2 * (config.dimensions.length + config.dimensions.width);
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">
      <span>{COURT_DESCRIPTIONS[config.type]}</span>
      <span className="text-gray-700">·</span>
      <span>Perimeter: <span className="text-gray-300">{perim} ft</span></span>
      <span className="text-gray-700">·</span>
      <span>Area: <span className="text-gray-300">{area.toLocaleString()} sq ft</span></span>
      {config.selectedAccessories.length > 0 && (
        <>
          <span className="text-gray-700">·</span>
          <span>Accessories: <span className="text-gray-300">{config.selectedAccessories.length}</span></span>
        </>
      )}
    </div>
  );
}
