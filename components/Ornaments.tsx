import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getDenseBottomTreePoint, getRandomSpherePoint } from '../utils/math';
import { OrnamentData } from '../types';

interface OrnamentsProps {
  targetMorphFactor: number; // 0 to 1
}

// MASSIVE COUNT for dense, luxurious look
const COUNT = 1200; 
const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export const Ornaments: React.FC<OrnamentsProps> = ({ targetMorphFactor }) => {
  const baubleRef = useRef<THREE.InstancedMesh>(null);
  const giftRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.InstancedMesh>(null);

  // Generate data
  const { baubles, gifts, lights } = useMemo(() => {
    const _baubles: OrnamentData[] = [];
    const _gifts: OrnamentData[] = [];
    const _lights: OrnamentData[] = [];

    // Trump-Style Luxury Palette:
    // Gold, Deep Red, Pearl White, Emerald Green
    const colors = [
      '#FFD700', // Gold
      '#D4AF37', // Metallic Gold
      '#8B0000', // Deep Red
      '#F0F0F0', // Pearl
      '#004225'  // Emerald
    ];
    
    // Light colors (Warmer)
    const lightColors = ['#FFFDD0', '#FFD700', '#FF8C00'];

    for (let i = 0; i < COUNT; i++) {
      const rand = Math.random();
      let type: 'heavy' | 'light' | 'extra-light' = 'light';
      
      if (rand < 0.15) type = 'heavy';      // 15% Gifts
      else if (rand < 0.60) type = 'light'; // 45% Baubles
      else type = 'extra-light';            // 40% Lights (More sparkle)

      // Use Weighted Point Generation for Bottom Density
      // Tree is Height 16, Base -8. 
      // Ornaments slightly inside: Height 15.5, Radius 7.0, Offset -7.5
      const tPos = getDenseBottomTreePoint(15.5, 7.0, -7.5);
      const sPos = getRandomSpherePoint(25); 
      
      // Tighter packing
      const r = Math.sqrt(tPos[0]*tPos[0] + tPos[2]*tPos[2]);
      const angle = Math.atan2(tPos[2], tPos[0]);
      // Reduced offset to keep decorations "in" the branches
      const offset = type === 'heavy' ? 0.3 : type === 'light' ? 0.2 : 0.4;
      tPos[0] += Math.cos(angle) * offset;
      tPos[2] += Math.sin(angle) * offset;

      let speed = 2.0;
      let scale = 1.0;
      let color = colors[Math.floor(Math.random() * colors.length)];

      // SCALES: Kept small for density
      if (type === 'heavy') {
        speed = 0.8 + Math.random() * 0.7;
        scale = 0.4 + Math.random() * 0.25; 
      } else if (type === 'light') {
        speed = 2.0 + Math.random() * 1.5;
        scale = 0.2 + Math.random() * 0.15; 
      } else {
        speed = 4.0 + Math.random() * 2.0;
        scale = 0.06 + Math.random() * 0.04; 
        color = lightColors[Math.floor(Math.random() * lightColors.length)];
      }

      const data: OrnamentData = {
        id: i,
        type,
        treePosition: tPos,
        scatterPosition: sPos,
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
        scale,
        speed, 
        color
      };

      if (type === 'heavy') _gifts.push(data);
      else if (type === 'light') _baubles.push(data);
      else _lights.push(data);
    }
    return { baubles: _baubles, gifts: _gifts, lights: _lights };
  }, []);

  const currentPositions = useRef<{ [key: string]: THREE.Vector3 }>({});
  
  useLayoutEffect(() => {
    // Init refs
    [...baubles, ...gifts, ...lights].forEach(item => {
      currentPositions.current[`${item.type}-${item.id}`] = new THREE.Vector3(...item.scatterPosition);
    });
  }, [baubles, gifts, lights]);

  useFrame((state, delta) => {
    const dt = delta * 1.5; // Global speed multiplier

    const updateMesh = (mesh: THREE.InstancedMesh, data: OrnamentData[]) => {
      if (!mesh) return;

      data.forEach((item, i) => {
        const key = `${item.type}-${item.id}`;
        const currentPos = currentPositions.current[key];
        
        // Target is mixture of Tree and Scatter based on state
        const targetX = THREE.MathUtils.lerp(item.scatterPosition[0], item.treePosition[0], targetMorphFactor);
        const targetY = THREE.MathUtils.lerp(item.scatterPosition[1], item.treePosition[1], targetMorphFactor);
        const targetZ = THREE.MathUtils.lerp(item.scatterPosition[2], item.treePosition[2], targetMorphFactor);
        
        // Silky Lerp: Different items arrive at different times
        const lerpSpeed = dt * item.speed; 
        
        if (currentPos) {
          currentPos.x = THREE.MathUtils.lerp(currentPos.x, targetX, lerpSpeed);
          currentPos.y = THREE.MathUtils.lerp(currentPos.y, targetY, lerpSpeed);
          currentPos.z = THREE.MathUtils.lerp(currentPos.z, targetZ, lerpSpeed);

          // Add floating noise
          const time = state.clock.elapsedTime;
          // Heavy items float less
          const noiseAmp = item.type === 'heavy' ? 0.01 : item.type === 'extra-light' ? 0.05 : 0.02;
          const noiseY = Math.sin(time + item.id * 0.5) * noiseAmp;
          
          tempObject.position.set(currentPos.x, currentPos.y + noiseY, currentPos.z);
          tempObject.rotation.set(
            item.rotation[0] + time * 0.1, 
            item.rotation[1] + time * 0.1, 
            item.rotation[2]
          );
          tempObject.scale.setScalar(item.scale);
          tempObject.updateMatrix();
          
          mesh.setMatrixAt(i, tempObject.matrix);
        }
      });
      mesh.instanceMatrix.needsUpdate = true;
    };

    updateMesh(baubleRef.current!, baubles);
    updateMesh(giftRef.current!, gifts);
    updateMesh(lightRef.current!, lights);
  });

  // Helper to set colors once
  const setColors = (mesh: THREE.InstancedMesh | null, data: OrnamentData[]) => {
    if(!mesh) return;
    data.forEach((item, i) => {
        tempColor.set(item.color);
        mesh.setColorAt(i, tempColor);
    });
    mesh.instanceColor!.needsUpdate = true;
  };

  useLayoutEffect(() => {
    setColors(baubleRef.current, baubles);
    setColors(giftRef.current, gifts);
    setColors(lightRef.current, lights);
  }, [baubles, gifts, lights]);

  return (
    <>
      {/* Baubles - High Polish Metallic Spheres */}
      <instancedMesh ref={baubleRef} args={[undefined, undefined, baubles.length]} castShadow receiveShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial 
          metalness={0.95} 
          roughness={0.05} 
          envMapIntensity={2.0}
        />
      </instancedMesh>

      {/* Gifts - Glossy Wrapped Boxes */}
      <instancedMesh ref={giftRef} args={[undefined, undefined, gifts.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          metalness={0.6} 
          roughness={0.2} 
          envMapIntensity={1.2}
        />
      </instancedMesh>

      {/* Lights - Glowing Particles */}
      <instancedMesh ref={lightRef} args={[undefined, undefined, lights.length]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial 
          toneMapped={false}
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={3.0} // High intensity to drive Bloom
        />
      </instancedMesh>
    </>
  );
};