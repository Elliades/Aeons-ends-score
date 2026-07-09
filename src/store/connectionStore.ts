import { create } from 'zustand';
import type { ConnectionStatus } from '@/services/syncService';

interface ConnectionStore {
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  status: 'disconnected',
  setStatus: (status) => set({ status }),
}));



