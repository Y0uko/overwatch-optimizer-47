import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Calculator, Bookmark, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

export default function Index() {
  const { t } = useTranslation();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-16 sm:py-24 lg:py-36 relative overflow-hidden">
        {/* Subtle glow background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/[0.07] rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-accent/[0.05] rounded-full blur-[100px]" />
        </div>
        <div className="container mx-auto px-3 sm:px-4 relative">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6 backdrop-blur-sm">
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('home.badge')}
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-6 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
              {t('home.title')}
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
              {t('home.subtitle')}
            </p>
            
            <div className="flex items-center justify-center">
              <Link to="/optimizer">
                <Button size="lg" className="gap-2 h-10 sm:h-12 text-sm sm:text-base px-5 sm:px-8 rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-shadow">
                  <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('home.openOptimizer')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 bg-white/[0.02] border-t border-white/[0.06]">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
            <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="p-4 sm:p-6">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Calculator className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl">{t('home.smartOptimizer')}</CardTitle>
                <CardDescription className="text-sm">
                  {t('home.smartOptimizerDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <Link to="/optimizer" className="text-primary text-sm font-medium inline-flex items-center gap-1 hover:gap-2 transition-all">
                  {t('home.tryNow')} <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="p-4 sm:p-6">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-success/10 flex items-center justify-center mb-2">
                  <Bookmark className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                </div>
                <CardTitle className="text-lg sm:text-xl">{t('home.optimizationHistory')}</CardTitle>
                <CardDescription className="text-sm">
                  {t('home.optimizationHistoryDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <Link to="/optimizer" className="text-primary text-sm font-medium inline-flex items-center gap-1 hover:gap-2 transition-all">
                  {t('home.startOptimizing')} <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </Layout>
  );
}
