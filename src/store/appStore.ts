// Global App State Management with Zustand
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Room, Profile, WorkLog, TimerState, 
  Notification, UserRole 
} from '@/types';

interface AppState {
  // Auth
  currentUser: Profile | null;
  setCurrentUser: (user: Profile | null) => void;
  
  // Role selection (for demo/testing)
  currentRole: UserRole | null;
  setCurrentRole: (role: UserRole | null) => void;
  
  // Rooms
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  selectedRoom: Room | null;
  setSelectedRoom: (room: Room | null) => void;
  
  // Timer for performance tracking
  timer: TimerState;
  startTimer: (logId: string, roomNumber: string, taskType: WorkLog['task_type']) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  tick: () => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      
      // Role
      currentRole: null,
      setCurrentRole: (role) => set({ currentRole: role }),
      
      // Rooms
      rooms: [],
      setRooms: (rooms) => set({ rooms }),
      updateRoom: (roomId, updates) => set((state) => ({
        rooms: state.rooms.map(r => r.id === roomId ? { ...r, ...updates } : r)
      })),
      selectedRoom: null,
      setSelectedRoom: (room) => set({ selectedRoom: room }),
      
      // Timer
      timer: {
        isRunning: false,
        startTime: null,
        elapsedTime: 0,
        currentLogId: null,
        roomNumber: null,
        taskType: null
      },
      startTimer: (logId, roomNumber, taskType) => set({
        timer: {
          isRunning: true,
          startTime: Date.now(),
          elapsedTime: 0,
          currentLogId: logId,
          roomNumber,
          taskType
        }
      }),
      pauseTimer: () => set((state) => ({
        timer: {
          ...state.timer,
          isRunning: false,
          startTime: null
        }
      })),
      resumeTimer: () => set((state) => ({
        timer: {
          ...state.timer,
          isRunning: true,
          startTime: Date.now()
        }
      })),
      stopTimer: () => set((state) => ({
        timer: {
          ...state.timer,
          isRunning: false,
          startTime: null,
          currentLogId: null,
          roomNumber: null,
          taskType: null
        }
      })),
      resetTimer: () => set({
        timer: {
          isRunning: false,
          startTime: null,
          elapsedTime: 0,
          currentLogId: null,
          roomNumber: null,
          taskType: null
        }
      }),
      tick: () => set((state) => {
        if (!state.timer.isRunning || !state.timer.startTime) return state;
        const now = Date.now();
        const delta = Math.floor((now - state.timer.startTime) / 1000);
        return {
          timer: {
            ...state.timer,
            elapsedTime: state.timer.elapsedTime + delta,
            startTime: now
          }
        };
      }),
      
      // Notifications
      notifications: [],
      addNotification: (notification) => set((state) => ({
        notifications: [{
          ...notification,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          read: false
        }, ...state.notifications].slice(0, 50) // Keep last 50
      })),
      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === id ? { ...n, read: true } : n
        )
      })),
      clearNotifications: () => set({ notifications: [] }),
      
      // Loading
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading })
    }),
    {
      name: 'batu-hms-storage',
      partialize: (state) => ({ 
        currentUser: state.currentUser,
        currentRole: state.currentRole
      })
    }
  )
);

// Timer interval hook
let timerInterval: ReturnType<typeof setInterval> | null = null;

export function startTimerInterval() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    useAppStore.getState().tick();
  }, 1000);
}

export function stopTimerInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}
