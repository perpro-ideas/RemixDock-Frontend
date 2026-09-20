import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { AudioPlayerProvider } from '@/context/audio-player-context';
import { AudioPlayerDock } from '@/components/player/audio-player-dock';

export const metadata: Metadata = {
  title: 'RemixDock — Plataforma Profesional para DJs y Remixers',
  description:
    'Ecosistema integral de producción, gestión de remixes y colaboración musical para DJs y creadores electrónicos.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="overflow-x-hidden">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden">
        <AuthProvider>
          <AudioPlayerProvider>
            {children}
            <AudioPlayerDock />
          </AudioPlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
