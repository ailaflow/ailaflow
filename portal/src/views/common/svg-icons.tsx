import type { SVGProps } from 'react';

interface SvgIconDefinition {
  fill?: string;
  paths: readonly SVGProps<SVGPathElement>[];
  viewBox: string;
}

const SVG_ICON_DEFINITIONS = {
  eyeOpen: {
    viewBox: '0 0 20 20',
    fill: 'none',
    paths: [
      {
        d: 'M3.65 9.39C4.42 8.17 6.63 5.18 10 5.18C13.37 5.18 15.58 8.17 16.35 9.39C16.58 9.75 16.58 10.25 16.35 10.61C15.58 11.83 13.37 14.82 10 14.82C6.63 14.82 4.42 11.83 3.65 10.61C3.42 10.25 3.42 9.75 3.65 9.39Z',
        stroke: 'currentColor',
        strokeWidth: '1.7',
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      },
      {
        d: 'M10 12.15C11.19 12.15 12.15 11.19 12.15 10C12.15 8.81 11.19 7.85 10 7.85C8.81 7.85 7.85 8.81 7.85 10C7.85 11.19 8.81 12.15 10 12.15Z',
        stroke: 'currentColor',
        strokeWidth: '1.7'
      }
    ]
  },
  eyeClosed: {
    viewBox: '0 0 20 20',
    fill: 'none',
    paths: [
      {
        d: 'M3.5 3.5L16.5 16.5',
        stroke: 'currentColor',
        strokeWidth: '1.7',
        strokeLinecap: 'round'
      },
      {
        d: 'M8.15 5.44C8.72 5.28 9.34 5.18 10 5.18C13.37 5.18 15.58 8.17 16.35 9.39C16.58 9.75 16.58 10.25 16.35 10.61C16.1 11.01 15.69 11.57 15.12 12.16M11.9 14.42C11.31 14.67 10.68 14.82 10 14.82C6.63 14.82 4.42 11.83 3.65 10.61C3.42 10.25 3.42 9.75 3.65 9.39C3.95 8.91 4.51 8.15 5.28 7.44',
        stroke: 'currentColor',
        strokeWidth: '1.7',
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      },
      {
        d: 'M8.65 8.65C8.3 9 8.1 9.48 8.1 10C8.1 11.05 8.95 11.9 10 11.9C10.52 11.9 11 11.7 11.35 11.35',
        stroke: 'currentColor',
        strokeWidth: '1.7',
        strokeLinecap: 'round'
      }
    ]
  },
  x: {
    viewBox: '0 0 20 20',
    fill: 'none',
    paths: [
      {
        d: 'M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5',
        stroke: 'currentColor',
        strokeWidth: '1.8',
        strokeLinecap: 'round'
      }
    ]
  },
  pencil: {
    viewBox: '0 0 20 20',
    fill: 'none',
    paths: [
      {
        d: 'M12.85 4.15L15.85 7.15M4.5 15.5L7.15 14.97C7.44 14.91 7.71 14.77 7.92 14.56L15.15 7.33C15.98 6.5 15.98 5.16 15.15 4.34C14.33 3.51 12.99 3.51 12.16 4.34L4.94 11.56C4.73 11.77 4.59 12.04 4.53 12.33L4 15C3.94 15.31 4.19 15.56 4.5 15.5Z',
        stroke: 'currentColor',
        strokeWidth: '1.7',
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      }
    ]
  },
  chevronUp: {
    viewBox: '0 0 20 20',
    fill: 'none',
    paths: [
      {
        d: 'M5 12.5L10 7.5L15 12.5',
        stroke: 'currentColor',
        strokeWidth: '1.8',
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      }
    ]
  },
  chevronDown: {
    viewBox: '0 0 20 20',
    fill: 'none',
    paths: [
      {
        d: 'M5 7.5L10 12.5L15 7.5',
        stroke: 'currentColor',
        strokeWidth: '1.8',
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      }
    ]
  }
} as const satisfies Record<string, SvgIconDefinition>;

export type SvgIconName = keyof typeof SVG_ICON_DEFINITIONS;

export interface SvgIconProps extends Omit<SVGProps<SVGSVGElement>, 'children' | 'viewBox'> {
  name: SvgIconName;
}

export function SvgIcon({ name, ...props }: SvgIconProps) {
  const icon = SVG_ICON_DEFINITIONS[name];
  return (
    <svg aria-hidden="true" viewBox={icon.viewBox} fill={icon.fill ?? 'none'} xmlns="http://www.w3.org/2000/svg" {...props}>
      {icon.paths.map((path, index) => (
        <path key={index} {...path} />
      ))}
    </svg>
  );
}
