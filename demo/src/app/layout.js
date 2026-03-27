import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'FingerAuth - Biometric Authentication System',
  description: 'Fingerprint enrollment and check-in system powered by DigitalPersona U.are.U 4500',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Navbar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
