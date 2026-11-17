import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'PERSONAL WEALTH OS', description:'Il tuo patrimonio in un’unica visione' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="it"><body>{children}</body></html>; }
