// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';
import type { 
  Room, Profile, WorkLog, Inspection, ChecklistItem, 
  AuditLog, RoomReport, RoomStatus 
} from '@/types';

// These would typically come from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database helper functions

// Rooms
export async function fetchRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('building', { ascending: true })
    .order('floor', { ascending: true })
    .order('room_number', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function updateRoomStatus(
  roomId: string, 
  status: RoomStatus, 
  assignedTo?: string
): Promise<void> {
  const updates: any = { 
    status, 
    last_updated: new Date().toISOString() 
  };
  if (assignedTo) updates.assigned_to = assignedTo;
  
  const { error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', roomId);
  
  if (error) throw error;
}

export async function fetchRoomById(roomId: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  
  if (error) throw error;
  return data;
}

// Profiles
export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function fetchProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

// Work Logs (Performance Tracking)
export async function createWorkLog(
  roomNumber: string, 
  staffId: string, 
  taskType: WorkLog['task_type'],
  description?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('work_logs')
    .insert({
      room_number: roomNumber,
      staff_id: staffId,
      task_type: taskType,
      start_time: new Date().toISOString(),
      status: 'In Progress',
      description
    })
    .select('id')
    .single();
  
  if (error) throw error;
  return data.id;
}

export async function pauseWorkLog(logId: string, elapsedSeconds: number): Promise<void> {
  const { error } = await supabase
    .from('work_logs')
    .update({
      pause_time: new Date().toISOString(),
      total_duration: elapsedSeconds,
      status: 'Paused'
    })
    .eq('id', logId);
  
  if (error) throw error;
}

export async function resumeWorkLog(logId: string): Promise<void> {
  const { error } = await supabase
    .from('work_logs')
    .update({
      pause_time: null,
      status: 'In Progress'
    })
    .eq('id', logId);
  
  if (error) throw error;
}

export async function finishWorkLog(logId: string, totalSeconds: number): Promise<void> {
  const { error } = await supabase
    .from('work_logs')
    .update({
      end_time: new Date().toISOString(),
      total_duration: totalSeconds,
      status: 'Completed'
    })
    .eq('id', logId);
  
  if (error) throw error;
}

export async function fetchWorkLogs(filters?: {
  staff_id?: string;
  date_from?: string;
  date_to?: string;
  task_type?: string;
}): Promise<WorkLog[]> {
  let query = supabase
    .from('work_logs')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (filters?.staff_id) query = query.eq('staff_id', filters.staff_id);
  if (filters?.date_from) query = query.gte('start_time', filters.date_from);
  if (filters?.date_to) query = query.lte('start_time', filters.date_to);
  if (filters?.task_type) query = query.eq('task_type', filters.task_type);
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Inspections
export async function createInspection(inspection: Omit<Inspection, 'id' | 'created_at'>): Promise<void> {
  const { error } = await supabase
    .from('inspections')
    .insert({
      ...inspection,
      created_at: new Date().toISOString()
    });
  
  if (error) throw error;
}

export async function fetchInspections(filters?: {
  room_number?: string;
  inspector_id?: string;
  date_from?: string;
  date_to?: string;
}): Promise<Inspection[]> {
  let query = supabase
    .from('inspections')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (filters?.room_number) query = query.eq('room_number', filters.room_number);
  if (filters?.inspector_id) query = query.eq('inspector_id', filters.inspector_id);
  if (filters?.date_from) query = query.gte('created_at', filters.date_from);
  if (filters?.date_to) query = query.lte('created_at', filters.date_to);
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Checklist Items
export async function fetchChecklistItems(): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .order('category', { ascending: true })
    .order('item_name', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function createChecklistItem(item: Omit<ChecklistItem, 'id'>): Promise<void> {
  const { error } = await supabase
    .from('checklist_items')
    .insert(item);
  
  if (error) throw error;
}

export async function updateChecklistItem(id: string, updates: Partial<ChecklistItem>): Promise<void> {
  const { error } = await supabase
    .from('checklist_items')
    .update(updates)
    .eq('id', id);
  
  if (error) throw error;
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('checklist_items')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Audit Logs
export async function createAuditLog(log: Omit<AuditLog, 'id'>): Promise<void> {
  const { error } = await supabase
    .from('audit_logs')
    .insert(log);
  
  if (error) throw error;
}

export async function fetchAuditLogs(filters?: {
  date_from?: string;
  date_to?: string;
  room_number?: string;
  changed_by?: string;
}): Promise<AuditLog[]> {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false });
  
  if (filters?.date_from) query = query.gte('timestamp', filters.date_from);
  if (filters?.date_to) query = query.lte('timestamp', filters.date_to);
  if (filters?.room_number) query = query.eq('room_number', filters.room_number);
  if (filters?.changed_by) query = query.eq('changed_by', filters.changed_by);
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Room Reports
export async function createReport(report: Omit<RoomReport, 'id' | 'created_at'>): Promise<void> {
  const { error } = await supabase
    .from('room_reports')
    .insert({
      ...report,
      created_at: new Date().toISOString()
    });
  
  if (error) throw error;
}

export async function fetchReports(filters?: {
  room_number?: string;
  status?: string;
  report_type?: string;
}): Promise<RoomReport[]> {
  let query = supabase
    .from('room_reports')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (filters?.room_number) query = query.eq('room_number', filters.room_number);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.report_type) query = query.eq('report_type', filters.report_type);
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function updateReportStatus(
  reportId: string, 
  status: RoomReport['status'],
  assignedTo?: string
): Promise<void> {
  const updates: any = { status };
  if (assignedTo) updates.assigned_to = assignedTo;
  if (status === 'Resolved') updates.resolved_at = new Date().toISOString();
  
  const { error } = await supabase
    .from('room_reports')
    .update(updates)
    .eq('id', reportId);
  
  if (error) throw error;
}

// Real-time subscriptions
export function subscribeToRooms(callback: (payload: any) => void) {
  return supabase
    .channel('rooms_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rooms' },
      callback
    )
    .subscribe();
}

export function subscribeToWorkLogs(callback: (payload: any) => void) {
  return supabase
    .channel('work_logs_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'work_logs' },
      callback
    )
    .subscribe();
}
