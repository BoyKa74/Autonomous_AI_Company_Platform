"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const BODY = "#f5f7fb";
const BODY_MID = "#e6ebf3";
const VISOR = "#2a3342";
const FOLDER = "#f2c75c";

type Pt = { x: number; y?: number; z: number };

function buildWalker(from: Pt, to: Pt) {
  const midZ = (from.z + to.z) / 2 + 0.9;
  const raw = [from, { x: from.x, z: midZ }, { x: to.x, z: midZ }, to];
  const points = raw.filter(
    (p, i) => i === 0 || Math.hypot(p.x - raw[i - 1].x, p.z - raw[i - 1].z) > 0.05
  );
  const segments: { a: Pt; b: Pt; len: number; start: number }[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    segments.push({ a, b, len, start: total });
    total += len;
  }
  const fromY = from.y ?? 0;
  const toY = to.y ?? 0;
  return {
    total,
    at(distance: number) {
      const clamped = Math.max(0, Math.min(total, distance));
      for (const segment of segments) {
        if (clamped <= segment.start + segment.len || segment === segments.at(-1)) {
          const local = Math.min(segment.len, clamped - segment.start);
          const ratio = segment.len === 0 ? 0 : local / segment.len;
          const dx = segment.b.x - segment.a.x;
          const dz = segment.b.z - segment.a.z;
          const norm = Math.hypot(dx, dz) || 1;
          const traveled = clamped / (total || 1);
          return {
            x: segment.a.x + dx * ratio,
            y: fromY + (toY - fromY) * traveled,
            z: segment.a.z + dz * ratio,
            dx: dx / norm,
            dz: dz / norm,
          };
        }
      }
      return { x: to.x, y: toY, z: to.z, dx: 0, dz: 1 };
    },
  };
}

export function Courier({
  from,
  to,
  delay = 0,
  color,
}: {
  from: Pt;
  to: Pt;
  delay?: number;
  color: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const folderRef = useRef<THREE.Group>(null);

  const walker = useMemo(() => buildWalker(from, to), [from, to]);
  const speed = 1.45;
  const travel = walker.total / speed;
  const pause = 1.5;
  const idle = 2.4;
  const period = travel * 2 + pause * 2 + idle;

  useFrame((state) => {
    const time = state.clock.elapsedTime + delay;
    const t = time % period;

    let distance = 0;
    let walking = false;
    let facing = 1;
    let delivering = false;

    if (t < travel) {
      distance = t * speed;
      walking = true;
    } else if (t < travel + pause) {
      distance = walker.total;
      delivering = true;
    } else if (t < travel * 2 + pause) {
      distance = walker.total - (t - travel - pause) * speed;
      walking = true;
      facing = -1;
    }

    const point = walker.at(distance);

    if (groupRef.current) {
      groupRef.current.position.set(point.x, point.y ?? 0, point.z);
      groupRef.current.rotation.y =
        walking || delivering
          ? Math.atan2(point.dx * facing, point.dz * facing)
          : 0;
    }

    const step = walking ? Math.sin(t * speed * 5.2) : 0;

    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = step * 0.55;
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = -step * 0.55;
    }
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = -0.35 + step * 0.3;
    }
    if (bodyRef.current) {
      bodyRef.current.position.y = walking
        ? Math.abs(Math.sin(t * speed * 5.2)) * 0.035
        : 0;
      bodyRef.current.rotation.x = delivering ? 0.2 : 0;
    }
    if (folderRef.current) {
      const targetY = delivering ? 0.84 : 1.04;
      folderRef.current.position.y = THREE.MathUtils.lerp(
        folderRef.current.position.y,
        targetY,
        0.14
      );
      folderRef.current.rotation.z = delivering
        ? Math.sin(t * 6) * 0.05
        : Math.sin(t * 2.2) * 0.03;
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={bodyRef}>
        <mesh ref={leftLegRef} castShadow position={[-0.11, 0.38, 0]}>
          <capsuleGeometry args={[0.07, 0.44, 6, 12]} />
          <meshStandardMaterial color={BODY_MID} roughness={0.65} />
        </mesh>
        <mesh ref={rightLegRef} castShadow position={[0.11, 0.38, 0]}>
          <capsuleGeometry args={[0.07, 0.44, 6, 12]} />
          <meshStandardMaterial color={BODY_MID} roughness={0.65} />
        </mesh>
        <mesh castShadow position={[0, 0.95, 0]}>
          <capsuleGeometry args={[0.22, 0.32, 8, 20]} />
          <meshStandardMaterial color={BODY} roughness={0.6} />
        </mesh>
        <mesh castShadow position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.23, 26, 26]} />
          <meshStandardMaterial color={BODY} roughness={0.55} />
        </mesh>
        <mesh position={[0, 1.51, 0.16]}>
          <boxGeometry args={[0.32, 0.12, 0.1]} />
          <meshStandardMaterial color={VISOR} roughness={0.45} />
        </mesh>
        {[-0.07, 0.07].map((x) => (
          <mesh key={x} position={[x, 1.51, 0.215]}>
            <sphereGeometry args={[0.026, 10, 10]} />
            <meshStandardMaterial
              color="#f5fbff"
              emissive="#9be8ff"
              emissiveIntensity={1.1}
            />
          </mesh>
        ))}
        <mesh position={[0, 1.82, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.18, 8]} />
          <meshStandardMaterial color={VISOR} roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.93, 0]}>
          <sphereGeometry args={[0.04, 10, 10]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
        </mesh>
        <group ref={leftArmRef} position={[-0.28, 1.05, 0]}>
          <mesh castShadow position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.05, 0.22, 6, 12]} />
            <meshStandardMaterial color={BODY_MID} roughness={0.6} />
          </mesh>
        </group>
        <group position={[0.28, 1.05, 0]} rotation={[-1.05, 0, 0]}>
          <mesh castShadow position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.05, 0.22, 6, 12]} />
            <meshStandardMaterial color={BODY_MID} roughness={0.6} />
          </mesh>
        </group>
        <group ref={folderRef} position={[0, 1.04, 0.34]}>
          <mesh castShadow rotation={[-0.25, 0, 0]}>
            <boxGeometry args={[0.34, 0.26, 0.05]} />
            <meshStandardMaterial color={FOLDER} roughness={0.55} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
