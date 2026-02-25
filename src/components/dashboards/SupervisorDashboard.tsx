// Supervisor Dashboard - For inspection and quality control
import { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Search, CheckCircle, 
  XCircle, Clock
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useRooms, formatDuration } from '@/hooks/useRooms';
import { RoomModal } from '@/components/RoomModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Room, ChecklistItem, ChecklistResponse } from '@/types';
import { fetchChecklistItems, createInspection } from '@/lib/supabase';

export function SupervisorDashboard() {
  const { currentUser, timer } = useAppStore();
  const { getRoomsByStatus, startTask, finishTask } = useRooms();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'vacant-clean' | 'checkout-inspected'>('all');
  
  // Inspection state
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistResponses, setChecklistResponses] = useState<ChecklistResponse[]>([]);
  const [inspectionScore, setInspectionScore] = useState(100);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load checklist items
  useEffect(() => {
    if (isInspectionOpen) {
      loadChecklistItems();
    }
  }, [isInspectionOpen]);

  const loadChecklistItems = async () => {
    try {
      const items = await fetchChecklistItems();
      setChecklistItems(items);
      // Initialize responses
      setChecklistResponses(items.map(item => ({
        item_id: item.id,
        item_name: item.item_name,
        passed: true
      })));
    } catch (error) {
      toast.error('Failed to load checklist');
    }
  };

  // Get rooms by status
  const vacantCleanRooms = getRoomsByStatus('Vacant Clean');
  const checkoutInspectedRooms = getRoomsByStatus('Check-out Inspected');
  const vacantCleanInspectedRooms = getRoomsByStatus('Vacant Clean Inspected');

  // Filter rooms
  const getFilteredRooms = () => {
    switch (filter) {
      case 'vacant-clean':
        return vacantCleanRooms;
      case 'checkout-inspected':
        return checkoutInspectedRooms;
      default:
        return [...vacantCleanRooms, ...checkoutInspectedRooms];
    }
  };

  const filteredRooms = getFilteredRooms();

  // Handle room click
  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    setIsModalOpen(true);
  };

  // Start inspection
  const handleStartInspection = async (room: Room) => {
    setSelectedRoom(room);
    await startTask(room, 'Inspection');
    setIsInspectionOpen(true);
    toast.success(`Inspection started for room ${room.room_number}`);
  };

  // Toggle checklist item
  const toggleChecklistItem = (itemId: string, passed: boolean) => {
    setChecklistResponses(prev => 
      prev.map(r => r.item_id === itemId ? { ...r, passed } : r)
    );
    
    // Recalculate score
    const passedCount = checklistResponses.filter(r => 
      r.item_id === itemId ? passed : r.passed
    ).length;
    const newScore = Math.round((passedCount / checklistItems.length) * 100);
    setInspectionScore(newScore);
  };

  // Submit inspection
  const handleSubmitInspection = async () => {
    if (!selectedRoom || !currentUser) return;

    setIsSubmitting(true);
    try {
      await createInspection({
        room_number: selectedRoom.room_number,
        inspector_id: currentUser.id,
        inspector_name: currentUser.full_name,
        score: inspectionScore,
        notes: inspectionNotes,
        checklist_data: checklistResponses,
        status_after: inspectionScore >= 80 ? 'Vacant Clean Inspected' : 'Dirty'
      });

      // Finish the inspection task
      await finishTask(
        selectedRoom, 
        inspectionScore >= 80 ? 'Vacant Clean Inspected' : 'Dirty'
      );

      toast.success(`Inspection completed. Score: ${inspectionScore}`);
      setIsInspectionOpen(false);
      setInspectionNotes('');
      setInspectionScore(100);
    } catch (error: any) {
      toast.error('Failed to submit inspection: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group checklist items by category
  const groupedChecklist = checklistItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Supervisor Dashboard</h1>
          <p className="text-gray-400">Quality Control & Inspections</p>
        </div>
        <div className="flex items-center gap-4">
          {timer.isRunning && timer.taskType === 'Inspection' && (
            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-900/50 rounded-lg border border-emerald-700">
              <Clock className="w-5 h-5 text-emerald-400 animate-pulse" />
              <div>
                <p className="text-xs text-emerald-300">Inspection in Progress</p>
                <p className="text-lg font-mono font-bold text-emerald-400">
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
            <CardTitle className="text-sm text-gray-400">Pending Inspection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-400">{vacantCleanRooms.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Check-out Inspected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-400">{checkoutInspectedRooms.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Approved Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-400">{vacantCleanInspectedRooms.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Avg Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-400">94%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'All Pending', count: vacantCleanRooms.length + checkoutInspectedRooms.length },
          { key: 'vacant-clean', label: 'Vacant Clean', count: vacantCleanRooms.length },
          { key: 'checkout-inspected', label: 'Check-out Inspected', count: checkoutInspectedRooms.length }
        ].map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.key as any)}
            className={filter === f.key ? 'bg-emerald-600' : 'border-gray-600'}
          >
            {f.label}
            <Badge variant="secondary" className="ml-2">{f.count}</Badge>
          </Button>
        ))}
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredRooms.map((room) => (
          <Card 
            key={room.id} 
            className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-all"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-lg font-bold text-white">{room.room_number}</p>
                  <p className="text-xs text-gray-400">{room.building} - Floor {room.floor}</p>
                </div>
                <Badge 
                  className={
                    room.status === 'Vacant Clean' ? 'bg-green-500' :
                    room.status === 'Check-out Inspected' ? 'bg-orange-500' :
                    'bg-emerald-500'
                  }
                >
                  {room.status === 'Vacant Clean' ? 'Ready' : 'Inspected'}
                </Badge>
              </div>

              <div className="space-y-2">
                <Button
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleStartInspection(room)}
                  disabled={timer.isRunning}
                >
                  <ClipboardCheck className="w-4 h-4 mr-1" />
                  Inspect
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-gray-600"
                  onClick={() => handleRoomClick(room)}
                >
                  <Search className="w-4 h-4 mr-1" />
                  Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
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

      {/* Inspection Dialog */}
      <Dialog open={isInspectionOpen} onOpenChange={setIsInspectionOpen}>
        <DialogContent className="max-w-3xl bg-gray-900 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="w-6 h-6 text-emerald-400" />
                <span>Room Inspection - {selectedRoom?.room_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Score:</span>
                <span className={`text-2xl font-bold ${
                  inspectionScore >= 90 ? 'text-green-400' :
                  inspectionScore >= 80 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {inspectionScore}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Checklist */}
          <div className="space-y-6">
            {Object.entries(groupedChecklist).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-300 border-b border-gray-700 pb-2">
                  {category}
                </h3>
                <div className="space-y-2">
                  {items.map((item) => {
                    const response = checklistResponses.find(r => r.item_id === item.id);
                    return (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                      >
                        <span className="text-sm">{item.item_name}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleChecklistItem(item.id, true)}
                            className={`p-2 rounded ${
                              response?.passed 
                                ? 'bg-green-600 text-white' 
                                : 'bg-gray-700 text-gray-400'
                            }`}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleChecklistItem(item.id, false)}
                            className={`p-2 rounded ${
                              !response?.passed 
                                ? 'bg-red-600 text-white' 
                                : 'bg-gray-700 text-gray-400'
                            }`}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Notes */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Inspection Notes</label>
              <Textarea
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                placeholder="Add any notes or observations..."
                className="bg-gray-800 border-gray-700 min-h-[100px]"
              />
            </div>

            {/* Score Slider */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Override Score (if needed)</label>
              <Slider
                value={[inspectionScore]}
                onValueChange={([v]) => setInspectionScore(v)}
                min={0}
                max={100}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsInspectionOpen(false)}
                className="flex-1 border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitInspection}
                disabled={isSubmitting}
                className={`flex-1 ${
                  inspectionScore >= 80 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isSubmitting ? 'Submitting...' : `Submit (${inspectionScore >= 80 ? 'Pass' : 'Fail'})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SupervisorDashboard;
