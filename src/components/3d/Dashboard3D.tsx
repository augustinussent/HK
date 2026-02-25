// Main 3D Dashboard Component - React Three Fiber Scene
import { useRef, useState, useEffect, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Environment,
  Stars,
  Grid,
  Text,
  Html,
  useProgress
} from '@react-three/drei';
import * as THREE from 'three';
import { Building3D, RoomCube, FloorPlatform } from './RoomCube';
import { useAppStore, startTimerInterval, stopTimerInterval } from '@/store/appStore';
import { useRooms } from '@/hooks/useRooms';
import type { Room, RoomStatus } from '@/types';

// Loading component
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-white text-lg">Loading 3D Dashboard... {progress.toFixed(0)}%</p>
      </div>
    </Html>
  );
}

// Camera controller with smooth transitions
function CameraController({ target }: { target: [number, number, number] }) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(...target));
  
  useFrame(() => {
    targetRef.current.lerp(new THREE.Vector3(...target), 0.05);
    camera.lookAt(targetRef.current);
  });

  return null;
}

// Ambient lighting setup
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight 
        position={[-10, 10, -10]} 
        intensity={0.5}
        color="#4b5563"
      />
      <pointLight position={[0, 10, 0]} intensity={0.3} color="#3b82f6" />
    </>
  );
}

// Status legend in 3D space
function StatusLegend({ position }: { position: [number, number, number] }) {
  const statuses: RoomStatus[] = [
    'Dirty',
    'Check-out Inspected',
    'Cleaning',
    'Vacant Clean',
    'Vacant Clean Inspected',
    'Occupied',
    'Out of Order'
  ];

  const statusColors: Record<RoomStatus, string> = {
    'Dirty': '#ef4444',
    'Check-out Inspected': '#f97316',
    'Cleaning': '#3b82f6',
    'Vacant Clean': '#22c55e',
    'Vacant Clean Inspected': '#10b981',
    'Occupied': '#8b5cf6',
    'Out of Order': '#6b7280'
  };

  return (
    <group position={position}>
      <Text
        position={[0, (statuses.length * 0.6) / 2 + 0.5, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Room Status
      </Text>
      {statuses.map((status, index) => (
        <group key={status} position={[0, (statuses.length - index - 1) * 0.6 - 1, 0]}>
          <mesh position={[-2, 0, 0]}>
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshStandardMaterial color={statusColors[status]} />
          </mesh>
          <Text
            position={[0.5, 0, 0]}
            fontSize={0.25}
            color="#d1d5db"
            anchorX="left"
            anchorY="middle"
          >
            {status}
          </Text>
        </group>
      ))}
    </group>
  );
}

// Stats panel in 3D
function StatsPanel({ rooms, position }: { rooms: Room[]; position: [number, number, number] }) {
  const stats = {
    total: rooms.length,
    dirty: rooms.filter(r => r.status === 'Dirty').length,
    cleaning: rooms.filter(r => r.status === 'Cleaning').length,
    vacantClean: rooms.filter(r => r.status === 'Vacant Clean').length,
    occupied: rooms.filter(r => r.status === 'Occupied').length,
    ooo: rooms.filter(r => r.status === 'Out of Order').length
  };

  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[4, 5]} />
        <meshStandardMaterial color="#111827" transparent opacity={0.9} />
      </mesh>
      <Text position={[0, 2, 0.01]} fontSize={0.35} color="white" anchorX="center">
        Room Statistics
      </Text>
      <Text position={[-1.5, 1.2, 0.01]} fontSize={0.25} color="#9ca3af" anchorX="left">
        Total Rooms: {stats.total}
      </Text>
      <Text position={[-1.5, 0.7, 0.01]} fontSize={0.25} color="#ef4444" anchorX="left">
        Dirty: {stats.dirty}
      </Text>
      <Text position={[-1.5, 0.2, 0.01]} fontSize={0.25} color="#3b82f6" anchorX="left">
        Cleaning: {stats.cleaning}
      </Text>
      <Text position={[-1.5, -0.3, 0.01]} fontSize={0.25} color="#22c55e" anchorX="left">
        Vacant Clean: {stats.vacantClean}
      </Text>
      <Text position={[-1.5, -0.8, 0.01]} fontSize={0.25} color="#8b5cf6" anchorX="left">
        Occupied: {stats.occupied}
      </Text>
      <Text position={[-1.5, -1.3, 0.01]} fontSize={0.25} color="#6b7280" anchorX="left">
        Out of Order: {stats.ooo}
      </Text>
    </group>
  );
}

// Main 3D Scene
function Scene({ 
  rooms, 
  onRoomClick, 
  selectedRoomId,
  viewMode 
}: { 
  rooms: Room[]; 
  onRoomClick: (room: Room) => void;
  selectedRoomId: string | null;
  viewMode: 'buildings' | 'floors' | 'list';
}) {
  const controlsRef = useRef<any>(null);
  const [cameraTarget] = useState<[number, number, number]>([0, 5, 0]);

  // Get unique buildings
  const buildings = Array.from(new Set(rooms.map(r => r.building))).sort();

  // Calculate building positions
  const getBuildingPosition = (index: number): [number, number, number] => {
    const spacing = 25;
    const offset = (buildings.length - 1) * spacing / 2;
    return [index * spacing - offset, 0, 0];
  };

  // Group rooms by building and floor for floor view
  const getRoomsByBuildingFloor = (building: string, floor: number) => {
    return rooms.filter(r => r.building === building && r.floor === floor);
  };

  return (
    <>
      <Lighting />
      <Environment preset="night" />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <CameraController target={cameraTarget} />
      
      <OrbitControls 
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={100}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />

      {/* Ground grid */}
      <Grid
        position={[0, -0.1, 0]}
        args={[200, 200]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#374151"
        sectionSize={25}
        sectionThickness={1}
        sectionColor="#4b5563"
        fadeDistance={100}
        fadeStrength={1}
        infiniteGrid
      />

      {/* Buildings View */}
      {viewMode === 'buildings' && buildings.map((building, index) => {
        const buildingRooms = rooms.filter(r => r.building === building);
        const maxFloor = Math.max(...buildingRooms.map(r => r.floor));
        const roomsPerFloor = Math.ceil(buildingRooms.length / maxFloor);

        return (
          <Building3D
            key={building}
            building={building}
            floors={maxFloor}
            roomsPerFloor={roomsPerFloor}
            rooms={buildingRooms}
            onRoomClick={onRoomClick}
            selectedRoomId={selectedRoomId}
            position={getBuildingPosition(index)}
          />
        );
      })}

      {/* Floor View - Shows all floors side by side */}
      {viewMode === 'floors' && buildings.map((building, bIndex) => {
        const buildingRooms = rooms.filter(r => r.building === building);
        const maxFloor = Math.max(...buildingRooms.map(r => r.floor));
        
        return (
          <group key={building} position={getBuildingPosition(bIndex)}>
            <Text position={[0, maxFloor * 2.5 + 2, 0]} fontSize={1} color="white" anchorX="center">
              {building}
            </Text>
            {Array.from({ length: maxFloor }, (_, i) => {
              const floorNumber = i + 1;
              const floorRooms = getRoomsByBuildingFloor(building, floorNumber);
              const roomsPerRow = Math.ceil(Math.sqrt(floorRooms.length)) || 1;
              const roomSpacing = 2.5;

              return (
                <group key={floorNumber} position={[0, i * 2.5, 0]}>
                  <FloorPlatform
                    position={[0, 0, 0]}
                    size={[
                      roomsPerRow * roomSpacing + 2,
                      roomsPerRow * roomSpacing + 2
                    ]}
                    floorNumber={floorNumber}
                    buildingName=""
                  />
                  {floorRooms.map((room, rIndex) => {
                    const row = Math.floor(rIndex / roomsPerRow);
                    const col = rIndex % roomsPerRow;
                    const x = (col - roomsPerRow / 2 + 0.5) * roomSpacing;
                    const z = (row - roomsPerRow / 2 + 0.5) * roomSpacing;

                    return (
                      <RoomCube
                        key={room.id}
                        room={room}
                        position={[x, 0.8, z]}
                        onClick={onRoomClick}
                        isSelected={selectedRoomId === room.id}
                      />
                    );
                  })}
                </group>
              );
            })}
          </group>
        );
      })}

      {/* Status Legend */}
      <StatusLegend position={[-30, 5, -10]} />

      {/* Stats Panel */}
      <StatsPanel rooms={rooms} position={[30, 5, -10]} />
    </>
  );
}

// Main Dashboard3D Component
interface Dashboard3DProps {
  onRoomClick?: (room: Room) => void;
  selectedRoomId?: string | null;
  viewMode?: 'buildings' | 'floors' | 'list';
  height?: string;
}

export function Dashboard3D({ 
  onRoomClick,
  selectedRoomId: externalSelectedRoomId,
  viewMode = 'buildings',
  height = 'calc(100vh - 80px)'
}: Dashboard3DProps) {
  const { rooms, isLoading } = useRooms();
  const { selectedRoom, setSelectedRoom } = useAppStore();
  const [internalViewMode, setInternalViewMode] = useState(viewMode);

  // Start timer interval for performance tracking
  useEffect(() => {
    startTimerInterval();
    return () => stopTimerInterval();
  }, []);

  const handleRoomClick = useCallback((room: Room) => {
    setSelectedRoom(room);
    onRoomClick?.(room);
  }, [onRoomClick, setSelectedRoom]);

  const effectiveSelectedId = externalSelectedRoomId ?? selectedRoom?.id ?? null;

  return (
    <div className="relative w-full" style={{ height }}>
      {/* View mode toggle */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => setInternalViewMode('buildings')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            internalViewMode === 'buildings' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Buildings
        </button>
        <button
          onClick={() => setInternalViewMode('floors')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            internalViewMode === 'floors' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Floors
        </button>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-white text-lg">Loading rooms...</p>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 20, 40], fov: 60 }}
      >
        <Suspense fallback={<Loader />}>
          <Scene 
            rooms={rooms}
            onRoomClick={handleRoomClick}
            selectedRoomId={effectiveSelectedId}
            viewMode={internalViewMode}
          />
        </Suspense>
      </Canvas>

      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 text-sm text-gray-300">
        <p className="font-medium text-white mb-2">Controls:</p>
        <ul className="space-y-1">
          <li>• Left click + drag to rotate</li>
          <li>• Right click + drag to pan</li>
          <li>• Scroll to zoom</li>
          <li>• Click room to select</li>
        </ul>
      </div>
    </div>
  );
}

export default Dashboard3D;
