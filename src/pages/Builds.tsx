import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Bookmark, Loader2, Trash2, Plus, Calendar } from 'lucide-react';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface BuildWithCharacter {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
  characters: {
    name: string;
    role: 'tank' | 'damage' | 'support';
  };
}

export default function Builds() {
  const [builds, setBuilds] = useState<BuildWithCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    async function fetchBuilds() {
      const { data, error } = await supabase
        .from('user_builds')
        .select(`
          id,
          name,
          notes,
          created_at,
          characters (name, role)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setBuilds(data as unknown as BuildWithCharacter[]);
      }
      setLoading(false);
    }
    fetchBuilds();
  }, [user]);

  const deleteBuild = async (buildId: string) => {
    setDeletingId(buildId);
    try {
      const { error } = await supabase
        .from('user_builds')
        .delete()
        .eq('id', buildId);

      if (error) throw error;

      setBuilds(builds.filter(b => b.id !== buildId));
      toast({ title: 'Build deleted' });
    } catch (error: any) {
      toast({
        title: 'Failed to delete build',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Bookmark className="h-8 w-8 text-primary" />
              My Builds
            </h1>
            <p className="text-muted-foreground">
              Your saved item builds for quick reference.
            </p>
          </div>
          <Button onClick={() => navigate('/optimizer')} className="gap-2">
            <Plus className="h-4 w-4" />
            New Build
          </Button>
        </div>

        {builds.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">No builds saved yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first build using the optimizer!
              </p>
              <Button onClick={() => navigate('/optimizer')}>
                Open Optimizer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {builds.map(build => (
              <Card key={build.id} className="animate-fade-in">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{build.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span>{build.characters.name}</span>
                        <RoleBadge role={build.characters.role} showIcon={false} />
                      </CardDescription>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete build?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{build.name}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteBuild(build.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletingId === build.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Delete'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {build.notes && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {build.notes}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(build.created_at), 'MMM d, yyyy')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
