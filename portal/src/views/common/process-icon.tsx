import { useId } from 'react';

export interface ProcessIconProps {
  name: string;
  icon?: string | null;
  className?: string;
}

interface IconPalette {
  start: string;
  end: string;
}

type Pixel = readonly [x: number, y: number];

const ICON_PALETTES: IconPalette[] = [
  { start: '#4f3fc3', end: '#6f63d8' },
  { start: '#325db0', end: '#5480c7' },
  { start: '#2b7f92', end: '#52a2ad' },
  { start: '#3c8064', end: '#64a281' },
  { start: '#9b732f', end: '#bc964e' },
  { start: '#a65d35', end: '#c17c56' },
  { start: '#a6445a', end: '#c0677a' },
  { start: '#90467f', end: '#ab6699' }
];

export function ProcessIcon(props: ProcessIconProps) {
  const id = useId().replaceAll(':', '');

  if (props.icon !== undefined && props.icon !== null) {
    return (
      <span
        aria-hidden="true"
        className={`block shrink-0 overflow-hidden rounded-[22%] shadow-[0_4px_10px_-5px_rgba(15,23,42,0.5)] ring-1 ring-black/5 ${props.className ?? ''}`}
      >
        <img
          src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(props.icon)}`}
          alt=""
          className="block h-full w-full object-contain"
        />
      </span>
    );
  }

  const hash = hashName(props.name);
  const palette = ICON_PALETTES[hash % ICON_PALETTES.length];
  const pixels = generatePixels(hash);
  const gradientId = `process-icon-gradient-${id}`;

  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 overflow-hidden rounded-[22%] shadow-[0_4px_10px_-5px_rgba(15,23,42,0.5)] ring-1 ring-black/5 ${props.className ?? ''}`}
    >
      <svg viewBox="0 0 100 100" className="block h-full w-full" focusable="false">
        <defs>
          <linearGradient id={gradientId} x1="10" y1="6" x2="90" y2="94" gradientUnits="userSpaceOnUse">
            <stop stopColor={palette.start} />
            <stop offset="1" stopColor={palette.end} />
          </linearGradient>
        </defs>

        <rect width="100" height="100" fill={`url(#${gradientId})`} />
        <g fill="white" fillOpacity="0.88" shapeRendering="crispEdges">
          {pixels.map(([x, y]) => (
            <rect key={`${x}-${y}`} x={20 + x * 12} y={20 + y * 12} width="12" height="12" />
          ))}
        </g>
      </svg>
    </span>
  );
}

// Pattern rules adapted from Minidenticons by Laurent Payot (MIT)
// https://github.com/laurentpayot/minidenticons
function generatePixels(hash: number): Pixel[] {
  const pixels: Pixel[] = [];

  for (let i = 0; i < 15; i += 1) {
    if ((hash & (1 << i)) === 0) {
      continue;
    }
    const x = Math.floor(i / 5);
    const y = i % 5;
    pixels.push([x, y]);
    if (x < 2) {
      pixels.push([4 - x, y]);
    }
  }
  return pixels;
}

function hashName(name: string): number {
  let hash = 5;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash ^ name.charCodeAt(i)) * -5;
  }
  return hash >>> 2;
}
