import Script from 'next/script';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'FingerAuth — Biometric Authentication System',
  description: 'Fingerprint enrollment and check-in system powered by DigitalPersona U.are.U 4500 WebSDK',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        {/* 
          DigitalPersona WebSDK chain: load in order
          1. WebSdk client → creates WebSdk.WebChannelClient global (WebSocket bridge)
          2. dp.core → creates dp.core global (Base64Url, Utf8 utilities)
          3. dp.devices → creates dp.devices global (FingerprintReader, SampleFormat, etc.)
        */}
        <Script 
          src="/lib/websdk.client.bundle.min.js" 
          strategy="beforeInteractive" 
        />
        <Script 
          src="/lib/dp.core.umd.js" 
          strategy="beforeInteractive" 
        />
        <Script 
          src="/lib/dp.devices.umd.js" 
          strategy="beforeInteractive" 
        />

        <div className="flex h-screen w-full bg-background text-foreground text-sm font-sans antialiased overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
