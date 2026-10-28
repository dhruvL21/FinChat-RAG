import type { Metadata } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import AuthInit from '@/components/AuthInit';
import { Navbar } from '@/components/finchat/navbar';

export const metadata: Metadata = {
  title: 'Finchat | Elite Financial Guardian',
  description: 'Rigorous Indian Rupee (₹) based financial intelligence and strategist',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <FirebaseClientProvider>
          <AuthInit />
          <Navbar />
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
