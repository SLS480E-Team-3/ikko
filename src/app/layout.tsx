import './globals.css'
// fixed: globals.css was never imported anywhere, so it was never bundled --
// in the App Router a global stylesheet only applies when a layout/page
// imports it; sitting in src/app/ does nothing on its own. Importing it in the
// ROOT layout is what makes it apply to every route.

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}