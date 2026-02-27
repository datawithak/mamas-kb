import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UWS Mamas Knowledge Base',
  description: 'Community wisdom from UWS moms — doctors, activities, dining, tips & more',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
