import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Define all translatable strings (English as source)
const sourceStrings = {
  // Navigation
  'nav.optimizer': 'Optimizer',
  'nav.items': 'Items',
  'nav.myBuilds': 'My Builds',
  'nav.admin': 'Admin',
  'nav.profile': 'Profile',
  'nav.signIn': 'Sign In',
  'nav.signOut': 'Sign Out',
  'nav.lightMode': 'Light Mode',
  'nav.darkMode': 'Dark Mode',
  
  // Auth
  'auth.welcomeBack': 'Welcome back',
  'auth.createAccount': 'Create account',
  'auth.signInDesc': 'Sign in to access your saved builds',
  'auth.signUpDesc': 'Sign up to save your favorite builds',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.noAccount': "Don't have an account?",
  'auth.hasAccount': 'Already have an account?',
  'auth.signUp': 'Sign up',
  'auth.signIn': 'Sign in',
  
  // Profile
  'profile.title': 'Profile Settings',
  'profile.subtitle': 'Manage your account settings',
  'profile.username': 'Username',
  'profile.usernamePlaceholder': 'Enter your username',
  'profile.saveChanges': 'Save Changes',
  'profile.saving': 'Saving...',
  'profile.updated': 'Profile updated',
  'profile.updateSuccess': 'Your username has been updated successfully.',
  'profile.updateError': 'Error updating profile',
  
  // Index / Home
  'home.badge': 'Overwatch Stadium Item Optimizer',
  'home.title': 'Find the perfect items for every round',
  'home.subtitle': 'Optimize your Stadium builds based on your current round and budget. Get the most value from every credit you spend.',
  'home.openOptimizer': 'Open Optimizer',
  'home.smartOptimizer': 'Smart Optimizer',
  'home.smartOptimizerDesc': 'Input your round and budget to get optimal item recommendations instantly.',
  'home.tryNow': 'Try now',
  'home.optimizationHistory': 'Optimization History',
  'home.optimizationHistoryDesc': 'Track your past optimizations and quickly revisit successful builds.',
  'home.startOptimizing': 'Start Optimizing',
  
  // Optimizer
  'optimizer.title': 'Item Optimizer',
  'optimizer.subtitle': 'Select your hero, set your budget, and get optimal item recommendations.',
  'optimizer.selectCharacter': 'Select Character',
  'optimizer.changeHero': 'Change',
  'optimizer.currentRound': 'Current Round',
  'optimizer.budget': 'Budget (Credits)',
  'optimizer.spent': 'Spent',
  'optimizer.remaining': 'Remaining',
  'optimizer.itemsSelected': 'items selected',
  'optimizer.applyOptimalBuild': 'Apply Optimal Build',
  'optimizer.optimal': 'Optimal',
  'optimizer.credits': 'credits',
  'optimizer.saveToHistory': 'Save to History',
  'optimizer.save': 'Save',
  'optimizer.recommendedItems': 'Recommended Items',
  'optimizer.affordableItems': 'Affordable items for',
  'optimizer.creditsLeft': 'credits left',
  'optimizer.noBudgetRemaining': 'No budget remaining - remove items to see more options',
  'optimizer.selectCharacterToSee': 'Select a character to see recommendations',
  'optimizer.chooseCharacter': 'Choose a character to get started',
  'optimizer.noItemsAvailable': 'No items available within your budget',
  'optimizer.inCategory': 'in',
  'optimizer.category': 'category',
  'optimizer.optimizationHistory': 'Optimization History',
  'optimizer.recentOptimizations': 'Your recent optimizations (session only)',
  'optimizer.noOptimizationsYet': 'No optimizations yet. Select items and add to history.',
  'optimizer.items': 'items',
  'optimizer.tank': 'Tank',
  'optimizer.damage': 'Damage',
  'optimizer.support': 'Support',
  'optimizer.maxItems': 'Maximum 6 items',
  'optimizer.removeItemToAdd': 'Remove an item to add a new one',
  'optimizer.notEnoughBudget': 'Not enough budget',
  'optimizer.needMore': 'Need',
  'optimizer.moreCredits': 'more credits',
  'optimizer.buildCleared': 'Build cleared',
  'optimizer.addedToHistory': 'Added to history!',
  
  // Items
  'items.title': 'Item Database',
  'items.subtitle': 'Browse all Stadium items with stats, costs, and special effects.',
  'items.searchPlaceholder': 'Search items...',
  'items.allRarities': 'All Rarities',
  'items.common': 'Common',
  'items.rare': 'Rare',
  'items.epic': 'Epic',
  'items.sortName': 'Name (A-Z)',
  'items.sortCostAsc': 'Cost (Low to High)',
  'items.sortCostDesc': 'Cost (High to Low)',
  'items.sortRarity': 'Rarity (Best first)',
  'items.clear': 'Clear',
  'items.showing': 'Showing',
  'items.of': 'of',
  'items.itemsLabel': 'items',
  'items.noItemsMatch': 'No items match your filters. Try adjusting your search criteria.',
  'items.all': 'All',
  'items.weapon': 'Weapon',
  'items.ability': 'Ability',
  'items.survival': 'Survival',
  'items.gadget': 'Gadget',
  
  // Admin
  'admin.title': 'Admin - Item Manager',
  'admin.subtitle': 'Manage item perks, prices, and descriptions. Changes are saved in bulk.',
  'admin.itemManager': 'Item Manager',
  'admin.editDesc': 'Edit items below, then save all changes at once.',
  'admin.modified': 'Modified',
  'admin.discard': 'Discard',
  'admin.saveAll': 'Save All',
  'admin.saving': 'Saving...',
  'admin.itemsModified': 'item(s) modified',
  'admin.showing': 'Showing',
  'admin.of': 'of',
  'admin.items': 'items',
  
  // Common
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.noSpecialEffect': 'No special effect',
} as const;

type TranslationKey = keyof typeof sourceStrings;

interface TranslationContextType {
  t: (key: TranslationKey) => string;
  currentLang: string;
  setLanguage: (lang: string) => void;
  isTranslating: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// DeepL language codes
const langCodeMap: Record<string, string> = {
  'en': 'EN',
  'fr': 'FR',
  'de': 'DE',
  'es': 'ES',
  'pt': 'PT-BR',
  'ja': 'JA',
  'ko': 'KO',
  'zh': 'ZH',
};

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [currentLang, setCurrentLang] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('language') || 'en';
    }
    return 'en';
  });
  const [translations, setTranslations] = useState<Record<string, string>>(sourceStrings);
  const [isTranslating, setIsTranslating] = useState(false);
  const [cache, setCache] = useState<Record<string, Record<string, string>>>({});

  const translateTexts = useCallback(async (lang: string) => {
    if (lang === 'en') {
      setTranslations(sourceStrings);
      return;
    }

    // Check cache first
    if (cache[lang]) {
      setTranslations(cache[lang]);
      return;
    }

    setIsTranslating(true);

    try {
      const texts = Object.values(sourceStrings);
      const targetLang = langCodeMap[lang] || 'EN';

      const { data, error } = await supabase.functions.invoke('translate', {
        body: { texts, targetLang },
      });

      if (error) {
        console.error('Translation error:', error);
        setTranslations(sourceStrings);
        return;
      }

      if (data?.translations) {
        const keys = Object.keys(sourceStrings);
        const translatedStrings: Record<string, string> = {};
        
        data.translations.forEach((t: { text: string }, i: number) => {
          translatedStrings[keys[i]] = t.text;
        });

        setTranslations(translatedStrings);
        setCache(prev => ({ ...prev, [lang]: translatedStrings }));
      }
    } catch (error) {
      console.error('Translation fetch error:', error);
      setTranslations(sourceStrings);
    } finally {
      setIsTranslating(false);
    }
  }, [cache]);

  useEffect(() => {
    translateTexts(currentLang);
  }, [currentLang, translateTexts]);

  const setLanguage = useCallback((lang: string) => {
    setCurrentLang(lang);
    localStorage.setItem('language', lang);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translations[key] || sourceStrings[key] || key;
  }, [translations]);

  return (
    <TranslationContext.Provider value={{ t, currentLang, setLanguage, isTranslating }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
