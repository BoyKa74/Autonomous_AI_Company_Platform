"use client";

import { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Grid, OrbitControls, Text } from "@react-three/drei";
import { Workstation } from "@/components/company/office/workstation";
import { Courier } from "@/components/company/office/courier";
import { AGENT_ROLES } from "@/lib/constants";
import type { AiAgent } from "@/types/database";

const FONT_SEMIBOLD = "/fonts/BeVietnamPro-SemiBold.ttf";
const FONT_REGULAR = "/fonts/BeVietnamPro-Regular.ttf";

const X_SPACING = 3.0;
const ROW_Z = 3.4;
const WALL_OFFSET = 3.8;
const WALL_HEIGHT = 6.4;

type Theme = {
  bg: string;
  floor: string;
  wall: string;
  windowColor: string;
  windowEmissive: number;
  gridCell: string;
  gridSection: string;
  platform: string;
  potColor: string;
  leafA: string;
  leafB: string;
  leafC: string;
};

const LIGHT: Theme = {
  bg: "#eef2f7",
  floor: "#f8fafc",
  wall: "#fdfefe",
  windowColor: "#cde6f7",
  windowEmissive: 0.35,
  gridCell: "#e6ebf3",
  gridSection: "#d7dfe9",
  platform: "#f2f5fa",
  potColor: "#dfe6f0",
  leafA: "#7fbf8e",
  leafB: "#5da372",
  leafC: "#6cae7f",
};

const DARK: Theme = {
  bg: "#0c1118",
  floor: "#141a23",
  wall: "#10161f",
  windowColor: "#14293f",
  windowEmissive: 0.85,
  gridCell: "#1a212c",
  gridSection: "#242d3a",
  platform: "#1a212c",
  potColor: "#242c38",
  leafA: "#3f7f5c",
  leafB: "#2f6b4b",
  leafC: "#387456",
};

type Layout = {
  positioned: { agent: AiAgent; position: [number, number, number]; depth: number }[];
  centerZ: number;
  backZ: number;
  minX: number;
  maxX: number;
  maxDepth: number;
};

function computeLayout(agents: AiAgent[]): Layout {
  const byId = new Map(agents.map((agent) => [agent.id, agent]));
  const childrenOf = new Map<string, AiAgent[]>();
  const roots: AiAgent[] = [];

  for (const agent of agents) {
    if (agent.parent_id && byId.has(agent.parent_id)) {
      const list = childrenOf.get(agent.parent_id) ?? [];
      list.push(agent);
      childrenOf.set(agent.parent_id, list);
    } else {
      roots.push(agent);
    }
  }

  const slots = new Map<string, { x: number; depth: number }>();
  let cursor = 0;

  const walk = (agent: AiAgent, depth: number): number => {
    const children = childrenOf.get(agent.id) ?? [];
    let x: number;
    if (children.length === 0) {
      x = cursor * X_SPACING;
      cursor += 1;
    } else {
      const xs = children.map((child) => walk(child, depth + 1));
      x = (Math.min(...xs) + Math.max(...xs)) / 2;
    }
    slots.set(agent.id, { x, depth });
    return x;
  };

  for (const root of roots) {
    walk(root, 0);
    cursor += 1;
  }

  const all = [...slots.values()];
  const xs = all.map((slot) => slot.x);
  const centerX = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
  const maxDepth = all.length ? Math.max(...all.map((slot) => slot.depth)) : 0;

  const positioned = agents.map((agent) => {
    const slot = slots.get(agent.id) ?? { x: 0, depth: 0 };
    const z = -(maxDepth - slot.depth) * ROW_Z;
    return {
      agent,
      depth: slot.depth,
      position: [slot.x - centerX, 0, z] as [number, number, number],
    };
  });

  return {
    positioned,
    centerZ: -(maxDepth * ROW_Z) / 2,
    backZ: -(maxDepth * ROW_Z) - WALL_OFFSET,
    minX: (Math.min(...xs) || 0) - centerX,
    maxX: (Math.max(...xs) || 0) - centerX,
    maxDepth,
  };
}

function CameraRig({ centerZ, span }: { centerZ: number; span: number }) {
  const { camera } = useThree();

  useEffect(() => {
    const dist = Math.max(16.5, span * 0.85 + 10);
    camera.position.set(3, dist * 0.52, centerZ + dist * 0.85);
    camera.lookAt(0, 1.5, centerZ);
  }, [camera, centerZ, span]);

  return null;
}

function Windows({
  width,
  position,
  rotation,
  theme,
}: {
  width: number;
  position: [number, number, number];
  rotation: [number, number, number];
  theme: Theme;
}) {
  const count = Math.max(2, Math.floor(width / 3.4));
  const step = width / count;

  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: count }).map((_, index) => {
        const x = -width / 2 + step * (index + 0.5);
        return (
          <mesh key={index} position={[x, 3.0, 0.03]}>
            <planeGeometry args={[step - 0.7, 2.1]} />
            <meshStandardMaterial
              color={theme.windowColor}
              emissive={theme.windowColor}
              emissiveIntensity={theme.windowEmissive}
              roughness={0.2}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Plant({
  position,
  theme,
}: {
  position: [number, number, number];
  theme: Theme;
}) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.22, 0.16, 0.36, 12]} />
        <meshStandardMaterial color={theme.potColor} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.3, 14, 14]} />
        <meshStandardMaterial color={theme.leafA} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.16, 0.9, 0.05]}>
        <sphereGeometry args={[0.22, 14, 14]} />
        <meshStandardMaterial color={theme.leafB} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[-0.16, 0.88, -0.04]}>
        <sphereGeometry args={[0.19, 14, 14]} />
        <meshStandardMaterial color={theme.leafC} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Room({
  title,
  backZ,
  centerZ,
  minX,
  maxX,
  theme,
  dark,
}: {
  title: string;
  backZ: number;
  centerZ: number;
  minX: number;
  maxX: number;
  theme: Theme;
  dark: boolean;
}) {
  const width = Math.max(24, maxX - minX + 14);
  const floorCenterZ = (backZ + 8 + centerZ) / 2;
  const floorDepth = Math.abs(backZ) + 17;

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, floorCenterZ]}
        receiveShadow
      >
        <planeGeometry args={[width, floorDepth]} />
        <meshStandardMaterial color={theme.floor} roughness={0.95} />
      </mesh>

      <Grid
        position={[0, 0.015, centerZ]}
        args={[width, floorDepth]}
        cellSize={1.6}
        cellColor={theme.gridCell}
        sectionSize={8}
        sectionColor={theme.gridSection}
        fadeDistance={58}
        fadeStrength={1.4}
        infiniteGrid
      />

      {/* tường sau + cửa sổ */}
      <mesh position={[0, WALL_HEIGHT / 2, backZ]} receiveShadow>
        <planeGeometry args={[width, WALL_HEIGHT]} />
        <meshStandardMaterial color={theme.wall} roughness={0.9} />
      </mesh>
      <Windows width={width} position={[0, 0, backZ]} rotation={[0, 0, 0]} theme={theme} />
      <mesh position={[0, 1.1, backZ + 0.05]}>
        <boxGeometry args={[width, 0.12, 0.03]} />
        <meshStandardMaterial color={theme.gridCell} roughness={0.8} />
      </mesh>

      {/* băng-rôn tên công ty */}
      <group position={[0, 4.55, backZ + 0.09]}>
        <mesh>
          <boxGeometry args={[Math.min(width - 6, 7.2), 1.15, 0.06]} />
          <meshStandardMaterial
            color={dark ? "#171e29" : "#ffffff"}
            roughness={0.7}
          />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[Math.min(width - 6, 7.2), 0.07, 0.08]} />
          <meshStandardMaterial color="#cd8615" roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.62, 0]}>
          <boxGeometry args={[Math.min(width - 6, 7.2), 0.07, 0.08]} />
          <meshStandardMaterial color="#cd8615" roughness={0.6} />
        </mesh>
        <mesh position={[-Math.min(width - 6, 7.2) / 2 + 0.55, 0, 0.05]}>
          <boxGeometry args={[0.55, 0.55, 0.06]} />
          <meshStandardMaterial color="#cd8615" roughness={0.6} />
        </mesh>
        <Text
          font={FONT_SEMIBOLD}
          position={[0.2, 0.02, 0.06]}
          fontSize={0.42}
          color={dark ? "#eef1f6" : "#1b2330"}
          anchorX="center"
          anchorY="middle"
        >
          {title}
        </Text>
      </group>

      <Text
        font={FONT_REGULAR}
        position={[0, 3.42, backZ + 0.09]}
        fontSize={0.2}
        letterSpacing={0.22}
        color={dark ? "#6d7a8c" : "#8b95a7"}
        anchorX="center"
        anchorY="middle"
      >
        AI OFFICE · 24/7
      </Text>

      <Plant position={[minX - 2.6, 0, -0.8]} theme={theme} />
      <Plant position={[maxX + 2.6, 0, -0.8]} theme={theme} />
      <Plant position={[minX - 2.6, 0, backZ + 2.2]} theme={theme} />
      <Plant position={[maxX + 2.6, 0, backZ + 2.2]} theme={theme} />
    </>
  );
}

function Scene({
  agents,
  activeByAgent,
  selectedId,
  onSelect,
  spinning,
  title,
  dark,
  handoffs,
}: {
  agents: AiAgent[];
  activeByAgent: Record<string, number>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  spinning: boolean;
  title: string;
  dark: boolean;
  handoffs: { fromId: string; toId: string }[];
}) {
  const { positioned, centerZ, backZ, minX, maxX, maxDepth } = useMemo(
    () => computeLayout(agents),
    [agents]
  );

  const span = Math.max(Math.abs(minX), Math.abs(maxX)) * 2 + 6;
  const theme = dark ? DARK : LIGHT;
  const positionById = useMemo(
    () => new Map(positioned.map((entry) => [entry.agent.id, entry.position])),
    [positioned]
  );
  const agentById = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent])),
    [agents]
  );

  return (
    <>
      <color attach="background" args={[theme.bg]} />
      <fog attach="fog" args={[theme.bg, 42, 90]} />

      <ambientLight intensity={dark ? 0.42 : 0.85} />
      <directionalLight
        castShadow
        position={[11, 16, 9]}
        intensity={dark ? 0.5 : 1.5}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      >
        <orthographicCamera attach="shadow-camera" args={[-24, 24, 18, -18, 1, 60]} />
      </directionalLight>
      <directionalLight
        position={[-8, 9, -6]}
        intensity={dark ? 0.18 : 0.35}
        color="#cfe0f5"
      />
      <pointLight
        position={[0, 5.5, centerZ + 7]}
        color={dark ? "#ffd894" : "#fff2d9"}
        intensity={dark ? 26 : 14}
        distance={34}
        decay={2}
      />
      {dark && (
        <>
          <pointLight
            position={[-7, 4.6, centerZ]}
            color="#ffd894"
            intensity={16}
            distance={22}
            decay={2}
          />
          <pointLight
            position={[7, 4.6, centerZ]}
            color="#ffd894"
            intensity={16}
            distance={22}
            decay={2}
          />
        </>
      )}

      <Room
        title={title}
        backZ={backZ}
        centerZ={centerZ}
        minX={minX}
        maxX={maxX}
        theme={theme}
        dark={dark}
      />

      {/* bục CEO */}
      {positioned
        .filter(({ depth }) => depth === maxDepth && maxDepth > 0)
        .map(({ agent, position }) => (
          <mesh
            key={`platform-${agent.id}`}
            position={[position[0], 0.16, position[2] - 0.4]}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[2.9, 0.32, 3.1]} />
            <meshStandardMaterial color={theme.platform} roughness={0.7} />
          </mesh>
        ))}

      {positioned.map(({ agent, position, depth }) => (
        <Workstation
          key={agent.id}
          agent={agent}
          position={
            depth === maxDepth && maxDepth > 0
              ? [position[0], 0.32, position[2]]
              : position
          }
          active={(activeByAgent[agent.id] ?? 0) > 0}
          selected={selectedId === agent.id}
          onSelect={onSelect}
          dark={dark}
        />
      ))}

      {/* robot đi giao tài liệu */}
      {handoffs.slice(0, 3).map((handoff, index) => {
        const from = positionById.get(handoff.fromId);
        const to = positionById.get(handoff.toId);
        const sender = agentById.get(handoff.fromId);
        if (!from || !to || !sender) return null;
        return (
          <Courier
            key={`${handoff.fromId}-${handoff.toId}`}
            from={{ x: from[0], z: from[2] }}
            to={{ x: to[0], z: to[2] }}
            delay={index * 2.1}
            color={AGENT_ROLES[sender.role].color}
          />
        );
      })}

      <CameraRig centerZ={centerZ} span={span} />
      <OrbitControls
        target={[0, 0.9, centerZ]}
        enablePan
        minDistance={6}
        maxDistance={42}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2.25}
        autoRotate={spinning}
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export function OrgCanvas(props: {
  agents: AiAgent[];
  activeByAgent: Record<string, number>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  spinning: boolean;
  title: string;
  dark: boolean;
  handoffs: { fromId: string; toId: string }[];
}) {
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      camera={{ fov: 34, position: [10, 11, 12], near: 0.1, far: 200 }}
      onPointerMissed={() => props.onSelect(null)}
      gl={{ antialias: true }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
