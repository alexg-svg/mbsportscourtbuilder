export type CourtType = 'basketball' | 'tennis' | 'pickleball' | 'multi-sport';
export type PropertyType = 'residential' | 'commercial';
export type SurfaceFinish = 'smooth' | 'textured' | 'cushioned';

export interface CourtDimensions {
  width: number;   // feet
  length: number;  // feet
}

export interface CourtColors {
  surface: string;
  lines: string;
  border: string;
  keyArea?: string;      // basketball paint / service boxes
  serviceBox?: string;   // tennis
  kitchen?: string;      // pickleball
}

export type AccessoryId =
  | 'basketball-hoop-single'
  | 'basketball-hoop-double'
  | 'tennis-net'
  | 'pickleball-net'
  | 'lighting-2-pole'
  | 'lighting-4-pole'
  | 'lighting-6-pole'
  | 'chain-link-fence'
  | 'vinyl-fence'
  | 'windscreen'
  | 'bench-2'
  | 'bench-4'
  | 'water-fountain'
  | 'scoreboards';

export interface Accessory {
  id: AccessoryId;
  name: string;
  description: string;
  category: 'sport-equipment' | 'lighting' | 'fencing' | 'amenities';
  icon: string;
  priceEstimate: string;
  compatibleCourts: CourtType[];
}

export interface CourtPreset {
  id: string;
  name: string;
  type: CourtType;
  dimensions: CourtDimensions;
  description: string;
  recommended: 'residential' | 'commercial' | 'both';
}

export interface CourtConfig {
  type: CourtType;
  propertyType: PropertyType;
  dimensions: CourtDimensions;
  colors: CourtColors;
  surfaceFinish: SurfaceFinish;
  selectedAccessories: AccessoryId[];
  customDimensions: boolean;
}
