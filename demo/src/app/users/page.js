'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Fingerprint, Trash2, Calendar, LayoutGrid, List } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleDelete(user) {
    if (!confirm(`Delete "${user.name}"?\n\nThis will remove the user, all fingerprints, and check-in history. This cannot be undone.`)) {
      return;
    }

    setDeletingId(user.id);
    setError('');

    try {
      const res = await fetch(`/api/users?id=${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4 text-muted-foreground animate-pulse">
        <Users className="h-8 w-8 text-primary" />
        <span className="font-medium text-sm">Loading personnel records...</span>
      </div>
    );
  }

  const enrolledCount = users.filter(u => u.fingerprint_count > 0).length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Registered Personnel
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage users and track biometric enrollment status.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border bg-muted/20 p-1 mr-2">
            <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8 rounded-sm" onClick={() => setViewMode('table')}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8 rounded-sm" onClick={() => setViewMode('grid')}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button asChild>
            <Link href="/enroll">
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center py-16 text-center bg-muted/10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-1">No users found</h3>
          <p className="text-muted-foreground max-w-sm mb-6">Your registry is empty. Start by enrolling your first user and their fingerprint.</p>
          <Button asChild>
            <Link href="/enroll"><UserPlus className="mr-2 h-4 w-4" /> Enroll First User</Link>
          </Button>
        </Card>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <Users className="h-8 w-8 text-primary opacity-80" />
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <Fingerprint className="h-8 w-8 text-green-500 opacity-80" />
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Enrolled</p>
                  <p className="text-2xl font-bold">{enrolledCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <Fingerprint className="h-8 w-8 text-yellow-500 opacity-80" />
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{users.length - enrolledCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* List/Grid View */}
          {viewMode === 'table' ? (
            <Card className="shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[200px]">Name</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Biometrics</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className={`${deletingId === user.id ? 'opacity-50' : ''}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {user.name?.charAt(0)?.toUpperCase()}
                          </div>
                          {user.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{user.employee_id || '—'}</TableCell>
                      <TableCell>{user.department || '—'}</TableCell>
                      <TableCell className="text-center">
                        {user.fingerprint_count > 0 ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20 gap-1.5">
                            <Fingerprint className="h-3 w-3" />
                            {user.fingerprint_count} Enrolled
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground gap-1.5 line-through decoration-muted-foreground/50">
                            <Fingerprint className="h-3 w-3" />
                            None
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(user)}
                          disabled={deletingId === user.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {users.map((user) => (
                <Card key={user.id} className={`flex flex-col shadow-sm transition-all hover:shadow-md ${deletingId === user.id ? 'opacity-50 pointer-events-none' : ''}`}>
                  <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-lg shadow-inner">
                        {user.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <CardTitle className="text-base truncate">{user.name}</CardTitle>
                        <span className="text-xs font-mono text-muted-foreground truncate">{user.employee_id}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4 mt-auto">
                    <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground font-medium bg-muted/30 p-2 rounded-md border">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {user.fingerprint_count > 0 ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20">
                          ✓ Biometric Set
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">
                          Pending Setup
                        </Badge>
                      )}
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(user)}
                        disabled={deletingId === user.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
