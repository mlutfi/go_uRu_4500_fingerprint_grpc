'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DeviceStatus from './DeviceStatus';
import ThemeToggle from './ThemeToggle';
import { LayoutDashboard, UserPlus, Fingerprint, Users, Link as LinkIcon } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/enroll', icon: UserPlus, label: 'Enroll' },
    { href: '/checkin', icon: Fingerprint, label: 'Check In', isPrimary: true },
    { href: '/users', icon: Users, label: 'Users' },
  ];

  return (
    <aside className="w-[260px] flex-shrink-0 flex flex-col border-r bg-card h-full overflow-y-auto">
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Fingerprint className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-foreground">FingerAuth</h1>
          <span className="text-[10px] text-muted-foreground block font-medium">U.are.U 4500</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 flex flex-col gap-1 overflow-y-auto">
        <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-2 px-2">Navigation</div>
        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-muted text-foreground font-semibold' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${item.isPrimary ? 'text-primary' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mt-6 mb-2 px-2">Device</div>
        <div className="px-1">
          <DeviceStatus />
        </div>

        <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mt-6 mb-2 px-2">System</div>
        <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground rounded-md bg-muted/30">
          <LinkIcon className="h-4 w-4 shrink-0" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">gRPC Engine</span>
            <span className="text-[11px] font-mono">localhost:4134</span>
          </div>
        </div>
      </nav>

      <div className="mt-auto border-t p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-muted-foreground">FingerAuth v2.0</span>
          <span className="text-[10px] text-muted-foreground">WebSDK · gRPC</span>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
