import { useApp } from '../contexts/AppContext';
import { LayoutDashboard, Database, Sparkles, TestTube, Moon, Sun, Activity } from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentView, setCurrentView, theme, toggleTheme, toast, dismissToast } = useApp();

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'mocks' as const, label: 'Mock Library', icon: Database },
    { id: 'designer' as const, label: 'Mock Designer', icon: Activity },
    { id: 'chat' as const, label: 'AI Assistant', icon: Sparkles },
    { id: 'tester' as const, label: 'API Tester', icon: TestTube },
  ];

  return (
    <div className={`min-h-screen relative ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <nav className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <Activity className={`w-8 h-8 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  MockForge
                </span>
              </div>
              <div className="hidden md:flex space-x-1">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id)}
                      className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                        isActive
                          ? theme === 'dark'
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-700'
                          : theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`px-4 py-3 rounded-lg shadow-2xl border flex items-start space-x-3 ${
              toast.type === 'success'
                ? theme === 'dark'
                  ? 'bg-green-700 border-green-500 text-white'
                  : 'bg-green-50 border-green-200 text-green-900'
                : toast.type === 'error'
                  ? theme === 'dark'
                    ? 'bg-red-700 border-red-500 text-white'
                    : 'bg-red-50 border-red-200 text-red-900'
                  : theme === 'dark'
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <div className="flex-1 text-sm">{toast.message}</div>
            <button
              onClick={dismissToast}
              className={`text-xs font-medium ${
                theme === 'dark' ? 'text-white hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
