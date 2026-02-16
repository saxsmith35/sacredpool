import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SacredPool - Sacrament Blessing Scheduler',
  description: 'Automated scheduling for sacrament blessings',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
