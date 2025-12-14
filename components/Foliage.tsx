import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTreePoint, getRandomSpherePoint } from '../utils/math';

const PARTICLE_COUNT = 20000;

// Custom Shader for the Foliage
// This handles the interpolation (morphing) on the GPU for maximum performance
const FoliageMaterial = {
  vertexShader: `
    uniform float uTime;
    uniform float uMorphFactor; // 0.0 = Scattered, 1.0 = Tree
    
    attribute vec3 aTreePos;
    attribute vec3 aScatterPos;
    attribute float aRandom;
    
    varying vec3 vColor;
    varying float vAlpha;

    // Cubic Bezier Ease In Out approximation
    float easeInOutCubic(float x) {
      return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
    }

    void main() {
      // Smooth morph transition
      float progress = easeInOutCubic(uMorphFactor);
      
      // Interpolate position
      vec3 finalPos = mix(aScatterPos, aTreePos, progress);
      
      // Add "Breathing" / Wind effect based on time and randomness
      // More movement when scattered, subtle shimmering when in tree form
      float breathe = sin(uTime * 2.0 + aRandom * 10.0) * 0.1;
      finalPos.y += breathe;
      finalPos.x += cos(uTime + aRandom * 5.0) * 0.05;

      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      
      // Size attenuation based on depth
      gl_PointSize = (40.0 * aRandom + 20.0) * (1.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;

      // Color logic: Mix Deep Emerald with Golden tips
      // Updated for "Trump Luxury": Deeper darker green, sharper gold
      vec3 emerald = vec3(0.0, 0.157, 0.082); // #002815 Deep Luxurious Green
      vec3 gold = vec3(1.0, 0.84, 0.0);       // #FFD700 Gold
      
      // Tips of the tree (higher Y) or random sparkles get gold
      float isTip = smoothstep(0.85, 1.0, aRandom);
      vColor = mix(emerald, gold, isTip * 0.9);
      
      // Fade out slightly when scattered to reduce visual noise
      vAlpha = 0.6 + 0.4 * progress; 
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      // Create a soft circular particle
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
      
      if (alpha < 0.01) discard;

      gl_FragColor = vec4(vColor, alpha * vAlpha);
    }
  `
};

interface FoliageProps {
  morphFactor: number; // 0 to 1
}

export const Foliage: React.FC<FoliageProps> = ({ morphFactor }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  // Generate geometry data once
  const { positions, treePositions, scatterPositions, randoms } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const treePos = new Float32Array(PARTICLE_COUNT * 3);
    const scatterPos = new Float32Array(PARTICLE_COUNT * 3);
    const rnd = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Tree Shape: Cone
      // Scaled UP: Height 16, Radius 7.5, Base Y -8
      const [tx, ty, tz] = getTreePoint(16, 7.5, -8);
      treePos[i * 3] = tx;
      treePos[i * 3 + 1] = ty;
      treePos[i * 3 + 2] = tz;

      // Scatter Shape: Large Sphere
      // Scaled UP scatter area
      const [sx, sy, sz] = getRandomSpherePoint(25);
      scatterPos[i * 3] = sx;
      scatterPos[i * 3 + 1] = sy;
      scatterPos[i * 3 + 2] = sz;

      // Initial buffer geometry needs values
      pos[i * 3] = sx;
      pos[i * 3 + 1] = sy;
      pos[i * 3 + 2] = sz;

      rnd[i] = Math.random();
    }
    return { 
      positions: pos, 
      treePositions: treePos, 
      scatterPositions: scatterPos, 
      randoms: rnd 
    };
  }, []);

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      shaderRef.current.uniforms.uMorphFactor.value = morphFactor;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTreePos"
          count={PARTICLE_COUNT}
          array={treePositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScatterPos"
          count={PARTICLE_COUNT}
          array={scatterPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={PARTICLE_COUNT}
          array={randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        vertexShader={FoliageMaterial.vertexShader}
        fragmentShader={FoliageMaterial.fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uMorphFactor: { value: 0 },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};