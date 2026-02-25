// Main App Component - The Batu Hotel & Villas HMS
import { useEffect, useState } from 'react';
import { 
  Building2, User, LogOut, Menu, Bell, 
  ChevronDown 
} from 'lucide-react';
import { useAppStore, startTimerInterval, stopTimerInterval } from '@/store/appStore';
import { Dashboard3D } from '@/components/3d/Dashboard3D';
import { RoomModal } from '@/components/RoomModal';
import { HousekeepingDashboard } from '@/components/dashboards/HousekeepingDashboard';
import { SupervisorDashboard } from '@/components/dashboards/SupervisorDashboard';
import { EngineeringDashboard } from '@/components/dashboards/EngineeringDashboard';
import { ManagerDashboard } from '@/components/dashboards/ManagerDashboard';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { Room, UserRole, Profile } from '@/types';
import './App.css';

// Demo users for testing
const demoUsers: Profile[] = [
  { id: '1', full_name: 'Siti Rahayu', role: 'Housekeeping' },
  { id: '2', full_name: 'Budi Santoso', role: 'Housekeeping' },
  { id: '3', full_name: 'Dewi Kusuma', role: 'Supervisor' },
  { id: '4', full_name: 'Ahmad Wijaya', role: 'Engineering' },
  { id: '5', full_name: 'Maria Gonzalez', role: 'Manager' }
];

// Demo rooms data
const demoRooms: Room[] = [
  // Building A - Floor 1
  { id: '1', room_number: 'A101', building: 'Building A', floor: 1, status: 'Dirty', room_type: 'Deluxe', last_updated: new Date().toISOString() },
  { id: '2', room_number: 'A102', building: 'Building A', floor: 1, status: 'Vacant Clean', room_type: 'Deluxe', last_updated: new Date().toISOString() },
  { id: '3', room_number: 'A103', building: 'Building A', floor: 1, status: 'Occupied', room_type: 'Suite', last_updated: new Date().toISOString(), is_vip: true },
  { id: '4', room_number: 'A104', building: 'Building A', floor: 1, status: 'Cleaning', room_type: 'Standard', last_updated: new Date().toISOString(), assigned_to: '1' },
  { id: '5', room_number: 'A105', building: 'Building A', floor: 1, status: 'Out of Order', room_type: 'Standard', last_updated: new Date().toISOString() },
  
  // Building A - Floor 2
  { id: '6', room_number: 'A201', building: 'Building A', floor: 2, status: 'Vacant Clean Inspected', room_type: 'Deluxe', last_updated: new Date().toISOString() },
  { id: '7', room_number: 'A202', building: 'Building A', floor: 2, status: 'Dirty', room_type: 'Deluxe', last_updated: new Date().toISOString() },
  { id: '8', room_number: 'A203', building: 'Building A', floor: 2, status: 'Occupied', room_type: 'Suite', last_updated: new Date().toISOString() },
  { id: '9', room_number: 'A204', building: 'Building A', floor: 2, status: 'Check-out Inspected', room_type: 'Standard', last_updated: new Date().toISOString() },
  { id: '10', room_number: 'A205', building: 'Building A', floor: 2, status: 'Vacant Clean', room_type: 'Standard', last_updated: new Date().toISOString() },
  
  // Building B - Floor 1
  { id: '11', room_number: 'B101', building: 'Building B', floor: 1, status: 'Occupied', room_type: 'Villa', last_updated: new Date().toISOString(), is_vip: true },
  { id: '12', room_number: 'B102', building: 'Building B', floor: 1, status: 'Dirty', room_type: 'Villa', last_updated: new Date().toISOString() },
  { id: '13', room_number: 'B103', building: 'Building B', floor: 1, status: 'Cleaning', room_type: 'Pool Villa', last_updated: new Date().toISOString(), assigned_to: '2' },
  { id: '14', room_number: 'B104', building: 'Building B', floor: 1, status: 'Vacant Clean', room_type: 'Villa', last_updated: new Date().toISOString() },
  
  // Building B - Floor 2
  { id: '15', room_number: 'B201', building: 'Building B', floor: 2, status: 'Occupied', room_type: 'Villa', last_updated: new Date().toISOString() },
  { id: '16', room_number: 'B202', building: 'Building B', floor: 2, status: 'Dirty', room_type: 'Pool Villa', last_updated: new Date().toISOString() },
  { id: '17', room_number: 'B203', building: 'Building B', floor: 2, status: 'Out of Order', room_type: 'Villa', last_updated: new Date().toISOString() },
  { id: '18', room_number: 'B204', building: 'Building B', floor: 2, status: 'Vacant Clean Inspected', room_type: 'Pool Villa', last_updated: new Date().toISOString() },
];

function App() {
  const { 
    currentUser, 
    setCurrentUser, 
    currentRole, 
    setCurrentRole,
    setRooms,
    notifications,
    markNotificationRead
  } = useAppStore();
  
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | '3d'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize with demo data
  useEffect(() => {
    setRooms(demoRooms);
    startTimerInterval();
    
    return () => {
      stopTimerInterval();
    };
  }, [setRooms]);

  // Handle role selection
  const handleRoleSelect = (user: Profile) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    toast.success(`Logged in as ${user.full_name} (${user.role})`);
  };

  // Handle logout
  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRole(null);
    toast.info('Logged out');
  };

  // Handle room click from 3D view
  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    setIsRoomModalOpen(true);
  };

  // Render role selection screen
  if (!currentUser || !currentRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Toaster position="top-right" theme="dark" />
        <div className="max-w-4xl w-full">
          {/* Logo */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-2xl">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">The Batu Hotel & Villas</h1>
            <p className="text-gray-400">Hotel Management System</p>
          </div>

          {/* Role Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { role: 'Housekeeping' as UserRole, icon: '🧹', color: 'from-blue-500 to-blue-700', desc: 'Room cleaning & maintenance' },
              { role: 'Supervisor' as UserRole, icon: '✓', color: 'from-emerald-500 to-emerald-700', desc: 'Quality inspection & control' },
              { role: 'Engineering' as UserRole, icon: '🔧', color: 'from-orange-500 to-orange-700', desc: 'Repairs & maintenance' },
              { role: 'Manager' as UserRole, icon: '📊', color: 'from-purple-500 to-purple-700', desc: 'Analytics & management' }
            ].map((item) => {
              const users = demoUsers.filter(u => u.role === item.role);
              return (
                <div key={item.role} className="space-y-3">
                  <div className={`p-6 rounded-2xl bg-gradient-to-br ${item.color} text-white`}>
                    <div className="text-4xl mb-3">{item.icon}</div>
                    <h2 className="text-xl font-bold">{item.role}</h2>
                    <p className="text-sm text-white/70">{item.desc}</p>
                  </div>
                  <div className="space-y-2">
                    {users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleRoleSelect(user)}
                        className="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-left transition-colors flex items-center gap-3"
                      >
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.full_name}</p>
                          <p className="text-xs text-gray-400">Click to login</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <p className="text-center text-gray-500 mt-12 text-sm">
            The Batu Hotel & Villas HMS v1.0 • Built with React Three Fiber & Supabase
          </p>
        </div>
      </div>
    );
  }

  // Render main dashboard
  return (
    <div className="min-h-screen bg-gray-950">
      <Toaster position="top-right" theme="dark" />
      
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Left: Logo & Mobile Menu */}
          <div className="flex items-center gap-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-gray-900 border-gray-800 w-64">
                <SheetHeader>
                  <SheetTitle className="text-white flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-blue-500" />
                    The Batu HMS
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-8 space-y-2">
                  <button
                    onClick={() => {
                      setActiveTab('dashboard');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('3d');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      activeTab === '3d' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    3D View
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
            
            <div className="hidden lg:flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white">The Batu HMS</h1>
                <p className="text-xs text-gray-400">Hotel Management System</p>
              </div>
            </div>
          </div>

          {/* Center: Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'dashboard' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('3d')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === '3d' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              3D View
            </button>
          </nav>

          {/* Right: User & Notifications */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-gray-900 border-gray-800">
                <DropdownMenuLabel className="text-white">Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-800" />
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    No notifications
                  </div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <DropdownMenuItem 
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`cursor-pointer ${n.read ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${
                          n.type === 'error' ? 'bg-red-500' :
                          n.type === 'warning' ? 'bg-yellow-500' :
                          n.type === 'success' ? 'bg-green-500' :
                          'bg-blue-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-white">{n.title}</p>
                          <p className="text-xs text-gray-400">{n.message}</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-white">{currentUser.full_name}</p>
                    <p className="text-xs text-gray-400">{currentRole}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                <DropdownMenuLabel className="text-white">
                  {currentUser.full_name}
                  <p className="text-xs text-gray-400 font-normal">{currentRole}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-800" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {activeTab === 'dashboard' ? (
          <div className="animate-in fade-in duration-300">
            {currentRole === 'Housekeeping' && <HousekeepingDashboard />}
            {currentRole === 'Supervisor' && <SupervisorDashboard />}
            {currentRole === 'Engineering' && <EngineeringDashboard />}
            {currentRole === 'Manager' && <ManagerDashboard />}
          </div>
        ) : (
          <div className="h-[calc(100vh-64px)] animate-in fade-in duration-300">
            <Dashboard3D 
              onRoomClick={handleRoomClick}
              height="100%"
            />
          </div>
        )}
      </main>

      {/* Room Modal */}
      <RoomModal
        room={selectedRoom}
        isOpen={isRoomModalOpen}
        onClose={() => {
          setIsRoomModalOpen(false);
          setSelectedRoom(null);
        }}
      />
    </div>
  );
}

export default App;
