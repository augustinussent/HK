// 3D Room Cube Component - Individual room representation in 3D space
import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Room, RoomStatus } from '@/types';

interface RoomCubeProps {
  room: Room;
  position: [number, number, number];
  size?: [number, number, number];
  onClick?: (room: Room) => void;
  isSelected?: boolean;
  showLabel?: boolean;
}

// Status color mapping
const statusColors: Record<RoomStatus, string> = {
  'Dirty': '#ef4444',              // Red
  'Check-out Inspected': '#f97316', // Orange
  'Cleaning': '#3b82f6',            // Blue
  'Vacant Clean': '#22c55e',        // Green
  'Vacant Clean Inspected': '#10b981', // Emerald
  'Occupied': '#8b5cf6',            // Purple
  'Out of Order': '#6b7280'         // Gray
};

// Status glow intensity
const statusGlow: Record<RoomStatus, number> = {
  'Dirty': 0.8,
  'Check-out Inspected': 0.6,
  'Cleaning': 0.9,
  'Vacant Clean': 0.5,
  'Vacant Clean Inspected': 0.5,
  'Occupied': 0.4,
  'Out of Order': 0.3
};

export function RoomCube({ 
  room, 
  position, 
  size = [1.8, 1.2, 1.8],
  onClick,
  isSelected = false,
  showLabel = true
}: RoomCubeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Animate pulse for certain statuses
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.05;
      
      // Pulse effect for Dirty and Cleaning rooms
      if (room.status === 'Dirty' || room.status === 'Cleaning') {
        const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 1;
        meshRef.current.scale.setScalar(pulse);
      } else if (isSelected) {
        const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.05 + 1.05;
        meshRef.current.scale.setScalar(pulse);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  // Material with status color
  const material = useMemo(() => {
    const color = statusColors[room.status];
    return new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: statusGlow[room.status] * (hovered ? 1.5 : 1),
      roughness: 0.3,
      metalness: 0.2,
      transparent: true,
      opacity: 0.9
    });
  }, [room.status, hovered]);

  // Edge material
  const edgeMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: isSelected ? '#ffffff' : '#000000',
      linewidth: isSelected ? 3 : 1
    });
  }, [isSelected]);

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onClick?.(room);
  };

  return (
    <group position={position}>
      {/* Main cube */}
      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        material={material}
      >
        <boxGeometry args={size} />
      </mesh>

      {/* Wireframe edges */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
        <primitive object={edgeMaterial} attach="material" />
      </lineSegments>

      {/* Room number label */}
      {showLabel && (
        <Text
          position={[0, 0, size[2] / 2 + 0.05]}
          fontSize={0.35}
          color="white"
          anchorX="center"
          anchorY="middle"
          font="/fonts/Inter-Bold.woff"
        >
          {room.room_number}
        </Text>
      )}

      {/* Status indicator badge */}
      <mesh position={[size[0] / 2 - 0.2, size[1] / 2 - 0.2, size[2] / 2 + 0.02]}>
        <circleGeometry args={[0.15, 16]} />
        <meshBasicMaterial color={statusColors[room.status]} />
      </mesh>

      {/* VIP indicator */}
      {room.is_vip && (
        <mesh position={[-size[0] / 2 + 0.2, size[1] / 2 - 0.2, size[2] / 2 + 0.02]}>
          <circleGeometry args={[0.12, 16]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <Html distanceFactor={10}>
          <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl text-sm whitespace-nowrap pointer-events-none">
            <div className="font-semibold">Room {room.room_number}</div>
            <div className="text-xs text-gray-300">{room.building} - Floor {room.floor}</div>
            <div className="text-xs mt-1" style={{ color: statusColors[room.status] }}>
              {room.status}
            </div>
            {room.assigned_to && (
              <div className="text-xs text-blue-300 mt-1">
                Assigned: {room.assigned_to}
              </div>
            )}
          </div>
        </Html>
      )}

      {/* Selection highlight ring */}
      {isSelected && (
        <mesh position={[0, -size[1] / 2 - 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.4, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

// Floor platform component
interface FloorPlatformProps {
  position: [number, number, number];
  size: [number, number];
  floorNumber: number;
  buildingName: string;
}

export function FloorPlatform({ position, size, floorNumber, buildingName }: FloorPlatformProps) {
  return (
    <group position={position}>
      {/* Floor base */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={size} />
        <meshStandardMaterial 
          color="#1f2937" 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Floor grid pattern */}
      <gridHelper 
        args={[Math.max(size[0], size[1]), Math.max(size[0], size[1]) / 2, '#374151', '#374151']} 
        position={[0, 0.01, 0]}
      />

      {/* Floor label */}
      <Text
        position={[-size[0] / 2 + 1, 0.5, -size[1] / 2 + 0.5]}
        fontSize={0.5}
        color="#9ca3af"
        anchorX="left"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {buildingName} - Floor {floorNumber}
      </Text>
    </group>
  );
}

// Building structure component
interface Building3DProps {
  building: string;
  floors: number;
  roomsPerFloor: number;
  rooms: Room[];
  onRoomClick: (room: Room) => void;
  selectedRoomId?: string | null;
  position?: [number, number, number];
}

export function Building3D({
  building,
  floors,
  roomsPerFloor,
  rooms,
  onRoomClick,
  selectedRoomId,
  position = [0, 0, 0]
}: Building3DProps) {
  const buildingRooms = rooms.filter(r => r.building === building);
  
  // Calculate room positions
  const roomSpacing = 2.5;
  const floorHeight = 2;
  const roomsPerRow = Math.ceil(Math.sqrt(roomsPerFloor));

  return (
    <group position={position}>
      {/* Building label */}
      <Text
        position={[0, floors * floorHeight + 1, 0]}
        fontSize={1}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {building}
      </Text>

      {/* Render floors */}
      {Array.from({ length: floors }, (_, floorIndex) => {
        const floorNumber = floorIndex + 1;
        const floorRooms = buildingRooms.filter(r => r.floor === floorNumber);
        const platformSize: [number, number] = [
          roomsPerRow * roomSpacing + 2,
          roomsPerRow * roomSpacing + 2
        ];

        return (
          <group key={floorNumber}>
            <FloorPlatform
              position={[0, floorIndex * floorHeight, 0]}
              size={platformSize}
              floorNumber={floorNumber}
              buildingName={building}
            />

            {/* Render rooms on this floor */}
            {floorRooms.map((room, roomIndex) => {
              const row = Math.floor(roomIndex / roomsPerRow);
              const col = roomIndex % roomsPerRow;
              const x = (col - roomsPerRow / 2 + 0.5) * roomSpacing;
              const z = (row - roomsPerRow / 2 + 0.5) * roomSpacing;

              return (
                <RoomCube
                  key={room.id}
                  room={room}
                  position={[x, floorIndex * floorHeight + 0.8, z]}
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
}
