import type { Accessory, CourtPreset, CourtColors, CourtType } from '../types/court';

// ─── Standard Court Presets ────────────────────────────────────────────────
export const COURT_PRESETS: CourtPreset[] = [
  // Basketball
  {
    id: 'basketball-nba',
    name: 'NBA Full Court',
    type: 'basketball',
    dimensions: { width: 50, length: 94 },
    description: 'Official NBA regulation size',
    recommended: 'commercial',
  },
  {
    id: 'basketball-college',
    name: 'College Full Court',
    type: 'basketball',
    dimensions: { width: 50, length: 84 },
    description: 'NCAA regulation size',
    recommended: 'commercial',
  },
  {
    id: 'basketball-half',
    name: 'Half Court',
    type: 'basketball',
    dimensions: { width: 50, length: 47 },
    description: 'Popular for residential driveways & backyard',
    recommended: 'residential',
  },
  {
    id: 'basketball-recreational',
    name: 'Recreational Court',
    type: 'basketball',
    dimensions: { width: 42, length: 74 },
    description: 'Standard recreational play',
    recommended: 'both',
  },
  // Tennis
  {
    id: 'tennis-singles',
    name: 'Singles Court',
    type: 'tennis',
    dimensions: { width: 27, length: 78 },
    description: 'Official singles play width',
    recommended: 'residential',
  },
  {
    id: 'tennis-doubles',
    name: 'Doubles Court',
    type: 'tennis',
    dimensions: { width: 36, length: 78 },
    description: 'Official doubles play – ITF regulation',
    recommended: 'both',
  },
  {
    id: 'tennis-full',
    name: 'Full Court w/ Run-offs',
    type: 'tennis',
    dimensions: { width: 60, length: 120 },
    description: 'Court + standard run-off clearances',
    recommended: 'commercial',
  },
  // Pickleball
  {
    id: 'pickleball-standard',
    name: 'Standard Court',
    type: 'pickleball',
    dimensions: { width: 20, length: 44 },
    description: 'Official USAPA regulation size',
    recommended: 'both',
  },
  {
    id: 'pickleball-clearance',
    name: 'Court w/ Clearance',
    type: 'pickleball',
    dimensions: { width: 30, length: 60 },
    description: 'Court + recommended clearance zones',
    recommended: 'both',
  },
  // Multi-sport
  {
    id: 'multi-sport-small',
    name: 'Multi-Sport (Small)',
    type: 'multi-sport',
    dimensions: { width: 50, length: 94 },
    description: 'Basketball + 2 Pickleball overlaid',
    recommended: 'residential',
  },
  {
    id: 'multi-sport-large',
    name: 'Multi-Sport (Large)',
    type: 'multi-sport',
    dimensions: { width: 60, length: 120 },
    description: 'Tennis + Basketball + Pickleball combo',
    recommended: 'commercial',
  },
];

// ─── Default Colors Per Court Type ───────────────────────────────────────────
export const DEFAULT_COLORS: Record<CourtType, CourtColors> = {
  basketball: {
    surface: '#C8440C',
    lines:   '#FFFFFF',
    border:  '#1A3A6B',
    keyArea: '#1A3A6B',
  },
  tennis: {
    surface:    '#2D7D3A',
    lines:      '#FFFFFF',
    border:     '#1A5C2A',
    serviceBox: '#3A9E4A',
  },
  pickleball: {
    surface: '#3B82F6',
    lines:   '#FFFFFF',
    border:  '#1E40AF',
    kitchen: '#60A5FA',
  },
  'multi-sport': {
    surface: '#1A3A6B',
    lines:   '#FFFFFF',
    border:  '#0F2147',
    keyArea: '#C8440C',
  },
};

// ─── Color Palette Options ────────────────────────────────────────────────────
export const SURFACE_COLORS = [
  { label: 'Court Red',      value: '#C8440C' },
  { label: 'Forest Green',   value: '#2D7D3A' },
  { label: 'Sport Blue',     value: '#3B82F6' },
  { label: 'Navy Blue',      value: '#1A3A6B' },
  { label: 'Slate Gray',     value: '#64748B' },
  { label: 'Charcoal',       value: '#374151' },
  { label: 'Clay Orange',    value: '#D97706' },
  { label: 'Royal Purple',   value: '#7C3AED' },
  { label: 'Teal',           value: '#0F766E' },
  { label: 'Burgundy',       value: '#7F1D1D' },
  { label: 'Classic Black',  value: '#111827' },
  { label: 'Sand',           value: '#D4B483' },
];

export const LINE_COLORS = [
  { label: 'White',        value: '#FFFFFF' },
  { label: 'Yellow',       value: '#FCD34D' },
  { label: 'Black',        value: '#111827' },
  { label: 'Light Gray',   value: '#D1D5DB' },
  { label: 'Orange',       value: '#F97316' },
];

export const BORDER_COLORS = [
  { label: 'Navy Blue',    value: '#1A3A6B' },
  { label: 'Dark Green',   value: '#14532D' },
  { label: 'Charcoal',     value: '#374151' },
  { label: 'Dark Red',     value: '#7F1D1D' },
  { label: 'Dark Gray',    value: '#1F2937' },
  { label: 'Black',        value: '#111827' },
  { label: 'Dark Teal',    value: '#134E4A' },
  { label: 'Dark Purple',  value: '#4C1D95' },
];

// ─── Accessories ──────────────────────────────────────────────────────────────
export const ACCESSORIES: Accessory[] = [
  // Sport Equipment
  {
    id: 'basketball-hoop-single',
    name: 'Basketball Hoop (1)',
    description: 'Single adjustable in-ground hoop with breakaway rim',
    category: 'sport-equipment',
    icon: '🏀',
    compatibleCourts: ['basketball', 'multi-sport'],
  },
  {
    id: 'basketball-hoop-double',
    name: 'Basketball Hoops (2)',
    description: 'Pair of adjustable in-ground hoops – full court setup',
    category: 'sport-equipment',
    icon: '🏀',
    compatibleCourts: ['basketball', 'multi-sport'],
  },
  {
    id: 'tennis-net',
    name: 'Tennis Net & Posts',
    description: 'Center strap net with steel posts, regulation height',
    category: 'sport-equipment',
    icon: '🎾',
    compatibleCourts: ['tennis', 'multi-sport'],
  },
  {
    id: 'pickleball-net',
    name: 'Pickleball Net & Posts',
    description: 'Portable or permanent net system, 34" center height',
    category: 'sport-equipment',
    icon: '🏓',
    compatibleCourts: ['pickleball', 'multi-sport'],
  },
  // Lighting
  {
    id: 'lighting-2-pole',
    name: 'Lighting – 2 Poles',
    description: 'Two 20-ft light poles, ideal for half court or pickleball',
    category: 'lighting',
    icon: '💡',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  {
    id: 'lighting-4-pole',
    name: 'Lighting – 4 Poles',
    description: 'Four 20-ft poles for full coverage on full courts',
    category: 'lighting',
    icon: '💡',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  {
    id: 'lighting-6-pole',
    name: 'Lighting – 6 Poles',
    description: 'Six 20-ft poles for commercial-grade full-court lighting',
    category: 'lighting',
    icon: '💡',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  // Fencing
  {
    id: 'chain-link-fence',
    name: 'Chain Link Fence',
    description: 'Galvanized steel chain-link perimeter fencing, 10 ft high',
    category: 'fencing',
    icon: '🔲',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  {
    id: 'vinyl-fence',
    name: 'Vinyl Fence',
    description: 'White vinyl perimeter fencing, low-maintenance',
    category: 'fencing',
    icon: '🔲',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  {
    id: 'windscreen',
    name: 'Windscreen',
    description: 'UV-resistant privacy & wind-reduction screen for fence',
    category: 'fencing',
    icon: '🛡️',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  // Amenities
  {
    id: 'bench-2',
    name: 'Player Benches (2)',
    description: 'Two aluminum bleacher benches, seats 4–6 each',
    category: 'amenities',
    icon: '🪑',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  {
    id: 'bench-4',
    name: 'Player Benches (4)',
    description: 'Four aluminum benches for larger commercial courts',
    category: 'amenities',
    icon: '🪑',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  {
    id: 'water-fountain',
    name: 'Water Fountain',
    description: 'Outdoor-rated drinking fountain with drain connection',
    category: 'amenities',
    icon: '💧',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  {
    id: 'scoreboards',
    name: 'Scoreboard',
    description: 'LED electronic scoreboard with remote, weatherproof',
    category: 'amenities',
    icon: '📋',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
];

export const ACCESSORY_CATEGORIES = [
  { id: 'sport-equipment', label: 'Sport Equipment' },
  { id: 'lighting',         label: 'Lighting' },
  { id: 'fencing',          label: 'Fencing' },
  { id: 'amenities',        label: 'Amenities' },
] as const;
