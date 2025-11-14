import { createContext, useContext, useState, ReactNode } from 'react';

type View = 'dashboard' | 'mocks' | 'designer' | 'chat' | 'tester';

export interface TesterPreset {
  method: string;
  path: string;
  headers?: Array<{ key: string; value: string }>;
  body?: string;
}

interface AppContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
  editingMockId: string | null;
  setEditingMockId: (id: string | null) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  testerPreset: TesterPreset | null;
  setTesterPreset: (preset: TesterPreset | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [editingMockId, setEditingMockId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [testerPreset, setTesterPreset] = useState<TesterPreset | null>(null);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <AppContext.Provider value={{
      currentView,
      setCurrentView,
      editingMockId,
      setEditingMockId,
      theme,
      toggleTheme,
      testerPreset,
      setTesterPreset,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
