import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'D&D 5e AI RPG',
  description: 'An immersive AI-driven browser RPG',
}

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














