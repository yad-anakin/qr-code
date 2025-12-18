import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'QR Code Generator',
  description: 'Generate and download QR codes from any text or URL.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
