import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { useSessionSync } from './hooks/useSessionSync';
import { getSessionNameFromUrl } from './utils/urlParams';

function App() {
  const [sessionName, setSessionName] = useState<string | null>(null);

  // Get session name from URL on mount and when URL changes
  useEffect(() => {
    const updateSessionName = () => {
      setSessionName(getSessionNameFromUrl());
    };

    // Get initial session name
    updateSessionName();

    // Listen for URL changes (e.g., browser back/forward)
    window.addEventListener('popstate', updateSessionName);

    return () => {
      window.removeEventListener('popstate', updateSessionName);
    };
  }, []);

  // Initialize sync with session name from URL
  useSessionSync(sessionName);

  return <Layout />;
}

export default App;

