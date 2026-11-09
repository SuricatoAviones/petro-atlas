import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { messages } from '@/messages/es';

export const metadata: Metadata = {
  title: messages.app.name,
  description: messages.app.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
