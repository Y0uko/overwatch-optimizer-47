import { ReactNode } from 'react';
import { Header } from './Header';
import { AnimatedGrid } from '@/components/AnimatedGrid';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Global animated grid background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <AnimatedGrid />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/95 to-background" />
      </div>

      <Header />
      <main className="flex-1 relative z-10">
        {children}
      </main>
      <footer className="relative z-10 py-6 border-t border-white/[0.08] bg-card/40 backdrop-blur-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.2)]">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Stadium Optimizer — Optimize your Overwatch Stadium builds
        </div>
      </footer>
    </div>
  );
}
