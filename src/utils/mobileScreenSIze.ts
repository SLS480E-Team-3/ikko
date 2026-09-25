// DEV
import { CSSProperties } from "react"

// CSS viewport sizes (logical px, portrait) -- what window.innerWidth /
// innerHeight report, not the hardware pixel resolution. Plus models skipped
// per team call.

export const IPHONE17_SCREEN = {
  "--iphone-17-width": "402px",
  "--iphone-17-height": "874px",
} as CSSProperties

export const IPHONE17_PRO_SCREEN = {
  "--iphone-17-pro-width": "402px",
  "--iphone-17-pro-height": "874px",
} as CSSProperties

export const IPHONE17_MAX_SCREEN = {
  "--iphone-17-pro-max-width": "440px",
  "--iphone-17-pro-max-height": "956px",
} as CSSProperties

export const IPHONE16_SCREEN = {
  "--iphone-16-width": "393px",
  "--iphone-16-height": "852px",
} as CSSProperties

export const IPHONE16_PRO_SCREEN = {
  "--iphone-16-pro-width": "402px",
  "--iphone-16-pro-height": "874px",
} as CSSProperties

export const IPHONE16_MAX_SCREEN = {
  "--iphone-16-pro-max-width": "440px",
  "--iphone-16-pro-max-height": "956px",
} as CSSProperties

export const IPHONE15_SCREEN = {
  "--iphone-15-width": "393px",
  "--iphone-15-height": "852px",
} as CSSProperties

export const IPHONE15_PRO_SCREEN = {
  "--iphone-15-pro-width": "393px",
  "--iphone-15-pro-height": "852px",
} as CSSProperties

export const IPHONE15_MAX_SCREEN = {
  "--iphone-15-pro-max-width": "430px",
  "--iphone-15-pro-max-height": "932px",
} as CSSProperties

// Not 360x780 (that's the 1080x2340 panel / 3) -- iOS lays the mini out at
// 375x812 and downsamples to the panel, so 375x812 is what CSS sees.
export const IPHONE13_MINI_SCREEN = {
  "--iphone-13-mini-width": "375px",
  "--iphone-13-mini-height": "812px",
} as CSSProperties

export const IPHONE13_SCREEN = {
  "--iphone-13-width": "390px",
  "--iphone-13-height": "844px",
} as CSSProperties

export const IPHONE13_PRO_SCREEN = {
  "--iphone-13-pro-width": "390px",
  "--iphone-13-pro-height": "844px",
} as CSSProperties

export const IPHONE13_MAX_SCREEN = {
  "--iphone-13-pro-max-width": "428px",
  "--iphone-13-pro-max-height": "926px",
} as CSSProperties

export const IPHONE_SE_3RD_GEN_SCREEN = {
  "--iphone-se-3rd-gen-width": "375px",
  "--iphone-se-3rd-gen-height": "667px",
} as CSSProperties

export const IPHONE_SE_2ND_GEN_SCREEN = {
  "--iphone-se-2nd-gen-width": "375px",
  "--iphone-se-2nd-gen-height": "667px",
} as CSSProperties

// Android: no equivalent to Apple's fixed device lineup, so per-device
// sizes below are just reference points -- BREAKPOINT_* further down are
// what layouts should actually target.

export const GALAXY_S26_SCREEN = {
  "--galaxy-s26-width": "360px",
  "--galaxy-s26-height": "780px",
} as CSSProperties

export const GALAXY_S26_ULTRA_SCREEN = {
  "--galaxy-s26-ultra-width": "412px",
  "--galaxy-s26-ultra-height": "891px",
} as CSSProperties

export const PIXEL_10_SCREEN = {
  "--pixel-10-width": "412px",
  "--pixel-10-height": "923px",
} as CSSProperties

export const PIXEL_10_PRO_SCREEN = {
  "--pixel-10-pro-width": "410px",
  "--pixel-10-pro-height": "914px",
} as CSSProperties

export const XIAOMI_15_PRO_SCREEN = {
  "--xiaomi-15-pro-width": "412px",
  "--xiaomi-15-pro-height": "914px",
} as CSSProperties

// Golden mobile-first breakpoints (Android web design convention). Plain
// numbers, not CSS custom properties -- media query conditions can't
// reference var(), so these are meant for @media rules written directly
// with these values, or for JS-side width checks.
export const BREAKPOINT_NARROW_ANDROID = 320 // old/folded-cover-screen floor
export const BREAKPOINT_BASELINE_ANDROID = 360 // mainstream Android floor
export const BREAKPOINT_FLAGSHIP_ANDROID = 412 // Pixel/Galaxy Ultra sweet spot
export const BREAKPOINT_MOBILE_MAX = 480 // cutoff before tablet sizes
