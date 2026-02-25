// Engineering Dashboard - For maintenance and repairs
import { useState, useEffect } from 'react';
import { 
  Wrench, CheckCircle, Clock, Play, 
  Pause, RefreshCw
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useRooms, formatDuration } from '@/hooks/useRooms';
import { fetchReports, updateReportStatus } from '@/lib/supabase';
import { RoomModal } from '@/components/RoomModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { Room, RoomReport } from '@/types';

export function EngineeringDashboard() {
  const { currentUser, timer } = useAppStore();
  const { rooms, getRoomsByStatus, startTask, pauseTask, resumeTask, finishTask } = useRooms();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reports, setReports] = useState<RoomReport[]>([]);
  const [filter, setFilter] = useState<'all' | 'ooo' | 'reports' | 'my-tasks'>('all');
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Load reports
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoadingReports(true);
    try {
      const data = await fetchReports({ status: 'Open' });
      setReports(data);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Get rooms by status
  const oooRooms = getRoomsByStatus('Out of Order');
  const myTasks = rooms.filter(r => 
    r.assigned_to === currentUser?.id && r.status === 'Out of Order'
  );

  // Filter items
  const getFilteredItems = () => {
    switch (filter) {
      case 'ooo':
        return { rooms: oooRooms, reports: [] };
      case 'reports':
        return { rooms: [], reports };
      case 'my-tasks':
        return { rooms: myTasks, reports: [] };
      default:
        return { rooms: oooRooms, reports };
    }
  };

  const { rooms: filteredRooms, reports: filteredReports } = getFilteredItems();

  // Start repair
  const handleStartRepair = async (room: Room) => {
    await startTask(room, 'Repair');
    toast.success(`Repair started for room ${room.room_number}`);
  };

  // Finish repair
  const handleFinishRepair = async (room: Room) => {
    await finishTask(room, 'Dirty');
    toast.success(`Repair completed for room ${room.room_number}`);
  };

  // Claim report
  const handleClaimReport = async (report: RoomReport) => {
    try {
      await updateReportStatus(report.id, 'In Progress', currentUser?.id);
      toast.success('Report claimed');
      loadReports();
    } catch (error) {
      toast.error('Failed to claim report');
    }
  };

  // Resolve report
  const handleResolveReport = async (report: RoomReport) => {
    try {
      await updateReportStatus(report.id, 'Resolved');
      toast.success('Report resolved');
      loadReports();
    } catch (error) {
      toast.error('Failed to resolve report');
    }
  };

  const severityColors = {
    'Low': 'bg-blue-500',
    'Medium': 'bg-yellow-500',
    'High': 'bg-orange-500',
    'Critical': 'bg-red-500'
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Engineering Dashboard</h1>
          <p className="text-gray-400">Maintenance & Repairs</p>
        </div>
        <div className="flex items-center gap-4">
          {timer.isRunning && timer.taskType === 'Repair' && (
            <div className="flex items-center gap-3 px-4 py-2 bg-orange-900/50 rounded-lg border border-orange-700">
              <Clock className="w-5 h-5 text-orange-400 animate-pulse" />
              <div>
                <p className="text-xs text-orange-300">Repair in Progress</p>
                <p className="text-lg font-mono font-bold text-orange-400">
                  {formatDuration(timer.elapsedTime)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Out of Order</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-400">{oooRooms.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Open Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-400">{reports.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">My Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">{myTasks.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-400">
              {reports.filter(r => r.severity === 'Critical').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'All', count: oooRooms.length + reports.length },
          { key: 'ooo', label: 'Out of Order', count: oooRooms.length },
          { key: 'reports', label: 'Reports', count: reports.length },
          { key: 'my-tasks', label: 'My Tasks', count: myTasks.length }
        ].map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.key as any)}
            className={filter === f.key ? 'bg-orange-600' : 'border-gray-600'}
          >
            {f.label}
            <Badge variant="secondary" className="ml-2">{f.count}</Badge>
          </Button>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rooms Section */}
        {(filter === 'all' || filter === 'ooo' || filter === 'my-tasks') && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Rooms Requiring Maintenance</h2>
            <div className="grid grid-cols-2 gap-4">
              {filteredRooms.map((room) => {
                const isMyTask = room.assigned_to === currentUser?.id;
                const isActive = timer.roomNumber === room.room_number && timer.isRunning;

                return (
                  <Card 
                    key={room.id} 
                    className={`bg-gray-800 border-gray-700 ${
                      isActive ? 'ring-2 ring-orange-500' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-lg font-bold text-white">{room.room_number}</p>
                          <p className="text-xs text-gray-400">{room.building} - Floor {room.floor}</p>
                        </div>
                        <Badge className="bg-gray-500">OOO</Badge>
                      </div>

                      {isMyTask ? (
                        <div className="flex gap-2">
                          {isActive ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-yellow-600 text-yellow-400"
                              onClick={pauseTask}
                            >
                              <Pause className="w-4 h-4 mr-1" />
                              Pause
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-green-600 text-green-400"
                              onClick={resumeTask}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Resume
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-red-600 text-red-400"
                            onClick={() => handleFinishRepair(room)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Done
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full bg-orange-600 hover:bg-orange-700"
                          onClick={() => handleStartRepair(room)}
                          disabled={timer.isRunning}
                        >
                          <Wrench className="w-4 h-4 mr-1" />
                          Start Repair
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Reports Section */}
        {(filter === 'all' || filter === 'reports') && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Maintenance Reports</h2>
            <div className="space-y-3">
              {isLoadingReports ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                  <p>No open reports</p>
                </div>
              ) : (
                filteredReports.map((report) => (
                  <Card key={report.id} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={severityColors[report.severity]}>
                              {report.severity}
                            </Badge>
                            <Badge variant="outline" className="text-gray-400">
                              {report.report_type}
                            </Badge>
                          </div>
                          <p className="font-semibold text-white">Room {report.room_number}</p>
                          <p className="text-sm text-gray-400 mt-1">{report.description}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Reported by {report.reporter_name} • {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {report.status === 'Open' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleClaimReport(report)}
                              className="border-blue-600 text-blue-400"
                            >
                              Claim
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolveReport(report)}
                              className="border-green-600 text-green-400"
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Room Modal */}
      <RoomModal
        room={selectedRoom}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRoom(null);
        }}
      />
    </div>
  );
}

export default EngineeringDashboard;
