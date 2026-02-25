// The Batu Hotel & Villas - HMS Type Definitions

// User Roles
export type UserRole = 'Housekeeping' | 'Supervisor' | 'Engineering' | 'Manager';

// Room Status - Strict State Machine
export type RoomStatus = 
  | 'Dirty'           // Initial state after check-out
  | 'Check-out Inspected'
  | 'Cleaning'        // HK started cleaning
  | 'Vacant Clean'    // HK finished cleaning
  | 'Vacant Clean Inspected'
  | 'Occupied'        // Guest checked in
  | 'Out of Order';   // Maintenance closure

// Room Hierarchy Structure
export interface Room {
  id: string;
  room_number: string;
  building: string;
  floor: number;
  status: RoomStatus;
  room_type: string;
  last_updated: string;
  assigned_to?: string;     // Staff ID currently working
  current_task?: string;    // Current task type
  notes?: string;
  is_vip?: boolean;
  guest_name?: string;
}

// Profile (Staff)
export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  email?: string;
  avatar_url?: string;
  created_at?: string;
}

// Checklist Item for Inspections
export interface ChecklistItem {
  id: string;
  item_name: string;
  category: 'Bedroom' | 'Bathroom' | 'Balcony' | 'Minibar' | 'Safety' | 'General';
  weight?: number;
}

// Inspection Checklist Response
export interface ChecklistResponse {
  item_id: string;
  item_name: string;
  passed: boolean;
  notes?: string;
}

// Inspection Record
export interface Inspection {
  id: string;
  room_number: string;
  inspector_id: string;
  inspector_name?: string;
  score: number;           // 1-100
  notes: string;
  checklist_data: ChecklistResponse[];
  created_at: string;
  status_after: RoomStatus;
}

// Work Log for Performance Tracking
export interface WorkLog {
  id: string;
  room_number: string;
  staff_id: string;
  staff_name?: string;
  task_type: 'Cleaning' | 'Inspection' | 'Repair' | 'Maintenance';
  start_time: string;
  pause_time?: string;
  end_time?: string;
  total_duration: number;  // in seconds
  description?: string;
  status: 'In Progress' | 'Paused' | 'Completed';
  created_at: string;
}

// Audit Log for all status changes
export interface AuditLog {
  id: string;
  room_number: string;
  changed_by: string;
  changer_name?: string;
  changer_role?: UserRole;
  from_status: RoomStatus;
  to_status: RoomStatus;
  timestamp: string;
  notes?: string;
}

// Report/Complaint/Lost & Found
export interface RoomReport {
  id: string;
  room_number: string;
  reported_by: string;
  reporter_name?: string;
  report_type: 'Damage' | 'Complaint' | 'Lost Found' | 'Maintenance' | 'Other';
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved';
  assigned_to?: string;
  created_at: string;
  resolved_at?: string;
  photos?: string[];
}

// Staff Performance Metrics
export interface StaffPerformance {
  staff_id: string;
  staff_name: string;
  role: UserRole;
  total_tasks: number;
  completed_tasks: number;
  average_duration: number;    // in minutes
  total_duration: number;      // in minutes
  quality_score: number;       // average inspection score (for HK)
  efficiency_rating: number;   // tasks per hour
  ranking: number;
}

// Analytics Data
export interface AnalyticsData {
  date_range: { start: string; end: string };
  total_rooms: number;
  rooms_by_status: Record<RoomStatus, number>;
  total_cleanings: number;
  total_inspections: number;
  total_repairs: number;
  average_cleaning_time: number;
  average_inspection_score: number;
  staff_performance: StaffPerformance[];
  audit_logs: AuditLog[];
}

// Filter Options
export interface FilterOptions {
  date_from?: string;
  date_to?: string;
  building?: string;
  floor?: number;
  status?: RoomStatus;
  staff_id?: string;
}

// Building Structure for 3D
export interface BuildingStructure {
  name: string;
  floors: number;
  rooms_per_floor: number;
  position: [number, number, number];
  color: string;
}

// 3D Room Cube Data
export interface RoomCubeData {
  room: Room;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

// Timer State for Performance Tracking
export interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsedTime: number;      // in seconds
  currentLogId: string | null;
  roomNumber: string | null;
  taskType: WorkLog['task_type'] | null;
}

// Notification
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  data?: any;
}

// App State
export interface AppState {
  currentUser: Profile | null;
  currentRole: UserRole | null;
  rooms: Room[];
  selectedRoom: Room | null;
  timer: TimerState;
  notifications: Notification[];
  isLoading: boolean;
}
