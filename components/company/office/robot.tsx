"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AGENT_ROLES } from "@/lib/constants";
import type { AiAgent } from "@/types/database";

const BODY = "#f5f7fb";
const BODY_MID = "#e6ebf3";
const VISOR = "#2a3342";
const HANDS = "#cfd7e2";
const PAUSED_BODY = "#e9ecf1";
const PAUSED_DARK = "#b9c1cd";

export function Robot({
  role,
  paused,
  active,
  selected,
  hovered,
}: {
  role: AiAgent["role"];
  paused: boolean;
  active: boolean;
  selected: boolean;
  hovered: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const eyesRef = useRef<THREE.Group>(null);

  const color = AGENT_ROLES[role].color;
  const accent = paused ? 0.08 : selected ? 0.9 : active ? 0.72 : 0.4;
  const bodyColor = paused ? PAUSED_BODY : BODY;
  const limbColor = paused ? PAUSED_BODY : BODY_MID;
  const darkColor = paused ? PAUSED_DARK : VISOR;

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (rootRef.current) {
      const bob = paused ? 0 : Math.sin(t * 2.1) * 0.012;
      const scale = selected ? 1.06 : hovered ? 1.03 : 1;
      rootRef.current.position.y = bob;
      rootRef.current.scale.setScalar(scale);
    }

    if (rightArmRef.current) {
      rightArmRef.current.rotation.x =
        active && !paused ? -0.95 + Math.sin(t * 9) * 0.16 : -0.95;
    }

    if (eyesRef.current) {
      const blink = Math.sin(t * 1.9) > 0.988 ? 0.15 : 1;
      eyesRef.current.scale.y = blink;
    }
  });

  return (
    <group ref={rootRef}>
      <mesh castShadow position={[0, 0.98, 0]}>
        <capsuleGeometry args={[0.24, 0.28, 8, 20]} />
        <meshStandardMaterial color={bodyColor} metalness={0.05} roughness={0.6} />
      </mesh>

      <mesh position={[0, 1.06, 0.21]}>
        <boxGeometry args={[0.16, 0.09, 0.04]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={accent}
          roughness={0.5}
        />
      </mesh>

      <mesh castShadow position={[0, 1.54, 0]}>
        <sphereGeometry args={[0.25, 28, 28]} />
        <meshStandardMaterial color={bodyColor} metalness={0.05} roughness={0.55} />
      </mesh>

      <mesh position={[0, 1.55, 0.17]}>
        <boxGeometry args={[0.35, 0.14, 0.1]} />
        <meshStandardMaterial color={darkColor} metalness={0.2} roughness={0.45} />
      </mesh>

      <group ref={eyesRef} position={[0, 1.55, 0.228]}>
        <mesh position={[-0.078, 0, 0]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshStandardMaterial
            color="#f5fbff"
            emissive={paused ? PAUSED_DARK : "#9be8ff"}
            emissiveIntensity={paused ? 0.15 : 1.1}
          />
        </mesh>
        <mesh position={[0.078, 0, 0]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshStandardMaterial
            color="#f5fbff"
            emissive={paused ? PAUSED_DARK : "#9be8ff"}
            emissiveIntensity={paused ? 0.15 : 1.1}
          />
        </mesh>
      </group>

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.26, 1.55, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.055, 0.055, 0.05, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={accent * 0.55}
            roughness={0.5}
          />
        </mesh>
      ))}

      <mesh position={[0, 1.86, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.2, 8]} />
        <meshStandardMaterial color={darkColor} metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.98, 0]}>
        <sphereGeometry args={[0.042, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={paused ? 0.12 : 1}
        />
      </mesh>

      <group position={[-0.3, 1.12, 0]} rotation={[-0.95, 0, 0.12]}>
        <mesh castShadow position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.055, 0.2, 6, 12]} />
          <meshStandardMaterial color={limbColor} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.062, 12, 12]} />
          <meshStandardMaterial color={paused ? PAUSED_BODY : HANDS} roughness={0.6} />
        </mesh>
      </group>

      <group ref={rightArmRef} position={[0.3, 1.12, 0]} rotation={[-0.95, 0, -0.12]}>
        <mesh castShadow position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.055, 0.2, 6, 12]} />
          <meshStandardMaterial color={limbColor} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.062, 12, 12]} />
          <meshStandardMaterial color={paused ? PAUSED_BODY : HANDS} roughness={0.6} />
        </mesh>
      </group>

      {[-1, 1].map((side) => (
        <mesh key={side} castShadow position={[side * 0.12, 0.46, 0.08]}>
          <capsuleGeometry args={[0.07, 0.26, 6, 12]} />
          <meshStandardMaterial color={limbColor} roughness={0.65} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.12, 0.2, 0.16]}>
          <boxGeometry args={[0.14, 0.09, 0.22]} />
          <meshStandardMaterial color={darkColor} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}
