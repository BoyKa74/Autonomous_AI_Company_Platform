"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { Robot } from "@/components/company/office/robot";
import { AGENT_ROLES } from "@/lib/constants";
import type { AiAgent } from "@/types/database";

const FONT_SEMIBOLD = "/fonts/BeVietnamPro-SemiBold.ttf";
const FONT_REGULAR = "/fonts/BeVietnamPro-Regular.ttf";

const DESK_TOP = "#ffffff";
const DESK_LEG = "#e4e9f1";
const MONITOR = "#2a3342";
const CHAIR = "#dde4ee";

export function Workstation({
  agent,
  position,
  active,
  selected,
  onSelect,
  dark,
  tier,
  isLeader,
}: {
  agent: AiAgent;
  position: [number, number, number];
  active: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  dark: boolean;
  tier: number;
  isLeader: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const paused = agent.status === "paused";
  const color = AGENT_ROLES[agent.role].color;
  const screenRef = useRef<THREE.MeshStandardMaterial>(null);
  const rugRef = useRef<THREE.MeshStandardMaterial>(null);

  const displayName =
    agent.name.length > 24 ? `${agent.name.slice(0, 22)}…` : agent.name;
  const labelWidth = Math.max(1.15, displayName.length * 0.115 + 0.35);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (screenRef.current) {
      const base = paused ? 0.16 : active ? 0.75 : 0.38;
      screenRef.current.emissiveIntensity = paused
        ? base
        : base + Math.sin(t * 4.2) * (active ? 0.25 : 0.06);
    }
    if (rugRef.current) {
      const base = paused ? 0.06 : selected ? 0.2 : 0.13;
      rugRef.current.opacity = active
        ? base + Math.abs(Math.sin(t * 2.6)) * 0.09
        : base;
    }
  });

  return (
    <group position={position}>
      {/* thảm màu tổ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.25]}>
        <planeGeometry args={[2.5, 2.3]} />
        <meshStandardMaterial
          ref={rugRef}
          color={color}
          transparent
          opacity={paused ? 0.06 : selected ? 0.2 : 0.12}
        />
      </mesh>

      {/* vòng chọn */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.25]}>
        <ringGeometry args={[0.85, 1.0, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={selected ? 0.75 : hovered ? 0.5 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ghế */}
      <group position={[0, 0, -0.62]}>
        <mesh castShadow position={[0, 0.52, 0]}>
          <boxGeometry args={[0.56, 0.09, 0.52]} />
          <meshStandardMaterial color={CHAIR} roughness={0.85} />
        </mesh>
        <mesh castShadow position={[0, 0.89, -0.26]}>
          <boxGeometry args={[0.56, 0.68, 0.09]} />
          <meshStandardMaterial color={CHAIR} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.48, 10]} />
          <meshStandardMaterial color="#9aa5b5" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.46, 0.06, 0.46]} />
          <meshStandardMaterial color="#9aa5b5" metalness={0.4} roughness={0.4} />
        </mesh>
      </group>

      {/* robot */}
      <Robot
        role={agent.role}
        paused={paused}
        active={active}
        selected={selected}
        hovered={hovered}
      />

      {/* bàn */}
      <group position={[0, 0, 0.62]}>
        <mesh castShadow position={[0, 0.73, 0]}>
          <boxGeometry args={[1.5, 0.06, 0.74]} />
          <meshStandardMaterial color={DESK_TOP} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.695, 0]}>
          <boxGeometry args={[1.42, 0.02, 0.66]} />
          <meshStandardMaterial color="#eef2f7" roughness={0.6} />
        </mesh>
        {[-0.7, 0.7].map((x) => (
          <mesh key={x} position={[x, 0.36, 0]}>
            <boxGeometry args={[0.06, 0.7, 0.68]} />
            <meshStandardMaterial color={DESK_LEG} roughness={0.7} />
          </mesh>
        ))}

        {/* màn hình */}
        <group position={[-0.4, 0.76, 0.04]} rotation={[0, -0.55, 0]}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.03, 0.045, 0.2, 10]} />
            <meshStandardMaterial color="#9aa5b5" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh castShadow position={[0, 0.37, 0]}>
            <boxGeometry args={[0.62, 0.42, 0.04]} />
            <meshStandardMaterial color={MONITOR} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.37, 0.023]}>
            <planeGeometry args={[0.56, 0.36]} />
            <meshStandardMaterial
              ref={screenRef}
              color="#101722"
              emissive={color}
              emissiveIntensity={paused ? 0.16 : 0.38}
              toneMapped={false}
            />
          </mesh>
        </group>

        {/* bàn phím */}
        <mesh position={[0.12, 0.775, 0.16]}>
          <boxGeometry args={[0.46, 0.03, 0.17]} />
          <meshStandardMaterial color="#e8edf4" roughness={0.7} />
        </mesh>

        {/* ly */}
        <mesh position={[0.5, 0.81, -0.05]}>
          <cylinderGeometry args={[0.05, 0.045, 0.1, 14]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      </group>

      {/* nhãn nổi kiểu thẻ tên */}
      <Billboard position={[0, 2.32, 0]}>
        <mesh>
          <boxGeometry args={[labelWidth, 0.6, 0.02]} />
          <meshStandardMaterial
            color={dark ? "#1b2230" : "#ffffff"}
            transparent
            opacity={0.96}
            roughness={0.8}
          />
        </mesh>
        <Text
          font={FONT_SEMIBOLD}
          fontSize={0.19}
          color={paused ? "#8b95a7" : dark ? "#eef1f6" : "#1b2330"}
          anchorX="center"
          anchorY="middle"
          position={[0, 0.11, 0.02]}
        >
          {displayName}
        </Text>
        <Text
          font={FONT_REGULAR}
          fontSize={0.135}
          color={color}
          anchorX="center"
          anchorY="middle"
          position={[0, -0.13, 0.02]}
        >
          T{tier} · {AGENT_ROLES[agent.role].label.toUpperCase()}
          {active ? " · ĐANG LÀM" : paused ? " · TẠM DỪNG" : ""}
        </Text>
        {isLeader && (
          <mesh position={[0, 0.55, 0]}>
            <octahedronGeometry args={[0.13]} />
            <meshStandardMaterial
              color="#e0a020"
              emissive="#cd8615"
              emissiveIntensity={0.85}
              metalness={0.5}
              roughness={0.35}
            />
          </mesh>
        )}
      </Billboard>

      {/* vùng bấm */}
      <mesh
        position={[0, 1.15, 0.2]}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(agent.id);
        }}
      >
        <boxGeometry args={[1.9, 2.5, 2.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
