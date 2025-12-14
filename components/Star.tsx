import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

interface StarProps {
  morphFactor: number;
}

export const Star: React.FC<StarProps> = ({ morphFactor }) => {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  
  // Star position transition
  // Updated for larger tree: Top is approx y=8, so star sits at y=9
  const treePos = new THREE.Vector3(0, 9, 0);
  const scatterPos = new THREE.Vector3(0, 18, 0); // Way up high when scattered

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Interpolate position
    const target = new THREE.Vector3().lerpVectors(scatterPos, treePos, morphFactor);
    groupRef.current.position.lerp(target, delta * 2);

    // Rotation - Dual rotation for sparkle
    if (coreRef.current) {
        coreRef.current.rotation.y += delta * 0.8;
    }
    if (outerRef.current) {
        outerRef.current.rotation.y -= delta * 0.8;
        outerRef.current.rotation.z += delta * 0.2;
    }
    
    // Scale effect: Grow when tree forms
    // Reduced Max Scale from 2.0 to 1.2 for a more focused, delicate look
    const scale = THREE.MathUtils.lerp(0, 1.2, morphFactor); 
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef}>
      {/* Core Octahedron - Solid Gold Heart */}
      <mesh ref={coreRef}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial 
          color="#FFD700" 
          emissive="#FFD700"
          emissiveIntensity={4.0} // Very bright core for focused look
          metalness={1} 
          roughness={0} 
          toneMapped={false} // Allow bloom to blow out
        />
      </mesh>

      {/* Outer Octahedron - Decorative Outline / Crystal */}
      {/* Scaled slightly larger and inverted to create a complex star shape */}
      <mesh ref={outerRef} rotation={[0, 0, Math.PI / 4]} scale={1.4}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial 
          color="#FFF" 
          emissive="#FFD700"
          emissiveIntensity={0.5}
          metalness={1} 
          roughness={0.1}
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Focused Halo Light */}
      {/* Decreased distance to concentrate light, increased intensity */}
      <pointLight 
        color="#FFD700" 
        distance={4} 
        intensity={8 * morphFactor} 
        decay={2} 
      />

      {/* Holiday Sparkles */}
      {/* Small floating particles around the star */}
      <Sparkles 
        count={12}
        scale={2.5} // Small volume around star
        size={6}
        speed={0.4}
        opacity={morphFactor}
        color="#FFFDD0"
      />
    </group>
  );
};