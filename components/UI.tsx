import React, { useRef } from 'react';
import { TreeMorphState } from '../types';

interface UIProps {
  currentState: TreeMorphState;
  onToggle: (state: TreeMorphState) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UI: React.FC<UIProps> = ({ currentState, onToggle, onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
      {/* Header */}
      <div className="flex flex-col items-center pt-2">
        <h1 className="text-3xl md:text-5xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-[#D4AF37] to-[#8a6e1e] drop-shadow-md tracking-widest uppercase text-center">
          Merry Christmas
        </h1>
        <p className="text-[#004225] text-xs font-light tracking-[0.3em] mt-1 bg-white/10 backdrop-blur-sm px-3 py-0.5 rounded-full">
          HOLIDAY COLLECTION 2025
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center pb-4 pointer-events-auto gap-3">
        
        {/* Main Toggles */}
        <div className="flex gap-4 bg-black/20 backdrop-blur-md p-1.5 rounded-full border border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.2)] scale-90 origin-bottom">
          <button
            onClick={() => onToggle(TreeMorphState.SCATTERED)}
            className={`
              px-6 py-2 rounded-full font-serif text-sm transition-all duration-500
              ${currentState === TreeMorphState.SCATTERED 
                ? 'bg-[#D4AF37] text-[#002211] shadow-[0_0_15px_rgba(212,175,55,0.5)]' 
                : 'text-[#D4AF37] hover:bg-[#D4AF37]/10'}
            `}
          >
            Chaos
          </button>
          <button
            onClick={() => onToggle(TreeMorphState.TREE_SHAPE)}
            className={`
              px-6 py-2 rounded-full font-serif text-sm transition-all duration-500
              ${currentState === TreeMorphState.TREE_SHAPE 
                ? 'bg-[#D4AF37] text-[#002211] shadow-[0_0_15px_rgba(212,175,55,0.5)]' 
                : 'text-[#D4AF37] hover:bg-[#D4AF37]/10'}
            `}
          >
            Form
          </button>
        </div>

        {/* Upload Button */}
        <div className="scale-90 origin-bottom">
           <input 
             type="file" 
             multiple 
             accept="image/*" 
             ref={fileInputRef} 
             onChange={onUpload} 
             className="hidden" 
           />
           <button 
             onClick={handleUploadClick}
             className="
               px-5 py-1.5 rounded-full font-serif text-xs tracking-widest
               border border-[#D4AF37] text-[#D4AF37]
               bg-[#002211]/80 backdrop-blur-sm
               hover:bg-[#D4AF37] hover:text-[#002211]
               transition-all duration-300
               shadow-[0_0_10px_rgba(212,175,55,0.1)]
               flex items-center gap-2
             "
           >
             <span className="text-sm">+</span> ADD MEMORIES
           </button>
        </div>

      </div>
    </div>
  );
};