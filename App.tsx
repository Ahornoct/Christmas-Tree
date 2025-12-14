import React, { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Experience } from './components/Experience';
import { UI } from './components/UI';
import { GestureController } from './components/GestureController';
import { TreeMorphState } from './types';

const App: React.FC = () => {
  const [treeState, setTreeState] = useState<TreeMorphState>(TreeMorphState.TREE_SHAPE);
  const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
  const [isMagnified, setIsMagnified] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const handleStateChange = useCallback((newState: TreeMorphState) => {
    setTreeState(prev => prev !== newState ? newState : prev);
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos: string[] = [];
      Array.from(e.target.files).forEach(file => {
        const url = URL.createObjectURL(file);
        newPhotos.push(url);
      });
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#00110a] overflow-hidden">
      
      {/* Hand Tracking Controller (Top Right) */}
      <GestureController 
        onStateChange={handleStateChange}
        onHandMove={setHandPosition}
        onMagnify={setIsMagnified}
      />

      {/* 3D Canvas */}
      <Canvas
        shadows
        dpr={[1, 2]} // Support retina displays
        gl={{ 
          antialias: false, 
          toneMapping: 3, // ACESFilmicToneMapping
          toneMappingExposure: 1.2
        }}
      >
        <Experience 
            treeState={treeState} 
            handPosition={handPosition} 
            photos={photos} 
            isMagnified={isMagnified}
        />
      </Canvas>

      {/* UI Overlay */}
      <UI 
        currentState={treeState} 
        onToggle={setTreeState} 
        onUpload={handleUpload}
      />
      
      {/* Loading Screen */}
      <Loader 
        containerStyles={{ background: '#00110a' }}
        innerStyles={{ background: '#004225', width: '200px', height: '2px' }}
        barStyles={{ background: '#D4AF37', height: '2px' }}
        dataStyles={{ fontFamily: 'serif', color: '#D4AF37' }}
      />
    </div>
  );
};

export default App;