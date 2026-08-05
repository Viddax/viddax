import { create } from 'zustand';

export interface QueueItem {
  id: string; // Unique UUID
  url: string;
  platform: string;
  title?: string;
  progress: number; // 0 to 100
  speed: string;
  eta: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  error?: string;
}

interface QueueState {
  items: QueueItem[];
  addItem: (item: QueueItem) => void;
  updateItemProgress: (id: string, progress: number, speed: string, eta: string) => void;
  setItemStatus: (id: string, status: QueueItem['status'], error?: string) => void;
  removeItem: (id: string) => void;
  clearCompleted: () => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  updateItemProgress: (id, progress, speed, eta) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, progress, speed, eta } : item
      ),
    })),
  setItemStatus: (id, status, error) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, status, error } : item
      ),
    })),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
  clearCompleted: () =>
    set((state) => ({
      items: state.items.filter((item) => item.status !== 'completed'),
    })),
}));
