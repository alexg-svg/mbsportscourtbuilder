import type { CourtConfig } from '../types/court';
import { DEFAULT_COLORS } from './courtData';

// Sample designs shown on Step 1. The pictures in /public/showcase are
// rendered from these exact configs by scripts/render-showcase.mjs; re-run it
// after changing a design or the 3D look.

export interface ShowcaseItem {
  id: string;
  title: string;
  caption: string;
  time: 'day' | 'sunset' | 'night';
  config: CourtConfig;
}

const base = (c: Partial<CourtConfig> & Pick<CourtConfig, 'type'>): CourtConfig => ({
  propertyType: 'residential',
  surfaceFinish: 'smooth',
  dimensions: { length: 47, width: 50 },
  customDimensions: false,
  colors: DEFAULT_COLORS[c.type],
  selectedAccessories: [],
  ...c,
});

export const SHOWCASE: ShowcaseItem[] = [
  {
    id: 'backyard-hoops-night', title: 'Backyard half court', caption: 'Classic red & navy · LED lighting', time: 'night',
    config: base({
      type: 'basketball',
      colors: { surface: '#C8440C', lines: '#FFFFFF', border: '#1A3A6B', keyArea: '#1A3A6B' },
      selectedAccessories: ['basketball-hoop-single', 'lighting-2-pole', 'bench-2'],
    }),
  },
  {
    id: 'club-tennis', title: 'Club tennis court', caption: 'Pro blue · windscreen · 4-pole lighting', time: 'day',
    config: base({
      type: 'tennis', propertyType: 'commercial', surfaceFinish: 'textured',
      dimensions: { length: 78, width: 36 },
      colors: { surface: '#3B82F6', lines: '#FFFFFF', border: '#1A3A6B', serviceBox: '#3B82F6' },
      selectedAccessories: ['tennis-net', 'lighting-4-pole', 'chain-link-fence', 'windscreen', 'bench-2'],
    }),
  },
  {
    id: 'pickleball', title: 'Backyard pickleball', caption: 'Pro blue · net and benches', time: 'day',
    config: base({
      type: 'pickleball', dimensions: { length: 60, width: 30 },
      colors: { surface: '#3B82F6', lines: '#FFFFFF', border: '#1E40AF', kitchen: '#60A5FA' },
      selectedAccessories: ['pickleball-net', 'bench-2'],
    }),
  },
  {
    id: 'multi-sport', title: 'Family multi-sport court', caption: 'Basketball + pickleball in one', time: 'day',
    config: base({
      type: 'multi-sport', dimensions: { length: 94, width: 50 },
      colors: { surface: '#1A3A6B', lines: '#FFFFFF', border: '#0F2147', keyArea: '#C8440C' },
      selectedAccessories: ['basketball-hoop-double', 'pickleball-net', 'vinyl-fence'],
    }),
  },
  {
    id: 'futsal', title: 'Futsal court', caption: 'Midnight · goals and lighting', time: 'night',
    config: base({
      type: 'futsal', propertyType: 'commercial', dimensions: { length: 131, width: 66 },
      colors: { surface: '#374151', lines: '#FCD34D', border: '#111827' },
      selectedAccessories: ['futsal-goals', 'lighting-6-pole'],
    }),
  },
];
