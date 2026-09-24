import { CSSProperties } from "react"

// CSS viewport widths (logical px), Plus-size models skipped per team call --
// they're the same width as their non-Pro sibling in every generation here,
// so they'd add entries without adding a new breakpoint.

export const IPHONE17_SCREEN = {
  "--iphone-17-width": "393px",
} as CSSProperties

export const IPHONE17_PRO_SCREEN = {
  "--iphone-17-pro-width": "402px",
} as CSSProperties

export const IPHONE17_MAX_SCREEN = {
  "--iphone-17-pro-max-width": "440px",
} as CSSProperties

export const IPHONE16_SCREEN = {
  "--iphone-16-width": "393px",
} as CSSProperties

export const IPHONE16_PRO_SCREEN = {
  "--iphone-16-pro-width": "402px",
} as CSSProperties

export const IPHONE16_MAX_SCREEN = {
  "--iphone-16-pro-max-width": "440px",
} as CSSProperties

export const IPHONE15_SCREEN = {
  "--iphone-15-width": "393px",
} as CSSProperties

export const IPHONE15_PRO_SCREEN = {
  "--iphone-15-pro-width": "393px",
} as CSSProperties

export const IPHONE15_MAX_SCREEN = {
  "--iphone-15-pro-max-width": "430px",
} as CSSProperties

export const IPHONE13_MINI_SCREEN = {
  "--iphone-13-mini-width": "360px",
} as CSSProperties

export const IPHONE13_SCREEN = {
  "--iphone-13-width": "390px",
} as CSSProperties

export const IPHONE13_PRO_SCREEN = {
  "--iphone-13-pro-width": "390px",
} as CSSProperties

export const IPHONE13_MAX_SCREEN = {
  "--iphone-13-pro-max-width": "428px",
} as CSSProperties

export const IPHONE_SE_3RD_GEN_SCREEN = {
  "--iphone-se-3rd-gen-width": "375px",
} as CSSProperties

export const IPHONE_SE_2ND_GEN_SCREEN = {
  "--iphone-se-2nd-gen-width": "375px",
} as CSSProperties

// Android: no equivalent to Apple's fixed device lineup, so per-device
// widths below are just reference points -- BREAKPOINT_* further down are
// what layouts should actually target.

export const GALAXY_S26_SCREEN = {
  "--galaxy-s26-width": "360px",
} as CSSProperties

export const GALAXY_S26_ULTRA_SCREEN = {
  "--galaxy-s26-ultra-width": "412px",
} as CSSProperties

export const PIXEL_10_SCREEN = {
  "--pixel-10-width": "412px",
} as CSSProperties

export const PIXEL_10_PRO_SCREEN = {
  "--pixel-10-pro-width": "410px",
} as CSSProperties

export const XIAOMI_15_PRO_SCREEN = {
  "--xiaomi-15-pro-width": "412px",
} as CSSProperties

// Golden mobile-first breakpoints (Android web design convention). Plain
// numbers, not CSS custom properties -- media query conditions can't
// reference var(), so these are meant for @media rules written directly
// with these values, or for JS-side width checks.
export const BREAKPOINT_NARROW_ANDROID = 320 // old/folded-cover-screen floor
export const BREAKPOINT_BASELINE_ANDROID = 360 // mainstream Android floor
export const BREAKPOINT_FLAGSHIP_ANDROID = 412 // Pixel/Galaxy Ultra sweet spot
export const BREAKPOINT_MOBILE_MAX = 480 // cutoff before tablet sizes
