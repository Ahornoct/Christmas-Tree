import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getDenseBottomTreePoint, getRandomSpherePoint } from '../utils/math';
import { PhotoData } from '../types';

interface PhotosProps {
  photos: string[];
  morphFactor: number;
  isMagnified: boolean;
}

// Individual Polaroid Component
const PolaroidItem: React.FC<{ 
    data: PhotoData; 
    morphFactor: number; 
    isMagnified: boolean; 
    index: number; 
    total: number;
}> = ({ data, morphFactor, isMagnified, index, total }) => {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useLoader(THREE.TextureLoader, data.url);
  const { camera } = useThree();
  
  // Fix texture encoding for correct color
  texture.colorSpace = THREE.SRGBColorSpace;

  // Use refs for current position to handle smooth physics independently
  const currentPos = useRef(new THREE.Vector3(...data.scatterPosition));
  const currentRot = useRef(new THREE.Euler(...data.rotation));
  const currentScale = useRef(data.scale);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    let target = new THREE.Vector3();
    let targetRot = new THREE.Euler();
    let targetScale = data.scale;

    if (isMagnified) {
      // --- MAGNIFIED STATE (CATCH) ---
      // Arrange in a semi-circle/ring in front of the camera
      // Camera is at [0, 6, 28]. Let's put them at Z=22 (6 units away)
      
      const radius = 6; // Radius of the viewing arc
      const angleStep = Math.PI / (total + 1); // Spread across 180 degrees
      const angle = -Math.PI / 2 + angleStep * (index + 1); // Center it
      
      // Calculate position relative to camera but fixed in world space
      // We want them "in front" of the camera.
      // Assumes camera is roughly looking at 0,0,0
      
      // World coordinates for the gallery
      target.set(
        Math.sin(angle) * radius * 1.5, // Spread horizontally
        6 + Math.cos(angle * 2) * 1.0, // Mild arch in Y
        22 + Math.cos(angle) * 2 // Mild curve in Z
      );

      // Rotation: Face the camera directly (0, 0, 0 is approx lookAt, so inv rotation)
      // Actually simpler: Face 0,6,28
      targetRot.set(0, 0, 0); // We will use lookAt in the loop
      
      targetScale = 2.5; // Zoom in size
    } else {
      // --- NORMAL STATE ---
      // 1. Calculate Standard Target Position based on morphFactor
      target.lerpVectors(
        new THREE.Vector3(...data.scatterPosition),
        new THREE.Vector3(...data.treePosition),
        morphFactor
      );
      
      // Reset rotations to stored random/tree rotations
      targetRot.set(data.rotation[0], data.rotation[1], data.rotation[2]);
      targetScale = data.scale;
    }

    // 2. Smooth movement (Lerp)
    // Faster reaction when magnifying
    const moveSpeed = delta * (isMagnified ? 5.0 : 2.0 * data.speed);
    
    currentPos.current.lerp(target, moveSpeed);
    currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale, moveSpeed);

    // Apply Position
    groupRef.current.position.copy(currentPos.current);
    groupRef.current.scale.setScalar(currentScale.current);

    // Apply Rotation
    if (isMagnified) {
       // Look at camera when magnified
       groupRef.current.lookAt(camera.position);
    } else {
       // Standard Sway logic
       const time = state.clock.elapsedTime;
       const swayIntensity = morphFactor * 0.1; 
       const randomOffset = data.id.charCodeAt(0);
       
       const rotX = Math.sin(time * 1.5 + randomOffset) * 0.1 * swayIntensity;
       const rotZ = Math.cos(time * 1.2 + randomOffset) * 0.1 * swayIntensity;
       
       // Blend rotation
       groupRef.current.rotation.x = THREE.MathUtils.lerp(data.rotation[0] + time * 0.2, rotX, morphFactor);
       groupRef.current.rotation.y = THREE.MathUtils.lerp(data.rotation[1] + time * 0.2, 0, morphFactor);
       groupRef.current.rotation.z = THREE.MathUtils.lerp(data.rotation[2] + time * 0.2, rotZ, morphFactor);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Polaroid Body (White Card) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.2, 1.5, 0.05]} />
        <meshStandardMaterial 
            color="#fffff0" // Warm white paper
            roughness={0.8}
            metalness={0.0}
        />
      </mesh>

      {/* The Photo Image */}
      {/* Positioned slightly forward z=0.03 to avoid z-fighting */}
      <mesh position={[0, 0.15, 0.03]}>
        <planeGeometry args={[1.0, 1.0]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </group>
  );
};

export const Photos: React.FC<PhotosProps> = ({ photos, morphFactor, isMagnified }) => {
  // Generate position data for photos
  const photoData = useMemo(() => {
    return photos.map((url, index) => {
      // Tree Position: 
      // Use the dense bottom algorithm but bias it slightly outward
      const rawTreePos = getDenseBottomTreePoint(14, 7.5, -7);
      
      const r = Math.sqrt(rawTreePos[0]**2 + rawTreePos[2]**2);
      const pushOut = 1.2; 
      const treePos: [number, number, number] = [
        rawTreePos[0] * pushOut, 
        rawTreePos[1], 
        rawTreePos[2] * pushOut
      ];

      // Scatter Position: Random in large sphere
      const scatterPos = getRandomSpherePoint(30);

      return {
        id: `photo-${index}`,
        url,
        aspectRatio: 1, // Assumed square for now
        treePosition: treePos,
        scatterPosition: scatterPos,
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number],
        scale: 1.5, // Size of the polaroid
        speed: 0.8 + Math.random() * 0.4
      } as PhotoData;
    });
  }, [photos]);

  return (
    <group>
        {photoData.map((data, idx) => (
            <PolaroidItem 
                key={data.id} 
                data={data} 
                morphFactor={morphFactor} 
                isMagnified={isMagnified}
                index={idx}
                total={photoData.length}
            />
        ))}
    </group>
  );
};