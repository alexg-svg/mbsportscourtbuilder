import type { Accessory, AccessoryId, CourtPreset, CourtColors, CourtType, SurfaceFinish } from '../types/court';

// ─── Shared labels and limits ─────────────────────────────────────────────────
// Single source for display names. Typed as complete records so adding a court
// type or finish fails to compile until every label is filled in. The quote
// API (api/send-quote.ts) keeps its own copies and is type-checked against
// these, since server code can't import browser modules at runtime.

export const COURT_LABELS: Record<CourtType, string> = {
  basketball: 'Basketball', tennis: 'Tennis',
  pickleball: 'Pickleball', 'multi-sport': 'Multi-Sport',
  'bocce-ball': 'Bocce Ball', shuffleboard: 'Shuffleboard',
  volleyball: 'Volleyball', badminton: 'Badminton',
  futsal: 'Futsal', 'inline-hockey': 'Inline Hockey',
  handball: 'Handball', 'four-square': 'Four Square',
};

export const FINISH_LABELS: Record<SurfaceFinish, string> = {
  smooth: 'Smooth Asphalt', textured: 'Textured Asphalt', cushioned: 'Cushioned Asphalt',
};

// Optional sales questions on the contact form (the quote API keeps a
// type-checked copy of these labels for the email)
export const LEAD_TIMELINE = {
  asap: 'As soon as possible',
  '1-3-months': 'In 1–3 months',
  '3-6-months': 'In 3–6 months',
  '6-plus-months': 'In 6+ months',
  researching: 'Just researching',
} as const;
export const LEAD_SITE = {
  'existing-slab': 'Existing concrete or asphalt slab',
  resurface: 'Resurfacing an existing court',
  'new-ground': 'New ground (needs a base)',
  'not-sure': 'Not sure yet',
} as const;
export const LEAD_SOURCE = {
  google: 'Google search',
  social: 'Facebook / Instagram',
  referral: 'Friend or neighbor',
  'saw-court': 'Saw one of your courts',
  other: 'Other',
} as const;
export type LeadTimeline = keyof typeof LEAD_TIMELINE;
export type LeadSite = keyof typeof LEAD_SITE;
export type LeadSource = keyof typeof LEAD_SOURCE;

/**
 * Where the customer's logo is painted, in court feet (x along the length,
 * y across the width), and the largest side of its box. Net sports get it in
 * the backcourt so it isn't under the net; basketball half courts get it in
 * the open area away from the hoop.
 */
export function logoPlacement(type: CourtType, L: number, W: number): { x: number; y: number; size: number } {
  const mid = W / 2;
  switch (type) {
    case 'tennis': {
      const back = Math.max((L - 42) / 2, 6);
      return { x: back / 2, y: mid, size: Math.min(W * 0.35, back * 0.85) };
    }
    case 'pickleball': {
      const playL = Math.min(L, 44), offX = (L - playL) / 2;
      return { x: offX + 7.5, y: mid, size: Math.min(Math.min(W, 20) * 0.4, 12) };
    }
    case 'badminton': return { x: 7, y: mid, size: Math.min(W * 0.35, 10) };
    case 'volleyball': return { x: L / 2 - 20, y: mid, size: Math.min(W * 0.4, 16) };
    case 'basketball':
      return L < 60
        ? { x: L * 0.74, y: mid, size: Math.min(W * 0.32, L * 0.36) }
        : { x: L / 2, y: mid, size: Math.min(W * 0.24, 12) };
    case 'shuffleboard':
    case 'bocce-ball': return { x: L / 2, y: mid, size: Math.min(W * 0.8, L * 0.15) };
    case 'four-square': return { x: L / 2, y: mid, size: Math.min(W, L) * 0.3 };
    default: return { x: L / 2, y: mid, size: Math.min(W * 0.28, 14) };
  }
}

/** Logo box in feet, fitted inside `size` × `size` keeping its aspect ratio. */
export function logoBox(logo: { w: number; h: number }, size: number) {
  const k = size / Math.max(logo.w, logo.h);
  return { w: logo.w * k, h: logo.h * k };
}

// ─── Accessory rules ──────────────────────────────────────────────────────────
/** Options where only one in each group can be chosen. */
export const EXCLUSIVE_GROUPS: AccessoryId[][] = [
  ['lighting-2-pole', 'lighting-4-pole', 'lighting-6-pole'],
  ['basketball-hoop-single', 'basketball-hoop-double'],
  ['chain-link-fence', 'vinyl-fence'],
  ['bench-2', 'bench-4'],
];
/** Add-ons that only make sense with another option (windscreen hangs on chain link). */
export const REQUIRES: Partial<Record<AccessoryId, AccessoryId>> = {
  windscreen: 'chain-link-fence',
};

export const isPickOne = (id: AccessoryId) => EXCLUSIVE_GROUPS.some((g) => g.includes(id));

/** Adds `id` to the selection, removing anything it can't be combined with. */
function addAccessory(selected: AccessoryId[], id: AccessoryId): AccessoryId[] {
  const group = EXCLUSIVE_GROUPS.find((g) => g.includes(id));
  const next = selected.filter((x) => x !== id && !group?.includes(x));
  return [...next, id];
}

/** Drops add-ons whose required option isn't selected. */
const dropOrphans = (ids: AccessoryId[]) => ids.filter((x) => !REQUIRES[x] || ids.includes(REQUIRES[x]!));

/** Selecting or unselecting an accessory, applying the pick-one and add-on rules. */
export function toggleAccessory(selected: AccessoryId[], id: AccessoryId): AccessoryId[] {
  if (selected.includes(id)) return dropOrphans(selected.filter((x) => x !== id));
  let next = addAccessory(selected, id);
  const need = REQUIRES[id];
  if (need && !next.includes(need)) next = addAccessory(next, need);
  return dropOrphans(next);
}

/** Cleans a selection from an older draft or a link: last choice wins in each group. */
export function normalizeAccessories(ids: AccessoryId[]): AccessoryId[] {
  return dropOrphans(ids.reduce<AccessoryId[]>((acc, id) => addAccessory(acc, id), []));
}

// ─── Will it fit? ─────────────────────────────────────────────────────────────
/** Accepted range for the customer's available space, in feet. */
export const SPACE_LIMITS = { min: 4, max: 1000 } as const;

/** True if a court fits the space, turned whichever way works. */
export function fitsInSpace(court: { length: number; width: number }, space: { length: number; width: number }) {
  return (court.length <= space.length && court.width <= space.width)
    || (court.length <= space.width && court.width <= space.length);
}

/** Allowed court size in feet (inclusive, whole feet). The quote API enforces the same. */
export const DIM_LIMITS = { length: { min: 10, max: 300 }, width: { min: 4, max: 150 } } as const;

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
  // Bocce Ball
  {
    id: 'bocce-ball-backyard',
    name: 'Backyard',
    type: 'bocce-ball',
    dimensions: { width: 8, length: 56 },
    description: 'Popular residential backyard size',
    recommended: 'residential',
  },
  {
    id: 'bocce-ball-standard',
    name: 'Standard',
    type: 'bocce-ball',
    dimensions: { width: 10, length: 76 },
    description: 'Standard recreational bocce court',
    recommended: 'both',
  },
  {
    id: 'bocce-ball-tournament',
    name: 'Tournament',
    type: 'bocce-ball',
    dimensions: { width: 13, length: 91 },
    description: 'Official tournament regulation size',
    recommended: 'commercial',
  },
  // Badminton
  {
    id: 'badminton-singles',
    name: 'Singles',
    type: 'badminton',
    dimensions: { width: 17, length: 44 },
    description: 'Official singles play width',
    recommended: 'both',
  },
  {
    id: 'badminton-doubles',
    name: 'Doubles',
    type: 'badminton',
    dimensions: { width: 20, length: 44 },
    description: 'Official doubles play – BWF regulation',
    recommended: 'both',
  },
  // Futsal
  {
    id: 'futsal-small',
    name: 'Small',
    type: 'futsal',
    dimensions: { width: 49, length: 82 },
    description: 'Small recreational futsal court',
    recommended: 'residential',
  },
  {
    id: 'futsal-standard',
    name: 'Standard',
    type: 'futsal',
    dimensions: { width: 66, length: 131 },
    description: 'FIFA standard futsal court',
    recommended: 'both',
  },
  {
    id: 'futsal-competition',
    name: 'Competition',
    type: 'futsal',
    dimensions: { width: 82, length: 164 },
    description: 'FIFA competition regulation size',
    recommended: 'commercial',
  },
  // Inline Hockey
  {
    id: 'inline-hockey-mid',
    name: 'Mid-Size',
    type: 'inline-hockey',
    dimensions: { width: 60, length: 120 },
    description: 'Mid-size recreational rink',
    recommended: 'both',
  },
  {
    id: 'inline-hockey-standard',
    name: 'Standard',
    type: 'inline-hockey',
    dimensions: { width: 85, length: 185 },
    description: 'Standard inline hockey rink',
    recommended: 'both',
  },
  {
    id: 'inline-hockey-nhl',
    name: 'NHL Size',
    type: 'inline-hockey',
    dimensions: { width: 85, length: 200 },
    description: 'NHL regulation rink size',
    recommended: 'commercial',
  },
  // Handball
  {
    id: 'handball-standard',
    name: 'Standard',
    type: 'handball',
    dimensions: { width: 66, length: 131 },
    description: 'IHF regulation handball court',
    recommended: 'both',
  },
  // Volleyball
  {
    id: 'volleyball-standard',
    name: 'Standard',
    type: 'volleyball',
    dimensions: { width: 30, length: 60 },
    description: 'FIVB regulation volleyball court',
    recommended: 'both',
  },
  {
    id: 'volleyball-beach',
    name: 'Beach Volleyball',
    type: 'volleyball',
    dimensions: { width: 26, length: 52 },
    description: 'FIVB beach volleyball court',
    recommended: 'residential',
  },
  // Shuffleboard
  {
    id: 'shuffleboard-standard',
    name: 'Standard',
    type: 'shuffleboard',
    dimensions: { width: 6, length: 52 },
    description: 'Standard shuffleboard court',
    recommended: 'both',
  },
  // Four-Square
  {
    id: 'four-square-standard',
    name: 'Standard',
    type: 'four-square',
    dimensions: { width: 16, length: 16 },
    description: 'Standard four-square court',
    recommended: 'both',
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
  'bocce-ball': {
    surface: '#D4B483',
    lines:   '#FFFFFF',
    border:  '#78350F',
  },
  badminton: {
    surface: '#1E40AF',
    lines:   '#FFFFFF',
    border:  '#1E3A5F',
  },
  futsal: {
    surface: '#374151',
    lines:   '#FFFFFF',
    border:  '#111827',
  },
  'inline-hockey': {
    surface: '#E2E8F0',
    lines:   '#1E40AF',
    border:  '#CBD5E1',
  },
  handball: {
    surface: '#D97706',
    lines:   '#FFFFFF',
    border:  '#92400E',
  },
  volleyball: {
    surface: '#D4B483',
    lines:   '#FFFFFF',
    border:  '#78350F',
  },
  shuffleboard: {
    surface: '#374151',
    lines:   '#FFFFFF',
    border:  '#111827',
  },
  'four-square': {
    surface: '#3B82F6',
    lines:   '#FFFFFF',
    border:  '#1E40AF',
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
  // Customization
  {
    id: 'custom-logo',
    name: 'Custom Logo',
    description: 'Add your team, school, or brand logo to the court surface. Upload it to see it on your design.',
    category: 'customization',
    compatibleCourts: [
      'basketball', 'tennis', 'pickleball', 'multi-sport', 'bocce-ball', 'badminton',
      'futsal', 'inline-hockey', 'handball', 'volleyball', 'shuffleboard', 'four-square',
    ],
  },
  // Sport Equipment
  {
    id: 'basketball-hoop-single',
    name: 'Basketball Hoop (1)',
    description: 'Single adjustable in-ground hoop with breakaway rim',
    category: 'sport-equipment',
    compatibleCourts: ['basketball', 'multi-sport'],
  },
  {
    id: 'basketball-hoop-double',
    name: 'Basketball Hoops (2)',
    description: 'Pair of adjustable in-ground hoops – full court setup',
    category: 'sport-equipment',
    compatibleCourts: ['basketball', 'multi-sport'],
  },
  {
    id: 'tennis-net',
    name: 'Tennis Net & Posts',
    description: 'Center strap net with steel posts, regulation height',
    category: 'sport-equipment',
    compatibleCourts: ['tennis', 'multi-sport'],
  },
  {
    id: 'pickleball-net',
    name: 'Pickleball Net & Posts',
    description: 'Portable or permanent net system, 34" center height',
    category: 'sport-equipment',
    compatibleCourts: ['pickleball', 'multi-sport'],
  },
  // Net accessories for other sports
  {
    id: 'volleyball-net',
    name: 'Volleyball Net & Posts',
    description: 'Regulation height volleyball net with steel posts',
    category: 'net',
    compatibleCourts: ['volleyball'],
  },
  {
    id: 'badminton-net',
    name: 'Badminton Net & Posts',
    description: 'Regulation height badminton net with steel posts',
    category: 'net',
    compatibleCourts: ['badminton'],
  },
  // Goals & Equipment
  {
    id: 'futsal-goals',
    name: 'Futsal Goals (pair)',
    description: 'Pair of regulation futsal goals, 10 ft wide, with net',
    category: 'goals',
    compatibleCourts: ['futsal'],
  },
  {
    id: 'handball-goals',
    name: 'Handball Goals (pair)',
    description: 'Pair of regulation handball goals, 10 ft wide, with net',
    category: 'goals',
    compatibleCourts: ['handball'],
  },
  {
    id: 'hockey-goals',
    name: 'Hockey Goals (pair)',
    description: 'Pair of regulation inline hockey goals, 6 ft wide, with net',
    category: 'goals',
    compatibleCourts: ['inline-hockey'],
  },
  {
    id: 'dasher-boards',
    name: 'Dasher Boards',
    description: 'Perimeter dasher board system for inline hockey rink',
    category: 'goals',
    compatibleCourts: ['inline-hockey'],
  },
  {
    id: 'bocce-side-rails',
    name: 'Bocce Side Rails',
    description: 'Wooden side rail system along the long sides of the bocce court',
    category: 'goals',
    compatibleCourts: ['bocce-ball'],
  },
  // Lighting
  {
    id: 'lighting-2-pole',
    name: 'Lighting – 2 Poles',
    description: 'Two 20-ft light poles, ideal for half court or pickleball',
    category: 'lighting',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  {
    id: 'lighting-4-pole',
    name: 'Lighting – 4 Poles',
    description: 'Four 20-ft poles for full coverage on full courts',
    category: 'lighting',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  {
    id: 'lighting-6-pole',
    name: 'Lighting – 6 Poles',
    description: 'Six 20-ft poles for commercial-grade full-court lighting',
    category: 'lighting',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  // Fencing
  {
    id: 'chain-link-fence',
    name: 'Chain Link Fence',
    description: 'Galvanized steel chain-link perimeter fencing, 10 ft high',
    category: 'fencing',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  {
    id: 'vinyl-fence',
    name: 'Vinyl Fence',
    description: 'White vinyl perimeter fencing, low-maintenance',
    category: 'fencing',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  {
    id: 'windscreen',
    name: 'Windscreen',
    description: 'UV-resistant privacy & wind-reduction screen for fence',
    category: 'fencing',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  // Amenities
  {
    id: 'bench-2',
    name: 'Player Benches (2)',
    description: 'Two aluminum bleacher benches, seats 4–6 each',
    category: 'amenities',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  {
    id: 'bench-4',
    name: 'Player Benches (4)',
    description: 'Four aluminum benches for larger commercial courts',
    category: 'amenities',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  {
    id: 'water-fountain',
    name: 'Water Fountain',
    description: 'Outdoor-rated drinking fountain with drain connection',
    category: 'amenities',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
  {
    id: 'scoreboards',
    name: 'Scoreboard',
    description: 'LED electronic scoreboard with remote, weatherproof',
    category: 'amenities',
    compatibleCourts: ['basketball', 'tennis', 'pickleball', 'multi-sport'],
  },
];

export const ACCESSORY_CATEGORIES = [
  { id: 'customization',    label: 'Customization' },
  { id: 'sport-equipment',  label: 'Sport Equipment' },
  { id: 'net',              label: 'Nets & Posts' },
  { id: 'goals',            label: 'Goals & Equipment' },
  { id: 'lighting',         label: 'Lighting' },
  { id: 'fencing',          label: 'Fencing' },
  { id: 'amenities',        label: 'Amenities' },
] as const;
