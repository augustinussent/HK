// Housekeeping Dashboard - For cleaning staff
import { useState } from 'react';
import { 
  Play, Pause, Square, CheckCircle, Clock, 
  RefreshCw, AlertCircle 
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useRooms, formatDuration } from '@/hooks/useRooms';
import { RoomModal } from '@/components/RoomModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { Room } from '@/types';

export function HousekeepingDashboard() {
  const { currentUser, timer } = useAppStore();
  const { rooms, isLoading, getRoomsByStatus, startTask, pauseTask, resumeTask, finishTask } = useRooms();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'dirty' | 'cleaning' | 'my-tasks'>('all');

  // Get rooms by status
  const dirtyRooms = getRoomsByStatus('Dirty');
  const cleaningRooms = getRoomsByStatus('Cleaning');
  const vacantCleanRooms = getRoomsByStatus('Vacant Clean');

  // Get my active tasks
  const myTasks = rooms.filter(r => 
    r.assigned_to === currentUser?.id && 
    (r.status === 'Cleaning' || r.status === 'Check-out Inspected')
  );

  // Filter rooms
  const getFilteredRooms = () => {
    switch (filter) {
      case 'dirty':
        return dirtyRooms;
      case 'cleaning':
        return cleaningRooms;
      case 'my-tasks':
        return myTasks;
      default:
        return [...dirtyRooms, ...cleaningRooms, ...vacantCleanRooms];
    }
  };

  const filteredRooms = getFilteredRooms();

  // Handle room click
  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    setIsModalOpen(true);
  };

  // Quick start cleaning
  const handleQuickStart = async (room: Room) => {
    await startTask(room, 'Cleaning');
    toast.success(`Started cleaning room ${room.room_number}`);
  };

  // Quick finish cleaning
  const handleQuickFinish = async (room: Room) => {
    await finishTask(room);
    toast.success(`Finished cleaning room ${room.room_number}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Housekeeping Dashboard</h1>
          <p className="text-gray-400">Welcome back, {currentUser?.full_name}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Active Timer Display */}
          {timer.isRunning && (
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-900/50 rounded-lg border border-blue-700">
              <Clock className="w-5 h-5 text-blue-400 animate-pulse" />
              <div>
                <p className="text-xs text-blue-300">Active Task</p>
                <p className="text-lg font-mono font-bold text-blue-400">
                  {formatDuration(timer.elapsedTime)}
                </p>
              </div>
              <div className="flex gap-1 ml-2">
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={pauseTask}
                  className="h-8 w-8 p-0"
                >
                  <Pause className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => timer.roomNumber && handleQuickFinish(rooms.find(r => r.room_number === timer.roomNumber)!)}
                  className="h-8 w-8 p-0 text-red-400"
                >
                  <Square className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Dirty Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-400">{dirtyRooms.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">{cleaningRooms.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Vacant Clean</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-400">{vacantCleanRooms.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">My Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-400">{myTasks.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'All Rooms', count: dirtyRooms.length + cleaningRooms.length + vacantCleanRooms.length },
          { key: 'dirty', label: 'Dirty', count: dirtyRooms.length },
          { key: 'cleaning', label: 'In Progress', count: cleaningRooms.length },
          { key: 'my-tasks', label: 'My Tasks', count: myTasks.length }
        ].map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.key as any)}
            className={filter === f.key ? 'bg-blue-600' : 'border-gray-600'}
          >
            {f.label}
            <Badge variant="secondary" className="ml-2">{f.count}</Badge>
          </Button>
        ))}
      </div>

      {/* Rooms Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <CheckCircle className="w-12 h-12 mb-4" />
          <p>No rooms to display</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredRooms.map((room) => {
            const isMyTask = room.assigned_to === currentUser?.id;
            const isActive = timer.roomNumber === room.room_number && timer.isRunning;

            return (
              <Card 
                key={room.id} 
                className={`bg-gray-800 border-gray-700 hover:border-gray-600 transition-all cursor-pointer ${
                  isActive ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleRoomClick(room)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-lg font-bold text-white">{room.room_number}</p>
                      <p className="text-xs text-gray-400">{room.building} - Floor {room.floor}</p>
                    </div>
                    <Badge 
                      className={
                        room.status === 'Dirty' ? 'bg-red-500' :
                        room.status === 'Cleaning' ? 'bg-blue-500' :
                        'bg-green-500'
                      }
                    >
                      {room.status === 'Dirty' ? 'Dirty' : 
                       room.status === 'Cleaning' ? 'Cleaning' : 'Clean'}
                    </Badge>
                  </div>

                  {room.status === 'Dirty' && (
                    <Button
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickStart(room);
                      }}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start
                    </Button>
                  )}

                  {room.status === 'Cleaning' && isMyTask && (
                    <div className="flex gap-2">
                      {isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-yellow-600 text-yellow-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            pauseTask();
                          }}
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-green-600 text-green-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            resumeTask();
                          }}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Resume
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-600 text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickFinish(room);
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Finish
                      </Button>
                    </div>
                  )}

                  {room.is_vip && (
                    <div className="mt-2 flex items-center gap-1 text-yellow-400 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      <span>VIP Room</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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

export default HousekeepingDashboard;
