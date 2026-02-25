// Manager Dashboard - Analytics, Staff Performance, and Management
import { useState, useEffect } from 'react';
import { 
  BarChart3, Users, Filter,
  Award, Building2, Search
} from 'lucide-react';
import { useRooms } from '@/hooks/useRooms';
import { fetchWorkLogs, fetchInspections, fetchAuditLogs, fetchProfiles } from '@/lib/supabase';
import { Dashboard3D } from '@/components/3d/Dashboard3D';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { toast } from 'sonner';
import type { WorkLog, Inspection, AuditLog, Profile, RoomStatus } from '@/types';

// Status colors for charts
const statusColors: Record<RoomStatus, string> = {
  'Dirty': '#ef4444',
  'Check-out Inspected': '#f97316',
  'Cleaning': '#3b82f6',
  'Vacant Clean': '#22c55e',
  'Vacant Clean Inspected': '#10b981',
  'Occupied': '#8b5cf6',
  'Out of Order': '#6b7280'
};

export function ManagerDashboard() {
  const { rooms } = useRooms();
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [activeView, setActiveView] = useState<'overview' | '3d' | 'staff' | 'audit'>('overview');

  // Load data
  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    try {
      const [logs, inspects, audits, profiles] = await Promise.all([
        fetchWorkLogs({
          date_from: dateRange.from || undefined,
          date_to: dateRange.to || undefined
        }),
        fetchInspections({
          date_from: dateRange.from || undefined,
          date_to: dateRange.to || undefined
        }),
        fetchAuditLogs({
          date_from: dateRange.from || undefined,
          date_to: dateRange.to || undefined
        }),
        fetchProfiles()
      ]);

      setWorkLogs(logs);
      setInspections(inspects);
      setAuditLogs(audits);
      setStaff(profiles);
    } catch (error) {
      toast.error('Failed to load analytics data');
    }
  };

  // Calculate statistics
  const stats = {
    totalRooms: rooms.length,
    roomsByStatus: rooms.reduce((acc, room) => {
      acc[room.status] = (acc[room.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    totalCleanings: workLogs.filter(l => l.task_type === 'Cleaning' && l.status === 'Completed').length,
    totalInspections: inspections.length,
    averageInspectionScore: inspections.length > 0
      ? Math.round(inspections.reduce((sum, i) => sum + i.score, 0) / inspections.length)
      : 0,
    averageCleaningTime: workLogs.filter(l => l.task_type === 'Cleaning' && l.status === 'Completed').length > 0
      ? Math.round(workLogs
          .filter(l => l.task_type === 'Cleaning' && l.status === 'Completed')
          .reduce((sum, l) => sum + l.total_duration, 0) / 
          workLogs.filter(l => l.task_type === 'Cleaning' && l.status === 'Completed').length / 60)
      : 0
  };

  // Staff performance data
  const staffPerformance = staff.map(s => {
    const staffLogs = workLogs.filter(l => l.staff_id === s.id && l.status === 'Completed');
    const staffInspections = inspections.filter(i => i.inspector_id === s.id);
    
    const totalDuration = staffLogs.reduce((sum, l) => sum + l.total_duration, 0);
    const avgDuration = staffLogs.length > 0 ? Math.round(totalDuration / staffLogs.length / 60) : 0;
    const avgScore = staffInspections.length > 0
      ? Math.round(staffInspections.reduce((sum, i) => sum + i.score, 0) / staffInspections.length)
      : 0;

    return {
      ...s,
      totalTasks: staffLogs.length,
      avgDuration,
      avgScore,
      totalHours: Math.round(totalDuration / 3600 * 10) / 10
    };
  }).sort((a, b) => b.totalTasks - a.totalTasks);

  // Chart data
  const statusChartData = Object.entries(stats.roomsByStatus).map(([status, count]) => ({
    name: status,
    value: count,
    color: statusColors[status as RoomStatus] || '#6b7280'
  }));

  const dailyCleaningData = workLogs
    .filter(l => l.task_type === 'Cleaning' && l.status === 'Completed')
    .reduce((acc, log) => {
      const date = new Date(log.start_time).toLocaleDateString('en-US', { weekday: 'short' });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const cleaningChartData = Object.entries(dailyCleaningData).map(([day, count]) => ({
    day,
    cleanings: count
  }));

  // Top performers
  const topHousekeepers = staffPerformance
    .filter(s => s.role === 'Housekeeping')
    .slice(0, 5);

  const topSupervisors = staffPerformance
    .filter(s => s.role === 'Supervisor')
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Manager Dashboard</h1>
          <p className="text-gray-400">Analytics & Performance Management</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="w-40 bg-gray-800 border-gray-700"
            />
            <span className="text-gray-400">to</span>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="w-40 bg-gray-800 border-gray-700"
            />
          </div>
          <Button variant="outline" onClick={loadData} className="border-gray-600">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: '3d', label: '3D View', icon: Building2 },
          { key: 'staff', label: 'Staff Performance', icon: Users },
          { key: 'audit', label: 'Audit Logs', icon: Search }
        ].map((v) => (
          <Button
            key={v.key}
            variant={activeView === v.key ? 'default' : 'outline'}
            onClick={() => setActiveView(v.key as any)}
            className={activeView === v.key ? 'bg-purple-600' : 'border-gray-600'}
          >
            <v.icon className="w-4 h-4 mr-2" />
            {v.label}
          </Button>
        ))}
      </div>

      {/* Overview View */}
      {activeView === 'overview' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-4">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Total Rooms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white">{stats.totalRooms}</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Cleanings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-400">{stats.totalCleanings}</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Inspections</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-400">{stats.totalInspections}</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Avg Score</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-400">{stats.averageInspectionScore}%</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Avg Clean Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-400">{stats.averageCleaningTime}m</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6">
            {/* Room Status Distribution */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Room Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {statusChartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-gray-400">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Cleanings */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Daily Cleaning Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={cleaningChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="cleanings" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  Top Housekeepers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topHousekeepers.map((hk, index) => (
                    <div 
                      key={hk.id} 
                      className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-white">{hk.full_name}</p>
                          <p className="text-xs text-gray-400">{hk.totalTasks} tasks • {hk.avgDuration}m avg</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-400">{hk.totalHours}h</p>
                        <p className="text-xs text-gray-400">total time</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-400" />
                  Top Supervisors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topSupervisors.map((spv, index) => (
                    <div 
                      key={spv.id} 
                      className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-white">{spv.full_name}</p>
                          <p className="text-xs text-gray-400">{spv.totalTasks} inspections</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-400">{spv.avgScore}%</p>
                        <p className="text-xs text-gray-400">avg score</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* 3D View */}
      {activeView === '3d' && (
        <div className="h-[calc(100vh-200px)]">
          <Dashboard3D height="100%" />
        </div>
      )}

      {/* Staff Performance View */}
      {activeView === 'staff' && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Staff Performance Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Name</TableHead>
                  <TableHead className="text-gray-400">Role</TableHead>
                  <TableHead className="text-gray-400">Tasks Completed</TableHead>
                  <TableHead className="text-gray-400">Avg Duration</TableHead>
                  <TableHead className="text-gray-400">Total Hours</TableHead>
                  <TableHead className="text-gray-400">Quality Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffPerformance.map((s) => (
                  <TableRow key={s.id} className="border-gray-700">
                    <TableCell className="font-medium text-white">{s.full_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-gray-400">
                        {s.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-blue-400">{s.totalTasks}</TableCell>
                    <TableCell className="text-gray-300">{s.avgDuration}m</TableCell>
                    <TableCell className="text-gray-300">{s.totalHours}h</TableCell>
                    <TableCell>
                      {s.avgScore > 0 ? (
                        <span className={`font-bold ${
                          s.avgScore >= 90 ? 'text-green-400' :
                          s.avgScore >= 80 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {s.avgScore}%
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Audit Logs View */}
      {activeView === 'audit' && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">Time</TableHead>
                    <TableHead className="text-gray-400">Room</TableHead>
                    <TableHead className="text-gray-400">User</TableHead>
                    <TableHead className="text-gray-400">Change</TableHead>
                    <TableHead className="text-gray-400">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.slice(0, 50).map((log) => (
                    <TableRow key={log.id} className="border-gray-700">
                      <TableCell className="text-gray-300 text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium text-white">{log.room_number}</TableCell>
                      <TableCell className="text-gray-300">
                        {log.changer_name} ({log.changer_role})
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className="text-xs" style={{ 
                            backgroundColor: statusColors[log.from_status] + '40',
                            color: statusColors[log.from_status]
                          }}>
                            {log.from_status}
                          </Badge>
                          <span className="text-gray-500">→</span>
                          <Badge className="text-xs" style={{ 
                            backgroundColor: statusColors[log.to_status] + '40',
                            color: statusColors[log.to_status]
                          }}>
                            {log.to_status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">{log.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ManagerDashboard;
