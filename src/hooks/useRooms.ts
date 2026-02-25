// Hook for room data management with real-time updates
import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { 
  fetchRooms, 
  updateRoomStatus, 
  subscribeToRooms,
  createAuditLog,
  createWorkLog,
  finishWorkLog,
  pauseWorkLog,
  resumeWorkLog
} from '@/lib/supabase';
import type { Room, RoomStatus, WorkLog } from '@/types';

export function useRooms() {
  const { 
    rooms, 
    setRooms, 
    updateRoom, 
    currentUser,
    timer,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    addNotification
  } = useAppStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial rooms data
  const loadRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRooms();
      setRooms(data);
    } catch (err: any) {
      setError(err.message);
      addNotification({
        title: 'Error loading rooms',
        message: err.message,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [setRooms, addNotification]);

  // Subscribe to real-time room updates
  useEffect(() => {
    loadRooms();
    
    const subscription = subscribeToRooms((payload) => {
      if (payload.eventType === 'UPDATE') {
        updateRoom(payload.new.id, payload.new);
      } else if (payload.eventType === 'INSERT') {
        setRooms([...rooms, payload.new]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Change room status with audit logging
  const changeRoomStatus = useCallback(async (
    room: Room, 
    newStatus: RoomStatus, 
    notes?: string
  ) => {
    if (!currentUser) {
      addNotification({
        title: 'Authentication required',
        message: 'Please log in to change room status',
        type: 'error'
      });
      return;
    }

    try {
      const oldStatus = room.status;
      
      // Update room status
      await updateRoomStatus(room.id, newStatus);
      
      // Create audit log
      await createAuditLog({
        room_number: room.room_number,
        changed_by: currentUser.id,
        changer_name: currentUser.full_name,
        changer_role: currentUser.role,
        from_status: oldStatus,
        to_status: newStatus,
        timestamp: new Date().toISOString(),
        notes
      });
      
      // Update local state
      updateRoom(room.id, { status: newStatus, last_updated: new Date().toISOString() });
      
      addNotification({
        title: 'Status updated',
        message: `Room ${room.room_number} changed from ${oldStatus} to ${newStatus}`,
        type: 'success'
      });
    } catch (err: any) {
      addNotification({
        title: 'Error updating status',
        message: err.message,
        type: 'error'
      });
    }
  }, [currentUser, updateRoom, addNotification]);

  // Start a task with timer
  const startTask = useCallback(async (
    room: Room,
    taskType: WorkLog['task_type']
  ) => {
    if (!currentUser) return;
    
    try {
      // Create work log in database
      const logId = await createWorkLog(
        room.room_number,
        currentUser.id,
        taskType,
        `${taskType} started for room ${room.room_number}`
      );
      
      // Start timer
      startTimer(logId, room.room_number, taskType);
      
      // Update room status based on task type
      let newStatus: RoomStatus;
      switch (taskType) {
        case 'Cleaning':
          newStatus = 'Cleaning';
          break;
        case 'Repair':
        case 'Maintenance':
          newStatus = 'Out of Order';
          break;
        default:
          newStatus = room.status;
      }
      
      if (newStatus !== room.status) {
        await changeRoomStatus(room, newStatus, `${taskType} started`);
      }
      
      addNotification({
        title: 'Task started',
        message: `${taskType} started for room ${room.room_number}`,
        type: 'success'
      });
      
      return logId;
    } catch (err: any) {
      addNotification({
        title: 'Error starting task',
        message: err.message,
        type: 'error'
      });
    }
  }, [currentUser, startTimer, changeRoomStatus, addNotification]);

  // Pause current task
  const pauseTask = useCallback(async () => {
    if (!timer.currentLogId) return;
    
    try {
      await pauseWorkLog(timer.currentLogId, timer.elapsedTime);
      pauseTimer();
      
      addNotification({
        title: 'Task paused',
        message: `Task paused at ${formatDuration(timer.elapsedTime)}`,
        type: 'info'
      });
    } catch (err: any) {
      addNotification({
        title: 'Error pausing task',
        message: err.message,
        type: 'error'
      });
    }
  }, [timer, pauseTimer, addNotification]);

  // Resume paused task
  const resumeTask = useCallback(async () => {
    if (!timer.currentLogId) return;
    
    try {
      await resumeWorkLog(timer.currentLogId);
      resumeTimer();
      
      addNotification({
        title: 'Task resumed',
        message: 'Task timer resumed',
        type: 'info'
      });
    } catch (err: any) {
      addNotification({
        title: 'Error resuming task',
        message: err.message,
        type: 'error'
      });
    }
  }, [timer, resumeTimer, addNotification]);

  // Finish task
  const finishTask = useCallback(async (
    room: Room,
    nextStatus?: RoomStatus
  ) => {
    if (!timer.currentLogId || !currentUser) return;
    
    try {
      // Finish work log
      await finishWorkLog(timer.currentLogId, timer.elapsedTime);
      
      // Determine next status based on task type
      let finalStatus: RoomStatus;
      if (nextStatus) {
        finalStatus = nextStatus;
      } else {
        switch (timer.taskType) {
          case 'Cleaning':
            finalStatus = 'Vacant Clean';
            break;
          case 'Inspection':
            finalStatus = 'Vacant Clean Inspected';
            break;
          case 'Repair':
          case 'Maintenance':
            finalStatus = 'Dirty';
            break;
          default:
            finalStatus = room.status;
        }
      }
      
      // Update room status
      if (finalStatus !== room.status) {
        await changeRoomStatus(room, finalStatus, `${timer.taskType} completed`);
      }
      
      addNotification({
        title: 'Task completed',
        message: `${timer.taskType} completed for room ${room.room_number} in ${formatDuration(timer.elapsedTime)}`,
        type: 'success'
      });
      
      // Reset timer
      stopTimer();
      resetTimer();
    } catch (err: any) {
      addNotification({
        title: 'Error completing task',
        message: err.message,
        type: 'error'
      });
    }
  }, [timer, currentUser, changeRoomStatus, stopTimer, resetTimer, addNotification]);

  // Get rooms by status
  const getRoomsByStatus = useCallback((status: RoomStatus) => {
    return rooms.filter(r => r.status === status);
  }, [rooms]);

  // Get rooms by building and floor
  const getRoomsByBuildingFloor = useCallback((building: string, floor?: number) => {
    return rooms.filter(r => 
      r.building === building && 
      (floor === undefined || r.floor === floor)
    );
  }, [rooms]);

  // Get unique buildings
  const buildings = Array.from(new Set(rooms.map(r => r.building))).sort();

  return {
    rooms,
    isLoading,
    error,
    buildings,
    loadRooms,
    changeRoomStatus,
    startTask,
    pauseTask,
    resumeTask,
    finishTask,
    getRoomsByStatus,
    getRoomsByBuildingFloor
  };
}

// Format duration in seconds to HH:MM:SS
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
