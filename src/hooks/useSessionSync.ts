import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useConnectionStore } from '@/store/connectionStore';
import { getFirebaseDatabase, isFirebaseConfigured } from '@/firebase/config';
import { SyncService } from '@/services/syncService';

/**
 * Hook to synchronize game state with Firebase Realtime Database
 * Reads session name from URL parameter and syncs state bidirectionally
 */
export function useSessionSync(sessionName: string | null) {
  const syncServiceRef = useRef<SyncService | null>(null);
  const isInitializedRef = useRef(false);
  const isApplyingRemoteChangeRef = useRef(false);
  const lastSyncedStateRef = useRef<string>('');

  // Get store methods
  const gameState = useGameStore((state) => ({
    enemy: state.enemy,
    turn: state.turn,
    stronghold: state.stronghold,
  }));
  const setStateFromSync = useGameStore((state) => state.setStateFromSync);
  const setConnectionStatus = useConnectionStore((state) => state.setStatus);

  // Initialize sync service
  useEffect(() => {
    if (isInitializedRef.current) return;

    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
      console.warn('Firebase not configured. Multiplayer sync will not work. Please configure Firebase (see MULTIPLAYER_SETUP.md)');
      setConnectionStatus('error');
      return;
    }

    try {
      const database = getFirebaseDatabase();
      syncServiceRef.current = new SyncService(database, {
        onStateUpdate: (remoteState) => {
          // Update local state from remote (without triggering sync back)
          const remoteStateString = JSON.stringify(remoteState);
          
          // Only update if the remote state is different from what we last synced
          // This prevents unnecessary updates and potential loops
          if (remoteStateString !== lastSyncedStateRef.current) {
            isApplyingRemoteChangeRef.current = true;
            setStateFromSync(remoteState);
            // Update last synced state to match remote
            lastSyncedStateRef.current = remoteStateString;
            
            // Reset flag after React processes the state update
            // Use requestAnimationFrame to ensure it happens after render
            requestAnimationFrame(() => {
              setTimeout(() => {
                isApplyingRemoteChangeRef.current = false;
              }, 0);
            });
          }
        },
        onConnectionStatusChange: (status) => {
          setConnectionStatus(status);
        },
      });
      isInitializedRef.current = true;
    } catch (error) {
      console.error('Failed to initialize sync service:', error);
      setConnectionStatus('error');
    }

    return () => {
      if (syncServiceRef.current) {
        syncServiceRef.current.disconnect();
        syncServiceRef.current = null;
      }
      isInitializedRef.current = false;
      setConnectionStatus('disconnected');
    };
  }, [setStateFromSync, setConnectionStatus]);

  // Connect/disconnect based on session name
  useEffect(() => {
    const syncService = syncServiceRef.current;
    if (!syncService) return;

    if (sessionName) {
      syncService.connect(sessionName);
    } else {
      syncService.disconnect();
    }

    return () => {
      syncService.disconnect();
    };
  }, [sessionName]);

  // Sync local changes to remote (only if change came from local user, not remote)
  useEffect(() => {
    const syncService = syncServiceRef.current;
    if (!syncService || !sessionName) {
      return;
    }

    // Don't sync if we're currently applying a remote change
    if (isApplyingRemoteChangeRef.current) {
      return;
    }

    const currentStateString = JSON.stringify(gameState);
    
    // Only sync if state actually changed (not just a re-render)
    if (currentStateString === lastSyncedStateRef.current) {
      return;
    }

    // Debounce sync to avoid too many writes and batch rapid changes
    const timeoutId = setTimeout(() => {
      // Double-check we're not applying remote changes
      if (!isApplyingRemoteChangeRef.current && syncServiceRef.current) {
        syncService.syncState(gameState);
        lastSyncedStateRef.current = currentStateString;
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [gameState, sessionName]);
}

