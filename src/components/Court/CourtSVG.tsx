import React from 'react';
import type { CourtConfig } from '../../types/court';

interface Props {
  config: CourtConfig;
  width?: number;
  height?: number;
}

const PADDING = 40;

export const CourtSVG: React.FC<Props> = ({ config, width = 800, height = 560 }) => {
  const { type, dimensions, colors, selectedAccessories } = config;
  const cW = dimensions.width;   // court width  (feet)
  const cL = dimensions.length;  // court length (feet)

  const availW = width  - PADDING * 2;
  const availH = height - PADDING * 2;
  const scale  = Math.min(availW / cL, availH / cW);

  const svgCW = cL * scale; // SVG width  (px)
  const svgCH = cW * scale; // SVG height (px)

  const ox = (width  - svgCW) / 2; // canvas origin X
  const oy = (height - svgCH) / 2; // canvas origin Y

  // Convert court-feet → SVG pixel props
  const rp = (x: number, y: number, w: number, h: number) => ({
    x:      ox + x * scale,
    y:      oy + y * scale,
    width:  w  * scale,
    height: h  * scale,
  });

  const lp = (x1: number, y1: number, x2: number, y2: number) => ({
    x1: ox + x1 * scale,
    y1: oy + y1 * scale,
    x2: ox + x2 * scale,
    y2: oy + y2 * scale,
  });

  const px = (x: number) => ox + x * scale;
  const py = (y: number) => oy + y * scale;

  // Line props without fill so spread doesn't conflict with explicit fill attrs
  const ls = { stroke: colors.lines, strokeWidth: Math.max(1.5, scale * 0.08) };

  const hasAcc = (id: string) => selectedAccessories.includes(id as never);

  // ─── LIGHTING POLES ───────────────────────────────────────────────────────
  const renderLighting = () => {
    const poles: { px: number; py: number }[] = [];
    const off = 6 * scale;
    if (hasAcc('lighting-2-pole')) {
      poles.push(
        { px: ox - off,         py: oy + svgCH / 2 },
        { px: ox + svgCW + off, py: oy + svgCH / 2 },
      );
    }
    if (hasAcc('lighting-4-pole')) {
      poles.push(
        { px: ox - off,         py: oy + svgCH * 0.25 },
        { px: ox - off,         py: oy + svgCH * 0.75 },
        { px: ox + svgCW + off, py: oy + svgCH * 0.25 },
        { px: ox + svgCW + off, py: oy + svgCH * 0.75 },
      );
    }
    if (hasAcc('lighting-6-pole')) {
      poles.push(
        { px: ox - off,         py: oy + svgCH * 0.15 },
        { px: ox - off,         py: oy + svgCH * 0.5  },
        { px: ox - off,         py: oy + svgCH * 0.85 },
        { px: ox + svgCW + off, py: oy + svgCH * 0.15 },
        { px: ox + svgCW + off, py: oy + svgCH * 0.5  },
        { px: ox + svgCW + off, py: oy + svgCH * 0.85 },
      );
    }
    return poles.map((p, i) => (
      <g key={`pole-${i}`}>
        <rect x={p.px - 3} y={p.py - 20} width={6} height={20} fill="#78716C" rx={2} />
        <circle cx={p.px} cy={p.py - 22} r={6}  fill="#FCD34D" opacity={0.9} />
        <circle cx={p.px} cy={p.py - 22} r={10} fill="#FCD34D" opacity={0.15} />
      </g>
    ));
  };

  // ─── FENCING ──────────────────────────────────────────────────────────────
  const renderFencing = () => {
    if (!hasAcc('chain-link-fence') && !hasAcc('vinyl-fence')) return null;
    const gap = 5 * scale;
    return (
      <rect
        x={ox - gap} y={oy - gap}
        width={svgCW + gap * 2} height={svgCH + gap * 2}
        fill={hasAcc('windscreen') ? '#166534' : 'none'}
        fillOpacity={0.08}
        stroke={hasAcc('vinyl-fence') ? '#E5E7EB' : '#9CA3AF'}
        strokeWidth={2}
        strokeDasharray={hasAcc('chain-link-fence') ? '5,3' : undefined}
        rx={4}
      />
    );
  };

  // ─── BENCHES ──────────────────────────────────────────────────────────────
  const renderBenches = () => {
    if (!hasAcc('bench-2') && !hasAcc('bench-4')) return null;
    const count = hasAcc('bench-4') ? 4 : 2;
    const bW    = Math.max(30, svgCW * 0.12);
    const frac  = count === 2 ? [0.35, 0.65] : [0.15, 0.38, 0.62, 0.85];
    return frac.map((f, i) => (
      <rect
        key={`bench-${i}`}
        x={ox + svgCW * f - bW / 2}
        y={oy + svgCH + 12}
        width={bW} height={8}
        fill="#92400E" rx={2}
      />
    ));
  };

  // ─── BASKETBALL ───────────────────────────────────────────────────────────
  const renderBasketball = () => {
    const keyW   = 16;                // paint width (ft)
    const keyLen = 19;                // paint length from baseline (ft)
    const ftY    = cW / 2;            // free throw circle center Y (midcourt width)
    const basketX = 5.25;            // basket center from baseline (ft)
    const r3pt   = 23.75;             // 3-pt arc radius (ft)
    // x where 3-pt straight corner (22 ft from basket) meets the arc
    const corner22 = 22;             // straight 3-pt distance from basket center
    const arcBreakX = basketX + Math.sqrt(r3pt * r3pt - corner22 * corner22);

    return (
      <g>
        {/* Surface */}
        <rect {...rp(0, 0, cL, cW)} fill={colors.surface} />

        {/* Key / paint areas */}
        <rect {...rp(0, (cW - keyW) / 2, keyLen, keyW)} fill={colors.keyArea ?? colors.border} opacity={0.55} />
        <rect {...rp(cL - keyLen, (cW - keyW) / 2, keyLen, keyW)} fill={colors.keyArea ?? colors.border} opacity={0.55} />

        {/* Boundary */}
        <rect {...rp(0, 0, cL, cW)} fill="none" {...ls} />

        {/* Center line + circle */}
        <line {...lp(cL / 2, 0, cL / 2, cW)} {...ls} />
        <circle cx={px(cL / 2)} cy={py(ftY)} r={6 * scale} fill="none" {...ls} />

        {/* Key outlines */}
        <rect {...rp(0, (cW - keyW) / 2, keyLen, keyW)} fill="none" {...ls} />
        <rect {...rp(cL - keyLen, (cW - keyW) / 2, keyLen, keyW)} fill="none" {...ls} />

        {/* Free throw circles */}
        <circle cx={px(keyLen)} cy={py(ftY)} r={6 * scale} fill="none" {...ls} />
        <circle cx={px(cL - keyLen)} cy={py(ftY)} r={6 * scale} fill="none" {...ls} />

        {/* Three-point lines: straight corners + arc */}
        {/* Left side */}
        <line {...lp(0, (cW - corner22 * 2) / 2, arcBreakX, (cW - corner22 * 2) / 2)} {...ls} />
        <line {...lp(0, (cW + corner22 * 2) / 2, arcBreakX, (cW + corner22 * 2) / 2)} {...ls} />
        <path
          fill="none"
          {...ls}
          d={[
            `M ${px(arcBreakX)} ${py((cW - corner22 * 2) / 2)}`,
            `A ${r3pt * scale} ${r3pt * scale} 0 0 1`,
            `${px(arcBreakX)} ${py((cW + corner22 * 2) / 2)}`,
          ].join(' ')}
        />
        {/* Right side */}
        <line {...lp(cL, (cW - corner22 * 2) / 2, cL - arcBreakX, (cW - corner22 * 2) / 2)} {...ls} />
        <line {...lp(cL, (cW + corner22 * 2) / 2, cL - arcBreakX, (cW + corner22 * 2) / 2)} {...ls} />
        <path
          fill="none"
          {...ls}
          d={[
            `M ${px(cL - arcBreakX)} ${py((cW - corner22 * 2) / 2)}`,
            `A ${r3pt * scale} ${r3pt * scale} 0 0 0`,
            `${px(cL - arcBreakX)} ${py((cW + corner22 * 2) / 2)}`,
          ].join(' ')}
        />

        {/* Restricted area arcs */}
        <path
          fill="none" {...ls}
          d={`M ${px(basketX)} ${py(ftY - 4)} A ${4 * scale} ${4 * scale} 0 0 1 ${px(basketX)} ${py(ftY + 4)}`}
        />
        <path
          fill="none" {...ls}
          d={`M ${px(cL - basketX)} ${py(ftY - 4)} A ${4 * scale} ${4 * scale} 0 0 0 ${px(cL - basketX)} ${py(ftY + 4)}`}
        />

        {/* Border */}
        <rect {...rp(0, 0, cL, cW)} fill="none" stroke={colors.border} strokeWidth={scale * 0.4} />

        {/* Hoops */}
        {(hasAcc('basketball-hoop-single') || hasAcc('basketball-hoop-double')) && (
          <circle cx={px(basketX)} cy={py(ftY)} r={0.75 * scale} fill="#F97316" stroke="#EA580C" strokeWidth={1} />
        )}
        {hasAcc('basketball-hoop-double') && (
          <circle cx={px(cL - basketX)} cy={py(ftY)} r={0.75 * scale} fill="#F97316" stroke="#EA580C" strokeWidth={1} />
        )}
      </g>
    );
  };

  // ─── TENNIS ───────────────────────────────────────────────────────────────
  const renderTennis = () => {
    const singlesW  = 27;                        // singles court width (ft)
    const sOff      = (cW - singlesW) / 2;       // offset from outer edge to singles line
    const svcLen    = (cL - 42) / 2;             // baseline → service line (ft); 42 = 2×21
    const netX      = cL / 2;
    const halfW     = cW / 2;                    // = sOff + singlesW/2 when symmetric

    return (
      <g>
        {/* Surface */}
        <rect {...rp(0, 0, cL, cW)} fill={colors.surface} />

        {/* Service box tints (x=from baseline, y=from singles sideline) */}
        <rect {...rp(0,        sOff,            svcLen, singlesW / 2)} fill={colors.serviceBox ?? colors.surface} opacity={0.8} />
        <rect {...rp(0,        sOff + singlesW / 2, svcLen, singlesW / 2)} fill={colors.serviceBox ?? colors.surface} opacity={0.65} />
        <rect {...rp(cL - svcLen, sOff,            svcLen, singlesW / 2)} fill={colors.serviceBox ?? colors.surface} opacity={0.65} />
        <rect {...rp(cL - svcLen, sOff + singlesW / 2, svcLen, singlesW / 2)} fill={colors.serviceBox ?? colors.surface} opacity={0.8} />

        {/* Border */}
        <rect {...rp(0, 0, cL, cW)} fill="none" stroke={colors.border} strokeWidth={scale * 0.4} />

        {/* Doubles sidelines (outer boundary) */}
        <rect {...rp(0, 0, cL, cW)} fill="none" {...ls} />
        {/* Singles sidelines */}
        <line {...lp(0, sOff, cL, sOff)} {...ls} />
        <line {...lp(0, sOff + singlesW, cL, sOff + singlesW)} {...ls} />
        {/* Service lines */}
        <line {...lp(svcLen, sOff, svcLen, sOff + singlesW)} {...ls} />
        <line {...lp(cL - svcLen, sOff, cL - svcLen, sOff + singlesW)} {...ls} />
        {/* Center service line (parallel to sidelines, from service line to service line through center) */}
        <line {...lp(svcLen, halfW, cL - svcLen, halfW)} {...ls} />

        {/* Net */}
        <line
          {...lp(netX, 0, netX, cW)}
          stroke={colors.lines}
          strokeWidth={Math.max(2, scale * 0.15)}
          strokeDasharray={`${scale * 0.5} ${scale * 0.3}`}
        />
        {hasAcc('tennis-net') && (
          <>
            <circle cx={px(netX)} cy={oy}         r={4} fill="#6B7280" />
            <circle cx={px(netX)} cy={oy + svgCH} r={4} fill="#6B7280" />
          </>
        )}
      </g>
    );
  };

  // ─── PICKLEBALL ───────────────────────────────────────────────────────────
  const renderPickleball = () => {
    // Official play area: 20×44 ft; may have extra clearance around it
    const playW = Math.min(cW, 20);
    const playL = Math.min(cL, 44);
    const offX  = (cL - playL) / 2;
    const offY  = (cW - playW) / 2;
    const nvz   = 7;                   // no-volley zone depth (ft)
    const netX  = playL / 2;

    return (
      <g>
        {/* Surface */}
        <rect {...rp(0, 0, cL, cW)} fill={colors.surface} />

        {/* NVZ kitchen zones */}
        <rect {...rp(offX,              offY, nvz,    playW)} fill={colors.kitchen ?? '#60A5FA'} opacity={0.5} />
        <rect {...rp(offX + playL - nvz, offY, nvz,  playW)} fill={colors.kitchen ?? '#60A5FA'} opacity={0.5} />

        {/* Border */}
        <rect {...rp(0, 0, cL, cW)} fill="none" stroke={colors.border} strokeWidth={scale * 0.4} />

        {/* Playing area boundary */}
        <rect {...rp(offX, offY, playL, playW)} fill="none" {...ls} />
        {/* Center line (lengthwise, splits court into two halves) */}
        <line {...lp(offX, offY + playW / 2, offX + playL, offY + playW / 2)} {...ls} />
        {/* NVZ lines */}
        <line {...lp(offX + nvz,           offY, offX + nvz,           offY + playW)} {...ls} />
        <line {...lp(offX + playL - nvz,   offY, offX + playL - nvz,   offY + playW)} {...ls} />

        {/* Net */}
        <line
          {...lp(offX + netX, offY, offX + netX, offY + playW)}
          stroke={colors.lines}
          strokeWidth={Math.max(2, scale * 0.18)}
          strokeDasharray={`${scale * 0.4} ${scale * 0.25}`}
        />
        {hasAcc('pickleball-net') && (
          <>
            <circle cx={px(offX + netX)} cy={py(offY)}         r={4} fill="#6B7280" />
            <circle cx={px(offX + netX)} cy={py(offY + playW)} r={4} fill="#6B7280" />
          </>
        )}
      </g>
    );
  };

  // ─── MULTI-SPORT ──────────────────────────────────────────────────────────
  const renderMultiSport = () => {
    const keyW    = 16;
    const keyLen  = 19;
    const basketX = 5.25;
    const midY    = cW / 2;
    const pklW    = 20;
    const pklLen  = 44;
    const pklY    = (cW - pklW) / 2;
    const pklX1   = cL * 0.08;
    const pklX2   = cL * 0.52;
    const pklSty  = { stroke: '#FCD34D', strokeWidth: Math.max(1, scale * 0.06) };

    return (
      <g>
        {/* Surface */}
        <rect {...rp(0, 0, cL, cW)} fill={colors.surface} />

        {/* Paint areas */}
        <rect {...rp(0,        (cW - keyW) / 2, keyLen, keyW)} fill={colors.keyArea ?? '#1A3A6B'} opacity={0.5} />
        <rect {...rp(cL - keyLen, (cW - keyW) / 2, keyLen, keyW)} fill={colors.keyArea ?? '#1A3A6B'} opacity={0.5} />

        {/* Basketball lines */}
        <rect {...rp(0, 0, cL, cW)} fill="none" {...ls} />
        <line {...lp(cL / 2, 0, cL / 2, cW)} {...ls} />
        <circle cx={px(cL / 2)} cy={py(midY)} r={6 * scale} fill="none" {...ls} />
        <rect {...rp(0,        (cW - keyW) / 2, keyLen, keyW)} fill="none" {...ls} />
        <rect {...rp(cL - keyLen, (cW - keyW) / 2, keyLen, keyW)} fill="none" {...ls} />

        {/* Pickleball overlays (yellow) */}
        {[pklX1, pklX2].map((bx, i) => (
          <g key={`pkl-${i}`}>
            <rect {...rp(bx, pklY, pklLen, pklW)} fill="none" {...pklSty} />
            <line {...lp(bx, pklY + pklW / 2, bx + pklLen, pklY + pklW / 2)} {...pklSty} />
            <line {...lp(bx + 7, pklY, bx + 7, pklY + pklW)} {...pklSty} />
            <line {...lp(bx + pklLen - 7, pklY, bx + pklLen - 7, pklY + pklW)} {...pklSty} />
            <line
              {...lp(bx + pklLen / 2, pklY, bx + pklLen / 2, pklY + pklW)}
              stroke="#FCD34D"
              strokeWidth={Math.max(1.5, scale * 0.1)}
              strokeDasharray={`${scale * 0.4} ${scale * 0.25}`}
            />
          </g>
        ))}

        {/* Border */}
        <rect {...rp(0, 0, cL, cW)} fill="none" stroke={colors.border} strokeWidth={scale * 0.4} />

        {/* Hoops */}
        {(hasAcc('basketball-hoop-single') || hasAcc('basketball-hoop-double')) && (
          <circle cx={px(basketX)} cy={py(midY)} r={0.75 * scale} fill="#F97316" stroke="#EA580C" strokeWidth={1} />
        )}
        {hasAcc('basketball-hoop-double') && (
          <circle cx={px(cL - basketX)} cy={py(midY)} r={0.75 * scale} fill="#F97316" stroke="#EA580C" strokeWidth={1} />
        )}
      </g>
    );
  };

  // ─── DIMENSION LABELS ─────────────────────────────────────────────────────
  const renderLabels = () => {
    const labelColor = '#6B7280';
    const arrowColor = '#4B5563';
    return (
      <g fontFamily="Inter, sans-serif" fontSize={11}>
        {/* Length label (bottom) */}
        <text x={ox + svgCW / 2} y={oy + svgCH + 24} textAnchor="middle" fill={labelColor}>
          {cL} ft
        </text>
        {/* Width label (left, rotated) */}
        <text
          x={ox - 20} y={oy + svgCH / 2}
          textAnchor="middle" dominantBaseline="middle" fill={labelColor}
          transform={`rotate(-90, ${ox - 20}, ${oy + svgCH / 2})`}
        >
          {cW} ft
        </text>
        {/* Arrow along top */}
        <line x1={ox} y1={oy - 10} x2={ox + svgCW} y2={oy - 10} stroke={arrowColor} strokeWidth={1} />
        <polygon points={`${ox - 5},${oy - 10} ${ox + 5},${oy - 6} ${ox + 5},${oy - 14}`} fill={arrowColor} />
        <polygon points={`${ox + svgCW + 5},${oy - 10} ${ox + svgCW - 5},${oy - 6} ${ox + svgCW - 5},${oy - 14}`} fill={arrowColor} />
      </g>
    );
  };

  const renderCourt = () => {
    switch (type) {
      case 'basketball':  return renderBasketball();
      case 'tennis':      return renderTennis();
      case 'pickleball':  return renderPickleball();
      case 'multi-sport': return renderMultiSport();
    }
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%" height="100%"
      style={{ maxHeight: '100%', maxWidth: '100%' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="ground" patternUnits="userSpaceOnUse" width="20" height="20">
          <rect width="20" height="20" fill="#1C1917" />
          <rect width="10" height="10" fill="#1F1B19" />
          <rect x="10" y="10" width="10" height="10" fill="#1F1B19" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#ground)" rx={8} />
      {renderFencing()}
      {renderLighting()}
      {renderCourt()}
      {renderBenches()}
      {renderLabels()}
    </svg>
  );
};

export default CourtSVG;
