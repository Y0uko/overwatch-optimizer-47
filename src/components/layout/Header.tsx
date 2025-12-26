import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Zap, LogOut, Menu, X, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Header() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <Zap className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline">Stadium Optimizer</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              to="/optimizer" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Optimizer
            </Link>
            <Link 
              to="/characters" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Characters
            </Link>
            {user && (
              <Link 
                to="/builds" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                My Builds
              </Link>
            )}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {loading ? (
              <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />
            ) : user ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {user.email?.split('@')[0]}
                </span>
                <Button variant="ghost" size="icon" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button>Sign In</Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-4">
              <Link 
                to="/optimizer" 
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Optimizer
              </Link>
              <Link 
                to="/characters" 
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Characters
              </Link>
              {user && (
                <Link 
                  to="/builds" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Builds
                </Link>
              )}
              <div className="pt-4 border-t border-border flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDarkMode(!darkMode)}
                  className="w-full"
                >
                  {darkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </Button>
                {user ? (
                  <Button variant="outline" onClick={handleSignOut} className="w-full">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                ) : (
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">Sign In</Button>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
