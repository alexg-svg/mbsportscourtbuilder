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

  const svgCW = cL * scale; // SVG pixels wide
  const svgCH = cW * scale; // SVG pixels tall

  const ox = (width  - svgCW) / 2; // origin X
  const oy = (height - svgCH) / 2; // origin Y

  // Helpers – convert court-space feet to SVG props
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

  const cx_ = (x: number) => ox + x * scale;
  const cy_ = (y: number) => oy + y * scale;

  // Note: no `fill` here – elements that need fill="none" must set it explicitly
  // to avoid TS2783 "fill specified more than once" when spreading alongside fill props.
  const lineStyle = {
    stroke:      colors.lines,
    strokeWidth: Math.max(1.5, scale * 0.08),
  };

  const hasAcc = (id: string) => selectedAccessories.includes(id as never);

  // ─── LIGHTING POLES ───────────────────────────────────────────────────────
  const renderLighting = () => {
    const poles: { px: number; py: number }[] = [];
    const off = 6 * scale;
    if (hasAcc('lighting-2-pole')) {
      poles.push(
        { px: ox - off,        py: oy + svgCH / 2 },
        { px: ox + svgCW + off, py: oy + svgCH / 2 },
      );
    }
    if (hasAcc('lighting-4-pole')) {
      poles.push(
        { px: ox - off,        py: oy + svgCH * 0.25 },
        { px: ox - off,        py: oy + svgCH * 0.75 },
        { px: ox + svgCW + off, py: oy + svgCH * 0.25 },
        { px: ox + svgCW + off, py: oy + svgCH * 0.75 },
      );
    }
    if (hasAcc('lighting-6-pole')) {
      poles.push(
        { px: ox - off,        py: oy + svgCH * 0.15 },
        { px: ox - off,        py: oy + svgCH * 0.5  },
        { px: ox - off,        py: oy + svgCH * 0.85 },
        { px: ox + svgCW + off, py: oy + svgCH * 0.15 },
        { px: ox + svgCW + off, py: oy + svgCH * 0.5  },
        { px: ox + svgCW + off, py: oy + svgCH * 0.85 },
      );
    }
    return poles.map((p, i) => (
      <g key={`pole-${i}`}>
        <rect x={p.px - 3} y={p.py - 20} width={6} height={20} fill="#78716C" rx={2} />
        <circle cx={p.px} cy={p.py - 22} r={6} fill="#FCD34D" opacity={0.9} />
        <circle cx={p.px} cy={p.py - 22} r={10} fill="#FCD34D" opacity={0.15} />
      </g>
    ));
  };

  // ─── FENCING ──────────────────────────────────────────────────────────────
  const renderFencing = () => {
    if (!hasAcc('chain-link-fence') && !hasAcc('vinyl-fence')) return null;
    const gap = 5 * scale;
    const fenceColor = hasAcc('vinyl-fence') ? '#E5E7EB' : '#9CA3AF';
    return (
      <rect
        x={ox - gap} y={oy - gap}
        width={svgCW + gap * 2} height={svgCH + gap * 2}
        fill={hasAcc('windscreen') ? '#166534' : 'none'}
        fillOpacity={0.08}
        stroke={fenceColor} strokeWidth={2}
        strokeDasharray={hasAcc('chain-link-fence') ? '5,3' : undefined}
        rx={4}
      />
    );
  };

  // ─── BENCHES ──────────────────────────────────────────────────────────────
  const renderBenches = () => {
    if (!hasAcc('bench-2') && !hasAcc('bench-4')) return null;
    const count  = hasAcc('bench-4') ? 4 : 2;
    const bW     = Math.max(30, svgCW * 0.12);
    const bH     = 8;
    const frac   = count === 2 ? [0.35, 0.65] : [0.15, 0.38, 0.62, 0.85];
    return frac.map((f, i) => (
      <rect key={`bench-${i}`}
        x={ox + svgCW * f - bW / 2}
        y={oy + svgCH + 12}
        width={bW} height={bH}
        fill="#92400E" rx={2}
      />
    ));
  };

  // ─── BASKETBALL ───────────────────────────────────────────────────────────
  const renderBasketball = () => {
    const keyW   = 16;
    const keyLen = 19;
    const ftX    = 15 + keyLen;

    return (
      <g>
        <rect {...rp(0, 0, cL, cW)} fill={colors.surface} />
        <rect {...rp(0, (cW - keyW) / 2, keyLen, keyW)} fill={colors.keyArea ?? colors.border} opacity={0.6} />
        <rect {...rp(cL - keyLen, (cW - keyW) / 2, keyLen, keyW)} fill={colors.keyArea ?? colors.border} opacity={0.6} />

        <rect {...rp(0, 0, cL, cW)} fill="none" {...lineStyle} />
        <line {...lp(cL / 2, 0, cL / 2, cW)} {...lineStyle} />
        <ellipse cx={cx_(cL / 2)} cy={cy_(cW / 2)} rx={6 * scale} ry={6 * scale} {...lineStyle} />

        <rect {...rp(0, (cW - keyW) / 2, keyLen, keyW)} fill="none" {...lineStyle} />
        <rect {...rp(cL - keyLen, (cW - keyW) / 2, keyLen, keyW)} fill="none" {...lineStyle} />

        <ellipse cx={cx_(ftX)} cy={cy_(cW / 2)} rx={6 * scale} ry={6 * scale} {...lineStyle} />
        <ellipse cx={cx_(cL - ftX)} cy={cy_(cW / 2)} rx={6 * scale} ry={6 * scale} {...lineStyle} />

        {/* 3-pt arcs (straight corner segments already drawn by boundary) */}
        <path
          d={`M ${cx_(0)} ${cy_((cW - 22) / 2)} A ${23.75 * scale} ${23.75 * scale} 0 0 1 ${cx_(0)} ${cy_((cW + 22) / 2)}`}
          {...lineStyle}
        />
        <path
          d={`M ${cx_(cL)} ${cy_((cW - 22) / 2)} A ${23.75 * scale} ${23.75 * scale} 0 0 0 ${cx_(cL)} ${cy_((cW + 22) / 2)}`}
          {...lineStyle}
        />

        {/* Restricted area */}
        <path
          d={`M ${cx_(4)} ${cy_((cW - 8) / 2)} A ${4 * scale} ${4 * scale} 0 0 1 ${cx_(4)} ${cy_((cW + 8) / 2)}`}
          {...lineStyle}
        />
        <path
          d={`M ${cx_(cL - 4)} ${cy_((cW - 8) / 2)} A ${4 * scale} ${4 * scale} 0 0 0 ${cx_(cL - 4)} ${cy_((cW + 8) / 2)}`}
          {...lineStyle}
        />

        {/* Border */}
        <rect {...rp(0, 0, cL, cW)} fill="none" stroke={colors.border} strokeWidth={scale * 0.4} />

        {/* Hoops */}
        {(hasAcc('basketball-hoop-single') || hasAcc('basketball-hoop-double')) && (
          <circle cx={cx_(5.25)} cy={cy_(cW / 2)} r={0.75 * scale} fill="#F97316" stroke="#EA580C" strokeWidth={1} />
        )}
        {hasAcc('basketball-hoop-double') && (
          <circle cx={cx_(cL - 5.25)} cy={cy_(cW / 2)} r={0.75 * scale} fill="#F97316" stroke="#EA580C" strokeWidth={1} />
        )}
      </g>
    );
  };

  // ─── TENNIS ───────────────────────────────────────────────────────────────
  const renderTennis = () => {
    const singlesW   = 27;
    const singleOff  = (cW - singlesW) / 2;
    const svcLen     = (cL - 42) / 2; // service box length from baseline
    const netX       = cL / 2;

    return (
      <g>
        <rect {...rp(0, 0, cL, cW)} fill={colors.surface} />
        {/* Service box tints */}
        <rect {...rp(singleOff, 0, svcLen, singlesW / 2)} fill={colors.serviceBox ?? colors.surface} opacity={0.85} />
        <rect {...rp(singleOff, singlesW / 2, svcLen, singlesW / 2)} fill={colors.serviceBox ?? colors.surface} opacity={0.72} />
        <rect {...rp(cL - singleOff - svcLen, 0, svcLen, singlesW / 2)} fill={colors.serviceBox ?? colors.surface} opacity={0.72} />
        <rect {...rp(cL - singleOff - svcLen, singlesW / 2, svcLen, singlesW / 2)} fill={colors.serviceBox ?? colors.surface} opacity={0.85} />

        {/* Border */}
        <rect {...rp(0, 0, cL, cW)} fill="none" stroke={colors.border} strokeWidth={scale * 0.4} />

        {/* Lines */}
        <rect {...rp(0, 0, cL, cW)} fill="none" {...lineStyle} />
        <line {...lp(0, singleOff, cL, singleOff)} {...lineStyle} />
        <line {...lp(0, singleOff + singlesW, cL, singleOff + singlesW)} {...lineStyle} />
        <line {...lp(svcLen, singleOff, svcLen, singleOff + singlesW)} {...lineStyle} />
        <line {...lp(cL - svcLen, singleOff, cL - svcLen, singleOff + singlesW)} {...lineStyle} />
        <line {...lp(svcLen, cW / 2, cL - svcLen, cW / 2)} {...lineStyle} />

        {/* Net */}
        <line
          {...lp(netX, 0, netX, cW)}
          stroke={colors.lines}
          strokeWidth={Math.max(2, scale * 0.15)}
          strokeDasharray={`${scale * 0.5} ${scale * 0.3}`}
        />
        {hasAcc('tennis-net') && (
          <>
            <circle cx={cx_(netX)} cy={oy}         r={4} fill="#6B7280" />
            <circle cx={cx_(netX)} cy={oy + svgCH} r={4} fill="#6B7280" />
          </>
        )}
      </g>
    );
  };

  // ─── PICKLEBALL ───────────────────────────────────────────────────────────
  const renderPickleball = () => {
    const playW  = Math.min(cW, 20);
    const playL  = Math.min(cL, 44);
    const offX   = (cL - playL) / 2;
    const offY   = (cW - playW) / 2;
    const nvz    = 7;
    const netX   = playL / 2;

    return (
      <g>
        <rect {...rp(0, 0, cL, cW)} fill={colors.surface} />
        {/* NVZ kitchen zones */}
        <rect {...rp(offX, offY, nvz, playW)} fill={colors.kitchen ?? '#60A5FA'} opacity={0.55} />
        <rect {...rp(offX + playL - nvz, offY, nvz, playW)} fill={colors.kitchen ?? '#60A5FA'} opacity={0.55} />

        <rect {...rp(0, 0, cL, cW)} fill="none" stroke={colors.border} strokeWidth={scale * 0.4} />
        <rect {...rp(offX, offY, playL, playW)} fill="none" {...lineStyle} />
        <line {...lp(offX, offY + playW / 2, offX + playL, offY + playW / 2)} {...lineStyle} />
        <line {...lp(offX + nvz, offY, offX + nvz, offY + playW)} {...lineStyle} />
        <line {...lp(offX + playL - nvz, offY, offX + playL - nvz, offY + playW)} {...lineStyle} />

        {/* Net */}
        <line
          {...lp(offX + netX, offY, offX + netX, offY + playW)}
          stroke={colors.lines}
          strokeWidth={Math.max(2, scale * 0.18)}
          strokeDasharray={`${scale * 0.4} ${scale * 0.25}`}
        />
        {hasAcc('pickleball-net') && (
          <>
            <circle cx={cx_(offX + netX)} cy={cy_(offY)}         r={4} fill="#6B7280" />
            <circle cx={cx_(offX + netX)} cy={cy_(offY + playW)} r={4} fill="#6B7280" />
          </>
        )}
      </g>
    );
  };

  // ─── MULTI-SPORT ──────────────────────────────────────────────────────────
  const renderMultiSport = () => {
    const keyW   = 16;
    const keyLen = 19;
    const pklW   = 20;
    const pklLen = 44;
    const pklY   = (cW - pklW) / 2;
    const pklX1  = cL * 0.12;
    const pklX2  = cL * 0.55;
    const pklLine = {
      stroke: '#FCD34D',
      strokeWidth: Math.max(1, scale * 0.06),
    };

    return (
      <g>
        <rect {...rp(0, 0, cL, cW)} fill={colors.surface} />
        <rect {...rp(0, (cW - keyW) / 2, keyLen, keyW)} fill={colors.keyArea ?? '#1A3A6B'} opacity={0.5} />
        <rect {...rp(cL - keyLen, (cW - keyW) / 2, keyLen, keyW)} fill={colors.keyArea ?? '#1A3A6B'} opacity={0.5} />

        {/* Basketball lines */}
        <rect {...rp(0, 0, cL, cW)} fill="none" {...lineStyle} />
        <line {...lp(cL / 2, 0, cL / 2, cW)} {...lineStyle} />
        <ellipse cx={cx_(cL / 2)} cy={cy_(cW / 2)} rx={6 * scale} ry={6 * scale} {...lineStyle} />
        <rect {...rp(0, (cW - keyW) / 2, keyLen, keyW)} fill="none" {...lineStyle} />
        <rect {...rp(cL - keyLen, (cW - keyW) / 2, keyLen, keyW)} fill="none" {...lineStyle} />

        {/* Pickleball courts overlay (yellow) */}
        {[pklX1, pklX2].map((px, i) => (
          <g key={`pkl-${i}`}>
            <rect {...rp(px, pklY, pklLen, pklW)} fill="none" {...pklLine} />
            <line {...lp(px, pklY + pklW / 2, px + pklLen, pklY + pklW / 2)} {...pklLine} />
            <line {...lp(px + 7, pklY, px + 7, pklY + pklW)} {...pklLine} />
            <line {...lp(px + pklLen - 7, pklY, px + pklLen - 7, pklY + pklW)} {...pklLine} />
            <line
              {...lp(px + pklLen / 2, pklY, px + pklLen / 2, pklY + pklW)}
              stroke="#FCD34D"
              strokeWidth={Math.max(1.5, scale * 0.1)}
              strokeDasharray={`${scale * 0.4} ${scale * 0.25}`}
            />
          </g>
        ))}

        <rect {...rp(0, 0, cL, cW)} fill="none" stroke={colors.border} strokeWidth={scale * 0.4} />

        {(hasAcc('basketball-hoop-single') || hasAcc('basketball-hoop-double')) && (
          <circle cx={cx_(5.25)} cy={cy_(cW / 2)} r={0.75 * scale} fill="#F97316" stroke="#EA580C" strokeWidth={1} />
        )}
        {hasAcc('basketball-hoop-double') && (
          <circle cx={cx_(cL - 5.25)} cy={cy_(cW / 2)} r={0.75 * scale} fill="#F97316" stroke="#EA580C" strokeWidth={1} />
        )}
      </g>
    );
  };

  // ─── DIMENSION LABELS ─────────────────────────────────────────────────────
  const renderLabels = () => (
    <g fill="#6B7280" fontSize={11} fontFamily="Inter, sans-serif">
      <text
        x={ox - 18} y={oy + svgCH / 2}
        textAnchor="middle" dominantBaseline="middle"
        transform={`rotate(-90, ${ox - 18}, ${oy + svgCH / 2})`}
      >
        {cW} ft
      </text>
      <text x={ox + svgCW / 2} y={oy + svgCH + 22} textAnchor="middle">
        {cL} ft
      </text>
      {/* Width arrow */}
      <line x1={ox} y1={oy - 8} x2={ox + svgCW} y2={oy - 8} stroke="#4B5563" strokeWidth={1} />
      <polygon
        points={`${ox},${oy - 12} ${ox + 6},${oy - 4} ${ox - 6},${oy - 4}`}
        fill="#4B5563"
      />
      <polygon
        points={`${ox + svgCW},${oy - 12} ${ox + svgCW + 6},${oy - 4} ${ox + svgCW - 6},${oy - 4}`}
        fill="#4B5563"
      />
    </g>
  );

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
