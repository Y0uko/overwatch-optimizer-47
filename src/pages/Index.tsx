import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Calculator, Users, Bookmark, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { user } = useAuth();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              Overwatch Stadium Item Optimizer
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Find the perfect items for every round
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Optimize your Stadium builds based on your current round and budget. 
              Get the most value from every credit you spend.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/optimizer">
                <Button size="lg" className="gap-2">
                  <Calculator className="h-5 w-5" />
                  Open Optimizer
                </Button>
              </Link>
              <Link to="/characters">
                <Button variant="outline" size="lg" className="gap-2">
                  <Users className="h-5 w-5" />
                  Browse Characters
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Calculator className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Smart Optimizer</CardTitle>
                <CardDescription>
                  Input your round and budget to get optimal item recommendations instantly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/optimizer" className="text-primary text-sm font-medium inline-flex items-center gap-1 hover:gap-2 transition-all">
                  Try now <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>30 Heroes</CardTitle>
                <CardDescription>
                  All Overwatch heroes organized by role with official portraits and stats.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/characters" className="text-primary text-sm font-medium inline-flex items-center gap-1 hover:gap-2 transition-all">
                  View Heroes <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center mb-2">
                  <Bookmark className="h-6 w-6 text-success" />
                </div>
                <CardTitle>Optimization History</CardTitle>
                <CardDescription>
                  Track your past optimizations and quickly revisit successful builds.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/optimizer" className="text-primary text-sm font-medium inline-flex items-center gap-1 hover:gap-2 transition-all">
                  Start Optimizing <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </Layout>
  );
}
