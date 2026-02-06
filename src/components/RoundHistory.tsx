import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ItemCategory } from '@/types/database';
import { RoundEntry } from '@/hooks/useRoundHistory';
import { History, TrendingUp, Coins, Package, Sword, Sparkles, Shield, Wrench, Trash2, LogIn, Loader2 } from 'lucide-react';

const categoryIcons: Record<ItemCategory, React.ReactNode> = {
  weapon: <Sword className="h-3 w-3" />,
  ability: <Sparkles className="h-3 w-3" />,
  survival: <Shield className="h-3 w-3" />,
  gadget: <Wrench className="h-3 w-3" />,
};

interface RoundHistoryProps {
  history: RoundEntry[];
  loading?: boolean;
  isAuthenticated?: boolean;
  onLoadRound: (entry: RoundEntry) => void;
  onClearHistory: () => void;
}

interface BudgetBracket {
  label: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
  color: string;
}

export function RoundHistory({ history, loading, isAuthenticated = true, onLoadRound, onClearHistory }: RoundHistoryProps) {
  // Calculate budget frequency distribution
  const budgetStats = useMemo(() => {
    if (history.length === 0) return null;

    const budgets = history.map(h => h.budgetAtStart);
    const avgBudget = Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length);
    const minBudget = Math.min(...budgets);
    const maxBudget = Math.max(...budgets);
    const avgSpent = Math.round(history.reduce((sum, h) => sum + h.budgetSpent, 0) / history.length);
    const avgRemaining = Math.round(history.reduce((sum, h) => sum + h.budgetRemaining, 0) / history.length);

    // Budget brackets for frequency analysis
    const brackets: BudgetBracket[] = [
      { label: '0-2000', min: 0, max: 2000, count: 0, percentage: 0, color: 'bg-red-500' },
      { label: '2001-3500', min: 2001, max: 3500, count: 0, percentage: 0, color: 'bg-orange-500' },
      { label: '3501-5000', min: 3501, max: 5000, count: 0, percentage: 0, color: 'bg-yellow-500' },
      { label: '5001-7000', min: 5001, max: 7000, count: 0, percentage: 0, color: 'bg-green-500' },
      { label: '7001+', min: 7001, max: Infinity, count: 0, percentage: 0, color: 'bg-blue-500' },
    ];

    budgets.forEach(budget => {
      const bracket = brackets.find(b => budget >= b.min && budget <= b.max);
      if (bracket) bracket.count++;
    });

    brackets.forEach(b => {
      b.percentage = Math.round((b.count / budgets.length) * 100);
    });

    return { avgBudget, minBudget, maxBudget, avgSpent, avgRemaining, brackets, totalRounds: history.length };
  }, [history]);

  // Item frequency across all rounds
  const itemFrequency = useMemo(() => {
    const freq = new Map<string, { item: typeof history[0]['items'][0]; count: number }>();
    
    history.forEach(entry => {
      entry.items.forEach(item => {
        const existing = freq.get(item.id);
        if (existing) {
          existing.count++;
        } else {
          freq.set(item.id, { item, count: 1 });
        }
      });
    });

    return Array.from(freq.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [history]);

  // Show loading state
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Round History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show sign-in prompt when not authenticated
  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Round History
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Track your economy over rounds
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Sign in to save and sync your round history across devices.
            </p>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/auth">
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Round History
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Complete builds to track your economy over rounds
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="text-center py-8 text-muted-foreground">
            No rounds recorded yet. Save your first build!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Round History
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {history.length} rounds tracked
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClearHistory} title="Clear history">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 space-y-4">
        {/* Budget Statistics */}
        {budgetStats && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-primary" />
              Economy Overview
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-bold text-primary">{budgetStats.avgBudget.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">Avg Budget</div>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-bold text-destructive">{budgetStats.avgSpent.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">Avg Spent</div>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-bold text-primary">{budgetStats.avgRemaining.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">Avg Saved</div>
              </div>
            </div>

            {/* Budget Frequency Distribution */}
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">Budget Distribution</div>
              {budgetStats.brackets.filter(b => b.count > 0).map(bracket => (
                <div key={bracket.label} className="flex items-center gap-2">
                  <div className="w-16 text-[10px] text-muted-foreground">{bracket.label}</div>
                  <div className="flex-1">
                    <Progress value={bracket.percentage} className="h-2" />
                  </div>
                  <div className="w-10 text-[10px] text-right">{bracket.percentage}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Most Used Items */}
        {itemFrequency.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Package className="h-4 w-4 text-primary" />
              Most Used Items
            </div>
            <div className="flex flex-wrap gap-1.5">
              {itemFrequency.map(({ item, count }) => (
                <div
                  key={item.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 border border-border"
                  title={`${item.name} - used ${count}x`}
                >
                  <div className="w-5 h-5 rounded overflow-hidden bg-background">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {categoryIcons[item.category]}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-medium truncate max-w-[60px]">{item.name}</span>
                  <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                    {count}x
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Round-by-Round History */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Coins className="h-4 w-4 text-primary" />
            Round Details
          </div>
          <ScrollArea className="h-[250px]">
            <div className="space-y-2 pr-2">
              {history.map((entry, index) => (
                <button
                  key={index}
                  onClick={() => onLoadRound(entry)}
                  className="w-full p-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      R{entry.round}
                    </Badge>
                    {entry.character.image_url && (
                      <img 
                        src={entry.character.image_url} 
                        alt={entry.character.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    )}
                    <span className="text-xs font-medium flex-1 truncate">{entry.character.name}</span>
                    <div className="text-[10px] text-muted-foreground">
                      <span className="text-primary">{entry.budgetAtStart.toLocaleString()}</span>
                      {' → '}
                      <span className="text-secondary-foreground">{entry.budgetRemaining.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* Items used this round */}
                  <div className="flex flex-wrap gap-1">
                    {entry.items.map(item => (
                      <div
                        key={item.id}
                        className="w-6 h-6 rounded overflow-hidden bg-background border border-border"
                        title={`${item.name} (${item.cost})`}
                      >
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            {categoryIcons[item.category]}
                          </div>
                        )}
                      </div>
                    ))}
                    {entry.items.length === 0 && (
                      <span className="text-[10px] text-muted-foreground italic">No items</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
