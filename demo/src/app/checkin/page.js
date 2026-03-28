'use client';

import { useState, useEffect } from 'react';
import FingerprintScanner from '@/components/FingerprintScanner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Loader2, ListOrdered, CheckCircle2, XCircle, TerminalSquare } from 'lucide-react';

export default function CheckinPage() {
  const [scanStatus, setScanStatus] = useState('idle');
  const [scanStatusText, setScanStatusText] = useState('');
  const [result, setResult] = useState(null);
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCheckins() {
      try {
        const res = await fetch('/api/checkins?limit=10');
        const data = await res.json();
        setRecentCheckins(data.checkins || []);
      } catch (err) {
        console.error('Failed to fetch check-ins:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCheckins();
  }, []);

  const handleCapture = async (fmdData) => {
    setScanStatus('scanning');
    setScanStatusText('Verifying fingerprint...');
    setResult(null);

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmd: fmdData }),
      });

      const data = await res.json();

      if (data.match) {
        setScanStatus('success');
        setScanStatusText('Fingerprint matched!');
        setResult({
          success: true,
          user: data.user,
          checkin: data.checkin,
          verificationMode: data.verificationMode,
          note: data.note,
        });

        const checkinsRes = await fetch('/api/checkins?limit=10');
        const checkinsData = await checkinsRes.json();
        setRecentCheckins(checkinsData.checkins || []);
      } else {
        setScanStatus('error');
        setScanStatusText('No match found');
        setResult({ success: false, error: data.error || 'Access Denied' });
      }
    } catch (err) {
      setScanStatus('error');
      setScanStatusText('System Error');
      setResult({ success: false, error: err.message });
    }

    setTimeout(() => {
      setScanStatus('idle');
      setScanStatusText('');
    }, 4500);
  };

  const handleReset = () => {
    setScanStatus('idle');
    setScanStatusText('');
    setResult(null);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-8rem)]">
      <div className="mb-6 pl-1 flex items-center gap-2">
        <Fingerprint className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Biometric Check-in</h2>
          <p className="text-sm text-muted-foreground">Scan fingerprint to verify identity and record attendance</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 h-full pb-4">
        {/* Scanner Panel */}
        <Card className="flex flex-col h-full overflow-hidden shadow-sm">
          <CardHeader className="bg-muted/20 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-muted-foreground" />
              Scanner Validation
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-6 relative">
            <div className={`transition-all duration-300 w-full ${result ? 'scale-[0.85] opacity-50 absolute top-4' : 'scale-100 opacity-100'}`}>
              <FingerprintScanner
                status={scanStatus}
                statusText={scanStatusText}
                hintText="Place finger on scanner to check in"
                onCapture={handleCapture}
                autoStart={true}
              />
            </div>

            {/* Result Popover/Overlay */}
            {result && (
              <div className="w-full mt-auto animate-in zoom-in-95 duration-300 absolute inset-0 flex flex-col items-center justify-end p-6 bg-background/60 backdrop-blur-[2px]">
                {result.success ? (
                  <div className="w-full max-w-sm rounded-xl border border-green-500/30 bg-green-500/10 p-6 shadow-xl backdrop-blur-md">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="rounded-full bg-green-500/20 p-2 text-green-600 dark:text-green-500 shrink-0">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">Welcome In</h3>
                        <p className="text-lg font-medium text-green-700 dark:text-green-400 mt-0.5">{result.user?.name}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 mb-4 p-3 bg-background/50 rounded-lg border text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ID Number</span>
                        <span className="font-mono font-medium">{result.user?.employee_id}</span>
                      </div>
                      {result.user?.department && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dept</span>
                          <span className="font-medium text-right">{result.user.department}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-1.5 mt-1.5 border-t">
                        <span className="text-muted-foreground">Timestamp</span>
                        <Badge variant="secondary" className="font-mono text-[11px] rounded-sm">
                          {new Date(result.checkin?.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                        </Badge>
                      </div>
                    </div>

                    {result.verificationMode === 'demo' && (
                      <div className="mb-4 flex items-center gap-2 rounded-md border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-[11px] text-yellow-600 dark:text-yellow-500">
                        <TerminalSquare className="h-4 w-4 shrink-0" />
                        Fallback exact-match mode (gRPC Engine offline)
                      </div>
                    )}
                    
                    <Button className="w-full" onClick={handleReset} variant="outline">
                      Acknowledge & Next
                    </Button>
                  </div>
                ) : (
                  <div className="w-full max-w-sm rounded-xl border border-destructive/30 bg-destructive/10 p-6 shadow-xl backdrop-blur-md text-center">
                    <div className="mx-auto rounded-full bg-destructive/20 p-3 text-destructive w-fit mb-4 shrink-0">
                      <XCircle className="h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Unrecognized</h3>
                    <p className="text-destructive font-medium mb-6">{result.error}</p>
                    <Button className="w-full" onClick={handleReset} variant="destructive">
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* History Panel */}
        <Card className="flex flex-col h-full overflow-hidden shadow-sm">
          <CardHeader className="bg-muted/20 border-b pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5 text-muted-foreground" />
                Live Feed
              </span>
              <Badge variant="outline" className="font-mono text-xs font-normal text-muted-foreground bg-background">
                Today
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 content-start">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentCheckins.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed rounded-xl h-full">
                <ListOrdered className="mb-3 h-10 w-10 opacity-20" />
                <h3 className="font-semibold text-foreground">No traffic today</h3>
                <p className="text-xs max-w-[200px] mt-1">Waiting for the first verification event of the day.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 relative">
                <div className="absolute top-0 bottom-0 left-[21px] w-px bg-border -z-10" />
                {recentCheckins.map((ci, idx) => {
                  const isLatest = idx === 0 && result?.success;
                  return (
                    <div
                      key={ci.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border bg-card transition-all ${
                        isLatest ? 'border-primary ring-1 ring-primary/20 bg-primary/5 shadow-sm transform -translate-y-1' : 'opacity-90 hover:opacity-100 hover:border-border'
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm ${
                        isLatest ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'
                      } font-semibold text-sm`}>
                        {ci.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <p className={`font-semibold truncate pr-2 ${isLatest ? 'text-foreground' : 'text-foreground'}`}>
                            {ci.name}
                          </p>
                          <span className="text-xs font-mono font-medium text-muted-foreground shrink-0 tabular-nums">
                            {new Date(ci.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground font-mono truncate">{ci.employee_id}</span>
                          <span className="text-green-600 dark:text-green-500 font-medium tracking-tight">Access Granted</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
