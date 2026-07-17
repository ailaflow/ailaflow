import type { SVGProps } from 'react';

const SVG_ICON_PATHS = {
  send: 'M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z',
  stop: 'm256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z',
  dots: 'M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z',
  detailsClosed: 'M480-360 280-560h400L480-360Z',
  detailsOpen: 'm280-400 200-200 200 200H280Z'
} as const;

export type SvgIconName = keyof typeof SVG_ICON_PATHS;

export interface SvgIconProps extends Omit<SVGProps<SVGSVGElement>, 'viewBox'> {
  name: SvgIconName;
}

export function SvgIcon({ name, ...props }: SvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={SVG_ICON_PATHS[name]} />
    </svg>
  );
}
