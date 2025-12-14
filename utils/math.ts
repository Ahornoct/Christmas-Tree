import * as THREE from 'three';

// Helper to generate a random point inside a sphere
export const getRandomSpherePoint = (radius: number): [number, number, number] => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  const sinPhi = Math.sin(phi);
  return [
    r * sinPhi * Math.cos(theta),
    r * sinPhi * Math.sin(theta),
    r * Math.cos(phi)
  ];
};

// Standard Tree Point (Linear distribution)
export const getTreePoint = (height: number, radiusBase: number, yOffset: number = -5): [number, number, number] => {
  const h = Math.random() * height; 
  const y = h + yOffset;
  const r = (height - h) / height * radiusBase;
  const theta = Math.random() * Math.PI * 2;
  const thickness = Math.random() * 0.8; 
  
  return [
    (r + thickness) * Math.cos(theta),
    y,
    (r + thickness) * Math.sin(theta)
  ];
};

// NEW: Bottom-Heavy Tree Point (Exponential distribution for density)
export const getDenseBottomTreePoint = (height: number, radiusBase: number, yOffset: number = -5): [number, number, number] => {
  // Use power > 1 to bias random value towards 0 (bottom of the tree height-wise)
  // height 12, yOffset -5. h=0 is bottom.
  const bias = Math.pow(Math.random(), 1.5); // 1.5 power curve favors the bottom
  const h = bias * height; 
  
  const y = h + yOffset;
  
  // Radius calculation
  const r = (height - h) / height * radiusBase;
  
  const theta = Math.random() * Math.PI * 2;
  // Reduce thickness variance for tighter packing
  const thickness = Math.random() * 0.5; 
  
  return [
    (r + thickness) * Math.cos(theta),
    y,
    (r + thickness) * Math.sin(theta)
  ];
};

export const normalizeValue = (val: number, min: number, max: number) => (val - min) / (max - min);