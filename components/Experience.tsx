import React, { useRef, useState, useEffect, Suspense } from 'react';
import { PerspectiveCamera, OrbitControls, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { Star } from './Star';
import { SpiralTrail } from './SpiralTrail';
import { Photos } from './Photos';
import { TreeMorphState } from '../types';

interface ExperienceProps {
  treeState: TreeMorphState;
  handPosition: { x: number; y: number } | null;
  photos: string[];
  isMagnified: boolean;
}

export const Experience: React.FC<ExperienceProps> = ({ treeState, handPosition, photos, isMagnified }) => {
  // We use a spring-like value for smooth morphing even if state toggles instantly
  const [smoothMorph, setSmoothMorph] = useState(0);
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (controlsRef.current) {
      const controls = controlsRef.current;
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      // Set limits directly on the instance to avoid TypeScript errors with OrbitControlsProps
      controls.maxPolarAngle = Math.PI / 1.8;
      controls.minDistance = 15; // Increased min distance
      controls.maxDistance = 50; // Increased max distance
    }
  }, []);

  // Update controls dynamically
  useEffect(() => {
    if (controlsRef.current) {
      // Disable autoRotate if hand controlling OR if photos are magnified
      controlsRef.current.autoRotate = treeState === TreeMorphState.TREE_SHAPE && !handPosition && !isMagnified;
      controlsRef.current.autoRotateSpeed = 0.5;
    }
  }, [treeState, handPosition, isMagnified]);

  useFrame((state, delta) => {
    const target = treeState === TreeMorphState.TREE_SHAPE ? 1 : 0;
    // Standard lerp for the "global" morph factor
    // Speed: 1.5 for a nice luxurious slow transition
    const step = delta * 1.5; 
    
    let next = smoothMorph;
    if (smoothMorph < target) {
      next = Math.min(target, smoothMorph + step);
    } else if (smoothMorph > target) {
      next = Math.max(target, smoothMorph - step);
    }
    
    if (next !== smoothMorph) {
        setSmoothMorph(next);
    }
    
    // Hand Control for Camera
    // Disabled when Magnified to allow user to focus on photos
    if (handPosition && controlsRef.current && !isMagnified) {
        // Map hand inputs to angles
        const targetAzimuth = handPosition.x * -1.2; 
        const targetPolar = Math.PI / 2.2 - (handPosition.y * 0.5); 

        const vec = new THREE.Vector3().copy(camera.position);
        const spherical = new THREE.Spherical().setFromVector3(vec);
        
        spherical.theta = THREE.MathUtils.lerp(spherical.theta, targetAzimuth, delta * 3);
        spherical.phi = THREE.MathUtils.lerp(spherical.phi, targetPolar, delta * 3);
        spherical.phi = Math.max(0.1, Math.min(Math.PI / 1.6, spherical.phi)); 
        
        vec.setFromSpherical(spherical);
        camera.position.copy(vec);
        camera.lookAt(0, 0, 0);
    }
  });

  return (
    <>
      {/* Camera moved back to frame the larger tree */}
      <PerspectiveCamera makeDefault position={[0, 6, 28]} fov={45} />
      <OrbitControls 
        ref={controlsRef}
        // Configuration handled in useEffect to satisfy TS
      />

      {/* Lighting Setup - High Contrast Luxury */}
      <ambientLight intensity={0.1} color="#001a10" />
      
      {/* Main Spotlight (Warm/Golden) - Moved higher and further back */}
      <spotLight 
        position={[15, 25, 15]} 
        angle={0.4} 
        penumbra={1} 
        intensity={3} 
        castShadow 
        color="#FFE5B4" // Peach/Gold tint
        shadow-bias={-0.0001}
      />
      
      {/* Rim Light for that cinematic edge */}
      <spotLight 
        position={[-15, 10, -5]} 
        angle={0.5} 
        intensity={2} 
        color="#006633" // Emerald rim
      />
      
      {/* Fill Light */}
      <pointLight position={[0, 5, 10]} intensity={0.5} color="#FFD700" />

      {/* Environment for Metallic Reflections - LOBBY */}
      <Environment preset="lobby" background={false} />

      {/* Scene Content */}
      <group position={[0, -5, 0]}>
        <Foliage morphFactor={smoothMorph} />
        <Ornaments targetMorphFactor={smoothMorph} />
        <SpiralTrail morphFactor={smoothMorph} />
        <Suspense fallback={null}>
            <Photos photos={photos} morphFactor={smoothMorph} isMagnified={isMagnified} />
        </Suspense>
        <Star morphFactor={smoothMorph} />
      </group>

      {/* Post Processing for Cinematic Golden Halo */}
      <EffectComposer enableNormalPass={false}>
        <Bloom 
          luminanceThreshold={0.8} // Only very bright things glow
          luminanceSmoothing={0.025} 
          intensity={1.2} // Requested Intensity
          levels={9}
          mipmapBlur 
        />
        <Vignette eskil={false} offset={0.1} darkness={1.2} />
      </EffectComposer>
    </>
  );
};