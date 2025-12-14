import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 3000;

// Shader to animate particles along a spiral path
const SpiralMaterial = {
  vertexShader: `
    uniform float uTime;
    uniform float uMorphFactor; // 0=Scatter, 1=Tree
    
    attribute float aIndex;
    attribute float aRandom;
    
    varying float vAlpha;
    varying vec3 vColor;

    #define PI 3.14159265359

    void main() {
      // Create a continuous flow 0..1 based on time
      // Slightly slower speed for "slowly condensing" feel
      float cycle = mod(uTime * 0.15 + aIndex, 1.0);
      
      // --- Tree Shape: Conical Spiral ---
      // Scaled up to match new tree: Height from -8 to +10
      float h = -8.0 + cycle * 18.0;
      
      // Radius narrows as it goes up
      // Base Radius 9.0 (wider than foliage)
      float rBase = 9.0;
      float r = rBase * (1.0 - cycle) + 0.5; // taper to top
      
      // Spiral rotation (6 full turns for density)
      float angle = cycle * PI * 12.0;
      
      vec3 treePos = vec3(
        cos(angle) * r,
        h,
        sin(angle) * r
      );
      
      // Add "Pixie Dust" Scatter offset
      // Particles jitter around the main spiral line to create a "trail"
      float jitterRad = 0.8 * aRandom;
      vec3 jitter = vec3(
        cos(aIndex * 150.0) * jitterRad,
        sin(aIndex * 80.0) * jitterRad,
        sin(aIndex * 40.0) * jitterRad
      );
      
      vec3 finalPos = treePos + jitter;
      
      // --- Scattering Logic ---
      // When tree scatters (morphFactor -> 0), particles explode outward
      vec3 scatterPos = normalize(finalPos) * (20.0 + aRandom * 10.0);
      finalPos = mix(scatterPos, finalPos, uMorphFactor);

      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      
      // Size: Larger at bottom, smaller at top
      float size = (20.0 * (1.0 - cycle) + 5.0) * aRandom;
      gl_PointSize = size * (1.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;

      // Color Gradient: Deep Gold at bottom -> Red/Gold mix -> Pure Bright Gold Sparkle at top
      vec3 gold = vec3(1.0, 0.84, 0.0);
      vec3 red = vec3(1.0, 0.1, 0.2); // Bright red
      
      // Mix red into the middle of the spiral
      float redMix = sin(cycle * PI); // 0 at ends, 1 in middle
      vColor = mix(gold, red, redMix * 0.6); 
      
      // Twinkle alpha
      float twinkle = sin(uTime * 4.0 + aRandom * 50.0);
      
      // Soft fade in/out at ends of spiral
      vAlpha = smoothstep(0.0, 0.1, cycle) * (1.0 - smoothstep(0.95, 1.0, cycle)); 
      vAlpha *= (0.7 + 0.3 * twinkle);
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      // Soft particle texture
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      float alpha = 1.0 - smoothstep(0.1, 0.5, dist);
      
      // Sharp bright core for "star" effect
      float core = 1.0 - smoothstep(0.0, 0.1, dist);
      
      if (alpha < 0.01) discard;

      // Add extra brightness for bloom to create "glowing" effect
      vec3 finalColor = vColor + vec3(core * 0.8); 

      gl_FragColor = vec4(finalColor, alpha * vAlpha);
    }
  `
};

interface SpiralTrailProps {
  morphFactor: number;
}

export const SpiralTrail: React.FC<SpiralTrailProps> = ({ morphFactor }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  const { index, random } = useMemo(() => {
    const idx = new Float32Array(PARTICLE_COUNT);
    const rnd = new Float32Array(PARTICLE_COUNT);
    
    for(let i=0; i<PARTICLE_COUNT; i++) {
      idx[i] = i / PARTICLE_COUNT; // Normalized index 0..1
      rnd[i] = Math.random();
    }
    return { index: idx, random: rnd };
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
          attach="attributes-aIndex" 
          count={PARTICLE_COUNT} 
          array={index} 
          itemSize={1} 
        />
        <bufferAttribute 
          attach="attributes-aRandom" 
          count={PARTICLE_COUNT} 
          array={random} 
          itemSize={1} 
        />
        <bufferAttribute 
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={new Float32Array(PARTICLE_COUNT * 3)}
            itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        vertexShader={SpiralMaterial.vertexShader}
        fragmentShader={SpiralMaterial.fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uMorphFactor: { value: 0 }
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};