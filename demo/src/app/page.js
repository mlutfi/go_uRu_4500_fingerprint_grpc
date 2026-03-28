'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DeviceStatus from '@/components/DeviceStatus';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Fingerprint, CheckCircle2, Cable, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalFingerprints: 0,
    todayCheckins: 0,
    recentCheckins: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [usersRes, checkinsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/checkins?limit=10'),
        ]);

        const usersData = await usersRes.json();
        const checkinsData = await checkinsRes.json();

        const totalFingerprints = (usersData.users || []).reduce(
          (sum, u) => sum + (u.fingerprint_count || 0), 0
        );

        setStats({
          totalUsers: (usersData.users || []).length,
          totalFingerprints,
          todayCheckins: checkinsData.todayCount || 0,
          recentCheckins: checkinsData.checkins || [],
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4 text-muted-foreground animate-pulse">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Loading dashboard overview...</span>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 pl-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">System overview and biometric activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered employee records</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fingerprints</CardTitle>
            <Fingerprint className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.totalFingerprints}</div>
            <p className="text-xs text-muted-foreground mt-1">Enrolled biometric templates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checks Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.todayCheckins}</div>
            <p className="text-xs text-muted-foreground mt-1">Successful verifications today</p>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Cable className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="mt-1">
              <DeviceStatus compact />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Hardware connection state</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild className="justify-start shadow-sm" size="lg">
              <Link href="/enroll">
                <Fingerprint className="mr-2 h-5 w-5" />
                Enroll New Fingerprint
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start shadow-sm" size="lg">
              <Link href="/checkin">
                <CheckCircle2 className="mr-2 h-5 w-5 text-muted-foreground" />
                Biometric Check-in
              </Link>
            </Button>
            <Button asChild variant="secondary" className="justify-start shadow-sm border" size="lg">
              <Link href="/users">
                <Users className="mr-2 h-5 w-5 text-muted-foreground" />
                Manage Personnel
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Check-ins */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentCheckins.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 border border-dashed rounded-lg">
                <Clock className="h-8 w-8 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground">No recent activity</p>
                <p className="text-xs text-muted-foreground mt-1">System is waiting for check-ins.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentCheckins.slice(0, 5).map((ci) => (
                  <div key={ci.id} className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm transition-all hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden font-bold">
                        {ci.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{ci.name}</span>
                        <span className="text-xs font-mono text-muted-foreground tracking-tight">{ci.employee_id}</span>
                      </div>
                    </div>
                    <div className="text-xs font-mono font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md border">
                      {new Date(ci.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Minimal inline loader for the initial loading state
function Loader(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
