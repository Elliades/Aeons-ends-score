import { ref, onValue, set, off, type Database } from 'firebase/database';
import type { GameState } from '@/store/types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface SyncServiceCallbacks {
  onStateUpdate: (state: GameState) => void;
  onConnectionStatusChange: (status: ConnectionStatus) => void;
}

/**
 * Service for syncing game state with Firebase Realtime Database
 * Handles bidirectional synchronization between local state and remote session
 */
export class SyncService {
  private database: Database;
  private sessionName: string | null = null;
  private sessionRef: ReturnType<typeof ref> | null = null;
  private callbacks: SyncServiceCallbacks;
  private isSyncing = false; // Prevents sync loops
  private unsubscribe: (() => void) | null = null;

  constructor(database: Database, callbacks: SyncServiceCallbacks) {
    this.database = database;
    this.callbacks = callbacks;
  }

  /**
   * Connect to a session by name
   */
  connect(sessionName: string): void {
    if (this.sessionName === sessionName && this.sessionRef) {
      return; // Already connected to this session
    }

    this.disconnect();
    this.sessionName = sessionName;
    this.callbacks.onConnectionStatusChange('connecting');

    try {
      // Create reference to session in Firebase
      this.sessionRef = ref(this.database, `sessions/${sessionName}/state`);

      // Listen for remote changes
      this.unsubscribe = onValue(
        this.sessionRef,
        (snapshot) => {
          // Mark as connected as soon as we get a callback (even if snapshot is null)
          this.callbacks.onConnectionStatusChange('connected');

          if (this.isSyncing) {
            return; // Ignore changes we initiated
          }

          const remoteState = snapshot.val();
          if (remoteState) {
            this.callbacks.onStateUpdate(remoteState);
          }
          // If remoteState is null, session doesn't exist yet - that's fine, we're connected
        },
        (error) => {
          console.error('Sync service error:', error);
          this.callbacks.onConnectionStatusChange('error');
        },
        {
          // Only get the value once initially, then listen for changes
          // This ensures we get the initial connection status
        }
      );
    } catch (error) {
      console.error('Failed to connect to session:', error);
      this.callbacks.onConnectionStatusChange('error');
    }
  }

  /**
   * Disconnect from current session
   */
  disconnect(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.sessionRef) {
      off(this.sessionRef);
      this.sessionRef = null;
    }

    this.sessionName = null;
    this.callbacks.onConnectionStatusChange('disconnected');
  }

  /**
   * Sync local state to remote session
   */
  async syncState(state: GameState): Promise<void> {
    if (!this.sessionRef || !this.sessionName) {
      return; // Not connected to a session
    }

    try {
      // Set flag before writing to prevent processing our own writes
      this.isSyncing = true;
      await set(this.sessionRef, state);
      this.callbacks.onConnectionStatusChange('connected');
      
      // Reset flag after a short delay to allow Firebase to process
      // This prevents the onValue callback from processing our own write
      setTimeout(() => {
        this.isSyncing = false;
      }, 200);
    } catch (error) {
      console.error('Failed to sync state:', error);
      this.callbacks.onConnectionStatusChange('error');
      this.isSyncing = false; // Reset on error
    }
  }

  /**
   * Get current session name
   */
  getSessionName(): string | null {
    return this.sessionName;
  }

  /**
   * Check if connected to a session
   */
  isConnected(): boolean {
    return this.sessionRef !== null;
  }
}

