import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Calculator, Bookmark, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { motion, type Variants } from 'framer-motion';
import { AnimatedGrid } from '@/components/AnimatedGrid';

const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function Index() {
  const { t } = useTranslation();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-16 sm:py-24 lg:py-36 relative overflow-hidden">
        <AnimatedGrid />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/[0.07] rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-accent/[0.05] rounded-full blur-[100px]" />
        </div>
        <div className="container mx-auto px-3 sm:px-4 relative">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6 backdrop-blur-sm">
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('home.badge')}
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-6 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
              {t('home.title')}
            </motion.h1>

            <motion.p variants={fadeUp} className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
              {t('home.subtitle')}
            </motion.p>

            <motion.div variants={scaleIn} className="flex items-center justify-center">
              <Link to="/optimizer">
                <Button size="lg" className="gap-2 h-10 sm:h-12 text-sm sm:text-base px-5 sm:px-8 rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-shadow">
                  <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('home.openOptimizer')}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 bg-white/[0.02] border-t border-white/[0.06]">
        <div className="container mx-auto px-3 sm:px-4">
          <motion.div
            className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.div variants={fadeUp}>
              <Card className="h-full">
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
            </motion.div>

            <motion.div variants={fadeUp}>
              <Card className="h-full">
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
            </motion.div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
