'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: '📊', label: 'Dashboard' },
    { href: '/enroll', icon: '👆', label: 'Add User & Enroll' },
    { href: '/checkin', icon: '✅', label: 'Check In' },
    { href: '/users', icon: '👥', label: 'Users' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🔐</div>
        <div>
          <h1>FingerAuth</h1>
          <span>Biometric System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="nav-link-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className="nav-section-label" style={{ marginTop: '24px' }}>System</div>
        <div className="nav-link" style={{ cursor: 'default' }}>
          <span className="nav-link-icon">🔗</span>
          <div>
            <div style={{ fontSize: '13px' }}>gRPC Server</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>localhost:4134</div>
          </div>
        </div>
      </nav>

      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          FingerAuth Demo v1.0
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
          U.are.U 4500 · gRPC Engine
        </div>
      </div>
    </aside>
  );
}
