import { AppProvider, useApp } from './contexts/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { MockLibrary } from './components/MockLibrary';
import { MockDesigner } from './components/MockDesigner';
import { AIChat } from './components/AIChat';
import { APITester } from './components/APITester';

function AppContent() {
  const { currentView } = useApp();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'mocks':
        return <MockLibrary />;
      case 'designer':
        return <MockDesigner />;
      case 'chat':
        return <AIChat />;
      case 'tester':
        return <APITester />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout>
      {renderView()}
    </Layout>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
