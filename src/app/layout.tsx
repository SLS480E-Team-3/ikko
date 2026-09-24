import type { CSSProperties } from 'react'
import type { Viewport } from 'next'
import {
  IPHONE17_SCREEN,
  IPHONE17_PRO_SCREEN,
  IPHONE17_MAX_SCREEN,
  IPHONE16_SCREEN,
  IPHONE16_PRO_SCREEN,
  IPHONE16_MAX_SCREEN,
  IPHONE15_SCREEN,
  IPHONE15_PRO_SCREEN,
  IPHONE15_MAX_SCREEN,
  IPHONE13_MINI_SCREEN,
  IPHONE13_SCREEN,
  IPHONE13_PRO_SCREEN,
  IPHONE13_MAX_SCREEN,
  IPHONE_SE_3RD_GEN_SCREEN,
  IPHONE_SE_2ND_GEN_SCREEN,
} from '@/utils/mobileScreenSIze'
import './globals.css'

// Single source of truth for every device's CSS custom properties lives in
// mobileScreenSIze.ts; merged here and applied on <html> so every
// var(--iphone-...) reference in globals.css/*.module.css resolves via
// normal CSS inheritance from :root, same as if they'd been hardcoded there.
const screenSizeVars: CSSProperties = {
  ...IPHONE17_SCREEN,
  ...IPHONE17_PRO_SCREEN,
  ...IPHONE17_MAX_SCREEN,
  ...IPHONE16_SCREEN,
  ...IPHONE16_PRO_SCREEN,
  ...IPHONE16_MAX_SCREEN,
  ...IPHONE15_SCREEN,
  ...IPHONE15_PRO_SCREEN,
  ...IPHONE15_MAX_SCREEN,
  ...IPHONE13_MINI_SCREEN,
  ...IPHONE13_SCREEN,
  ...IPHONE13_PRO_SCREEN,
  ...IPHONE13_MAX_SCREEN,
  ...IPHONE_SE_3RD_GEN_SCREEN,
  ...IPHONE_SE_2ND_GEN_SCREEN,
}
// fixed: globals.css was never imported anywhere, so it was never bundled --
// in the App Router a global stylesheet only applies when a layout/page
// imports it; sitting in src/app/ does nothing on its own. Importing it in the
// ROOT layout is what makes it apply to every route.

// Without this, mobile Safari renders the page at a 980px desktop viewport
// and scales it down -- the iPhone 17 sizing in globals.css/form.module.css
// would never take effect. viewportFit: 'cover' lets content extend under
// the Dynamic Island/home indicator so env(safe-area-inset-*) has real
// values to push content back in from.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={screenSizeVars}>
      <body>{children}</body>
    </html>
  )
}