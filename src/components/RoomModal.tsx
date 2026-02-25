// Room Modal Component - 3D-styled modal for room actions
import { useState, useEffect } from 'react';
import { 
  Play, Pause, Square, ClipboardCheck, 
  Wrench, AlertTriangle, Search,
  CheckCircle, Clock, User, Building2, Layers
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useRooms, formatDuration } from '@/hooks/useRooms';
import { createReport } from '@/lib/supabase';
import type { Room, RoomStatus, RoomReport } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// Status workflow definitions
const statusWorkflow: Record<RoomStatus, RoomStatus[]> = {
  'Dirty': ['Check-out Inspected', 'Cleaning', 'Out of Order'],
  'Check-out Inspected': ['Cleaning', 'Out of Order'],
  'Cleaning': ['Vacant Clean', 'Dirty'],
  'Vacant Clean': ['Vacant Clean Inspected', 'Dirty', 'Occupied'],
  'Vacant Clean Inspected': ['Occupied', 'Dirty'],
  'Occupied': ['Dirty', 'Out of Order'],
  'Out of Order': ['Dirty']
};

const statusColors: Record<RoomStatus, string> = {
  'Dirty': 'bg-red-500',
  'Check-out Inspected': 'bg-orange-500',
  'Cleaning': 'bg-blue-500',
  'Vacant Clean': 'bg-green-500',
  'Vacant Clean Inspected': 'bg-emerald-500',
  'Occupied': 'bg-purple-500',
  'Out of Order': 'bg-gray-500'
};

const statusLabels: Record<RoomStatus, string> = {
  'Dirty': 'Dirty - Needs Cleaning',
  'Check-out Inspected': 'Check-out Inspected',
  'Cleaning': 'Cleaning in Progress',
  'Vacant Clean': 'Vacant Clean',
  'Vacant Clean Inspected': 'Vacant Clean Inspected',
  'Occupied': 'Occupied by Guest',
  'Out of Order': 'Out of Order'
};

interface RoomModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RoomModal({ room, isOpen, onClose }: RoomModalProps) {
  const { 
    currentUser, 
    currentRole, 
    timer,
    addNotification 
  } = useAppStore();
  const { 
    changeRoomStatus, 
    startTask, 
    pauseTask, 
    resumeTask, 
    finishTask 
  } = useRooms();

  const [activeTab, setActiveTab] = useState('actions');
  const [reportType, setReportType] = useState<RoomReport['report_type']>('Damage');
  const [reportSeverity, setReportSeverity] = useState<RoomReport['severity']>('Medium');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('actions');
      setReportDescription('');
    }
  }, [isOpen]);

  if (!room) return null;

  const isTimerActive = timer.isRunning && timer.roomNumber === room.room_number;
  const isTimerPaused = !timer.isRunning && timer.currentLogId && timer.roomNumber === room.room_number;
  const hasActiveTask = timer.roomNumber === room.room_number;

  // Handle status change
  const handleStatusChange = async (newStatus: RoomStatus) => {
    await changeRoomStatus(room, newStatus);
    toast.success(`Room ${room.room_number} status updated to ${newStatus}`);
  };

  // Handle task start
  const handleStartTask = async (taskType: 'Cleaning' | 'Inspection' | 'Repair') => {
    await startTask(room, taskType);
    toast.success(`${taskType} started for room ${room.room_number}`);
  };

  // Handle task finish
  const handleFinishTask = async () => {
    await finishTask(room);
    toast.success(`Task completed for room ${room.room_number}`);
  };

  // Handle report submission
  const handleSubmitReport = async () => {
    if (!currentUser || !reportDescription.trim()) return;

    setIsSubmitting(true);
    try {
      await createReport({
        room_number: room.room_number,
        reported_by: currentUser.id,
        reporter_name: currentUser.full_name,
        report_type: reportType,
        description: reportDescription,
        severity: reportSeverity,
        status: 'Open'
      });

      toast.success('Report submitted successfully');
      setReportDescription('');
      addNotification({
        title: 'New Report',
        message: `${reportType} reported for room ${room.room_number}`,
        type: 'warning'
      });
    } catch (error: any) {
      toast.error('Failed to submit report: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get available next statuses
  const availableStatuses = statusWorkflow[room.status] || [];

  // Role-based action visibility
  const canClean = currentRole === 'Housekeeping' && ['Dirty', 'Check-out Inspected'].includes(room.status);
  const canInspect = currentRole === 'Supervisor' && ['Vacant Clean', 'Check-out Inspected'].includes(room.status);
  const canRepair = currentRole === 'Engineering' && room.status === 'Out of Order';
  const canManage = currentRole === 'Manager';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">Room {room.room_number}</span>
              <Badge className={`${statusColors[room.status]} text-white`}>
                {statusLabels[room.status]}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Room Info Header */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">{room.building}</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Floor {room.floor}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">{room.room_type || 'Standard'}</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="actions" className="data-[state=active]:bg-gray-700">Actions</TabsTrigger>
            <TabsTrigger value="status" className="data-[state=active]:bg-gray-700">Status</TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-gray-700">Reports</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-gray-700">History</TabsTrigger>
          </TabsList>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4">
            {/* Timer Display */}
            {hasActiveTask && (
              <div className="p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-sm text-gray-300">{timer.taskType} in Progress</p>
                      <p className="text-2xl font-mono font-bold text-blue-400">
                        {formatDuration(timer.elapsedTime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isTimerActive ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={pauseTask}
                        className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/30"
                      >
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </Button>
                    ) : isTimerPaused ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={resumeTask}
                        className="border-green-600 text-green-400 hover:bg-green-900/30"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Resume
                      </Button>
                    ) : null}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleFinishTask}
                      className="border-red-600 text-red-400 hover:bg-red-900/30"
                    >
                      <Square className="w-4 h-4 mr-1" />
                      Finish
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {canClean && !hasActiveTask && (
                <Button
                  onClick={() => handleStartTask('Cleaning')}
                  className="h-16 bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Cleaning
                </Button>
              )}

              {canInspect && !hasActiveTask && (
                <Button
                  onClick={() => handleStartTask('Inspection')}
                  className="h-16 bg-emerald-600 hover:bg-emerald-700"
                >
                  <ClipboardCheck className="w-5 h-5 mr-2" />
                  Start Inspection
                </Button>
              )}

              {canRepair && !hasActiveTask && (
                <Button
                  onClick={() => handleStartTask('Repair')}
                  className="h-16 bg-orange-600 hover:bg-orange-700"
                >
                  <Wrench className="w-5 h-5 mr-2" />
                  Start Repair
                </Button>
              )}

              {canManage && (
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('status')}
                  className="h-16 border-gray-600"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Change Status
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => setActiveTab('reports')}
                className="h-16 border-gray-600"
              >
                <AlertTriangle className="w-5 h-5 mr-2" />
                Report Issue
              </Button>
            </div>

            {/* Quick Status Change for Manager */}
            {canManage && (
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-sm font-medium text-gray-300 mb-3">Quick Status Change</p>
                <div className="flex flex-wrap gap-2">
                  {availableStatuses.map((status) => (
                    <Button
                      key={status}
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(status)}
                      className="text-xs"
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-4">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-4">Current Status</p>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${statusColors[room.status]} bg-opacity-20 border border-opacity-50`}>
                <div className={`w-3 h-3 rounded-full ${statusColors[room.status]}`} />
                <span className="font-medium">{statusLabels[room.status]}</span>
              </div>
            </div>

            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-4">Available Transitions</p>
              <div className="space-y-2">
                {availableStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className="w-full flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
                      <span>{statusLabels[status]}</span>
                    </div>
                    <CheckCircle className="w-4 h-4 text-gray-500" />
                  </button>
                ))}
              </div>
            </div>

            {room.last_updated && (
              <p className="text-xs text-gray-500 text-center">
                Last updated: {new Date(room.last_updated).toLocaleString()}
              </p>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Report Type</label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as RoomReport['report_type'])}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="Damage">Damage</SelectItem>
                    <SelectItem value="Complaint">Complaint</SelectItem>
                    <SelectItem value="Lost Found">Lost & Found</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Severity</label>
                <Select value={reportSeverity} onValueChange={(v) => setReportSeverity(v as RoomReport['severity'])}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Description</label>
                <Textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Describe the issue..."
                  className="bg-gray-800 border-gray-700 min-h-[100px]"
                />
              </div>

              <Button
                onClick={handleSubmitReport}
                disabled={!reportDescription.trim() || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="p-4 bg-gray-800/50 rounded-lg text-center">
              <Search className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400">History feature coming soon</p>
              <p className="text-sm text-gray-500">View audit logs and past activities for this room</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default RoomModal;
