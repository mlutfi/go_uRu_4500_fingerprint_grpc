'use client';

import { useState } from 'react';
import FingerprintScanner from '@/components/FingerprintScanner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, UserPlus, Fingerprint, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function EnrollPage() {
  const [step, setStep] = useState('form'); // form | enroll | done
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', employee_id: '', department: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [captures, setCaptures] = useState([]);
  const [captureStep, setCaptureStep] = useState(0);
  const [scanStatus, setScanStatus] = useState('idle');
  const [scanStatusText, setScanStatusText] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollResult, setEnrollResult] = useState(null);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      setUser(data.user);
      setStep('enroll');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = (fmdData) => {
    if (captures.length >= 3) return;
    setScanStatus('scanning');
    setScanStatusText('Processing fingerprint...');

    setTimeout(() => {
      const newCaptures = [...captures, fmdData];
      setCaptures(newCaptures);
      setCaptureStep(newCaptures.length);
      setScanStatus('success');
      setScanStatusText(`Capture ${newCaptures.length}/3 successful!`);
      setTimeout(() => {
        if (newCaptures.length < 3) {
          setScanStatus('idle');
          setScanStatusText('');
        }
      }, 1500);
    }, 800);
  };

  const handleEnroll = async () => {
    if (captures.length < 3) return;
    setEnrolling(true);
    setError('');

    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          fmdCandidates: captures,
          fingerName: 'right_index',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enrollment failed');
      setEnrollResult(data);
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnrolling(false);
    }
  };

  const handleReset = () => {
    setStep('form');
    setUser(null);
    setFormData({ name: '', employee_id: '', department: '' });
    setCaptures([]);
    setCaptureStep(0);
    setScanStatus('idle');
    setScanStatusText('');
    setEnrollResult(null);
    setError('');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      <div className="mb-8 pl-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-primary" />
          Enroll User
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Register new personnel and capture biometric data.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm font-medium text-destructive animate-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm">
        <div className={`flex flex-col items-center gap-2 ${step === 'form' ? 'text-primary' : 'text-green-600 dark:text-green-500'}`}>
          <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-bold ${step === 'form' ? 'border-primary bg-primary/10' : 'border-green-500 bg-green-500/10'}`}>
            {step !== 'form' ? <CheckCircle2 className="h-4 w-4" /> : '1'}
          </div>
          <span className="text-xs font-semibold">User Info</span>
        </div>
        
        <div className={`h-px w-full flex-1 mx-4 ${step === 'form' ? 'bg-border' : 'bg-green-500/50'}`} />
        
        <div className={`flex flex-col items-center gap-2 ${step === 'enroll' ? 'text-primary' : step === 'done' ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'}`}>
          <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-bold ${step === 'enroll' ? 'border-primary bg-primary/10' : step === 'done' ? 'border-green-500 bg-green-500/10' : 'border-border bg-muted/30'}`}>
            {step === 'done' ? <CheckCircle2 className="h-4 w-4" /> : '2'}
          </div>
          <span className="text-xs font-semibold">Fingerprint</span>
        </div>

        <div className={`h-px w-full flex-1 mx-4 ${step === 'done' ? 'bg-green-500/50' : 'bg-border'}`} />

        <div className={`flex flex-col items-center gap-2 ${step === 'done' ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'}`}>
          <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-bold ${step === 'done' ? 'border-green-500 bg-green-500/10' : 'border-border bg-muted/30'}`}>
            {step === 'done' ? <CheckCircle2 className="h-4 w-4" /> : '3'}
          </div>
          <span className="text-xs font-semibold">Complete</span>
        </div>
      </div>

      {step === 'form' && (
        <Card>
          <CardHeader>
            <CardTitle>Personnel Details</CardTitle>
            <CardDescription>Enter basic information for the new user profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g. Ahmad Dahir"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input
                  id="employee_id"
                  placeholder="Auto-generated if empty"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="e.g. Engineering"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? 'Processing...' : 'Continue to Fingerprint Scan'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 'enroll' && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Fingerprint className="h-5 w-5 text-primary" />
                  Biometric Capture
                </CardTitle>
                <CardDescription className="mt-1.5 flex flex-col gap-0.5">
                  <span>Enrolling for: <strong className="text-foreground font-semibold">{user?.name}</strong></span>
                  <span className="font-mono text-xs">{user?.employee_id}</span>
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-medium">
                {Math.min(captureStep + 1, 3)} / 3 Captures
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-6 flex justify-center gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    i < captureStep ? 'bg-green-500 text-white' : 
                    i === captureStep && captureStep < 3 ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 
                    'bg-muted text-muted-foreground'
                  }`}>
                    {i < captureStep ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  {i < 2 && (
                    <div className={`h-1 w-12 rounded-full ${i < captureStep ? 'bg-green-500/50' : 'bg-border'}`} />
                  )}
                </div>
              ))}
            </div>

            {captures.length < 3 ? (
              <div className="rounded-xl border bg-card p-4">
                <FingerprintScanner
                  status={scanStatus}
                  statusText={scanStatusText}
                  hintText={`Capture ${captureStep + 1} of 3 — Place finger firmly on scanner`}
                  onCapture={handleCapture}
                  disabled={captures.length >= 3}
                  autoStart={true}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-green-500/5 rounded-xl border border-green-500/20">
                <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
                <h3 className="mb-2 text-xl font-bold text-green-600 dark:text-green-500">Processing Complete</h3>
                <p className="mb-6 text-sm text-muted-foreground max-w-sm">
                  3 captures acquired successfully. The system will now combine these into a single high-quality biometric template.
                </p>
                <Button size="lg" onClick={handleEnroll} disabled={enrolling} className="w-full max-w-xs shadow-md">
                  {enrolling ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Enrolling to Engine...</>
                  ) : (
                    'Finalize Enrollment'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'done' && (
        <Card className="border-green-500/30 bg-green-500/5 shadow-sm">
          <CardContent className="flex flex-col items-center p-10 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Enrollment Successful</h3>
            <p className="text-muted-foreground mb-6">
              <strong className="text-foreground">{user?.name}</strong> has been securely registered.
            </p>
            
            <div className="bg-background border rounded-lg p-4 w-full flex flex-col gap-2 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Employee ID</span>
                <span className="font-mono font-medium">{user?.employee_id}</span>
              </div>
              <div className="h-px bg-border w-full" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Template ID</span>
                <span className="font-mono font-medium truncate max-w-[150px] ml-4" title={enrollResult?.fingerprint?.id}>
                  {enrollResult?.fingerprint?.id?.split('-')[0]}...
                </span>
              </div>
            </div>

            <div className="flex gap-4 w-full justify-center">
              <Button onClick={handleReset} variant="outline" className="flex-1 max-w-[180px]">
                Enroll Next
              </Button>
              <Button asChild className="flex-1 max-w-[180px]">
                <Link href="/checkin">Go to Check-in</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
