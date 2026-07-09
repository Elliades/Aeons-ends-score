import { useEffect, useState } from 'react';
import { getSessionNameFromUrl } from '@/utils/urlParams';
import { useConnectionStore } from '@/store/connectionStore';

export function ConnectionStatus() {
  const [sessionName, setSessionName] = useState<string | null>(null);
  const status = useConnectionStore((state) => state.status);

  useEffect(() => {
    const updateSessionName = () => {
      setSessionName(getSessionNameFromUrl());
    };

    updateSessionName();
    window.addEventListener('popstate', updateSessionName);

    return () => {
      window.removeEventListener('popstate', updateSessionName);
    };
  }, []);

  // Don't show anything if no session
  if (!sessionName) {
    return null;
  }

  const statusConfig = {
    disconnected: { color: 'bg-gray-500', text: 'Disconnected', dot: 'bg-gray-400' },
    connecting: { color: 'bg-yellow-500', text: 'Connecting...', dot: 'bg-yellow-400 animate-pulse' },
    connected: { color: 'bg-green-500', text: 'Connected', dot: 'bg-green-400' },
    error: { color: 'bg-red-500', text: 'Error', dot: 'bg-red-400' },
  };

  const config = statusConfig[status];

  return (
    <div className="fixed top-2 right-2 z-50 flex items-center gap-2 bg-mage-purple-dark/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-mage-gold/30 shadow-lg max-w-[min(90vw,320px)]">
      <div className="flex items-center gap-2 shrink-0">
        <div className={`w-2 h-2 rounded-full ${config.dot}`} />
        <span className="text-xs text-chalk font-medium">{config.text}</span>
      </div>
      <div className="h-4 w-px bg-mage-gold/30 shrink-0" />
      <span className="text-xs text-chalk/70 font-mono truncate min-w-0">
        <span className="hidden sm:inline">Session: </span>{sessionName}
      </span>
    </div>
  );
}

