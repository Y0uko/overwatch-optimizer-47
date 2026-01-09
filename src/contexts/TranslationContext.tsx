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
  
  // Optimizer
  'optimizer.title': 'Build Optimizer',
  'optimizer.subtitle': 'Create and optimize your builds',
  'optimizer.selectCharacter': 'Select Character',
  'optimizer.changeHero': 'Change',
  'optimizer.buildStats': 'Build Stats',
  'optimizer.selectedItems': 'Selected Items',
  'optimizer.optimalBuild': 'Apply Optimal Build',
  'optimizer.noItems': 'No items selected',
  
  // Items
  'items.title': 'Items Database',
  'items.subtitle': 'Browse all available items',
  'items.search': 'Search items...',
  'items.filters': 'Filters',
  'items.category': 'Category',
  'items.rarity': 'Rarity',
  'items.all': 'All',
  
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
