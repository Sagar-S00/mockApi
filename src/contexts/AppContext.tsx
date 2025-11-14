import { createContext, useContext, useRef, useState, ReactNode } from 'react';

type View = 'dashboard' | 'mocks' | 'designer' | 'chat' | 'tester';

export interface TesterPreset {
  method: string;
  path: string;
  headers?: Array<{ key: string; value: string }>;
  body?: string;
}

type ToastType = 'info' | 'success' | 'error';

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
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
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: () => void;
  toast: ToastState | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [editingMockId, setEditingMockId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [testerPreset, setTesterPreset] = useState<TesterPreset | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimeout = useRef<number | undefined>();

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const dismissToast = () => {
    setToast(null);
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
      toastTimeout.current = undefined;
    }
  };

  const showToast = (message: string, type: ToastType = 'info') => {
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }
    const entry: ToastState = { id: Date.now(), message, type };
    setToast(entry);
    toastTimeout.current = window.setTimeout(() => {
      setToast(current => (current?.id === entry.id ? null : current));
      toastTimeout.current = undefined;
    }, 3500);
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
      showToast,
      toast,
      dismissToast,
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
