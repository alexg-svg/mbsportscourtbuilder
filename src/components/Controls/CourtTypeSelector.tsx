import React from 'react';
import type { CourtType, PropertyType } from '../../types/court';

interface Props {
  courtType: CourtType;
  propertyType: PropertyType;
  onCourtTypeChange: (type: CourtType) => void;
  onPropertyTypeChange: (type: PropertyType) => void;
}

const COURT_TYPES: { id: CourtType; label: string; icon: string; desc: string }[] = [
  { id: 'basketball',  label: 'Basketball',  icon: '🏀', desc: 'Full court or half court' },
  { id: 'tennis',      label: 'Tennis',      icon: '🎾', desc: 'Singles or doubles' },
  { id: 'pickleball',  label: 'Pickleball',  icon: '🏓', desc: 'Standard or with clearance' },
  { id: 'multi-sport', label: 'Multi-Sport', icon: '🏆', desc: 'Combined court overlay' },
];

export const CourtTypeSelector: React.FC<Props> = ({
  courtType, propertyType, onCourtTypeChange, onPropertyTypeChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Property type */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Property Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['residential', 'commercial'] as PropertyType[]).map((pt) => (
            <button
              key={pt}
              onClick={() => onPropertyTypeChange(pt)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border ${
                propertyType === pt
                  ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-900/30'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'
              }`}
            >
              {pt === 'residential' ? '🏠 Residential' : '🏢 Commercial'}
            </button>
          ))}
        </div>
      </div>

      {/* Court type */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Court Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {COURT_TYPES.map((ct) => (
            <button
              key={ct.id}
              onClick={() => onCourtTypeChange(ct.id)}
              className={`p-3 rounded-lg text-left transition-all border ${
                courtType === ct.id
                  ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-900/30'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'
              }`}
            >
              <div className="text-xl mb-1">{ct.icon}</div>
              <div className="text-sm font-semibold leading-tight">{ct.label}</div>
              <div className={`text-xs mt-0.5 leading-tight ${courtType === ct.id ? 'text-pink-200' : 'text-gray-500'}`}>
                {ct.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
