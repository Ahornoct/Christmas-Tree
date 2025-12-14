import React, { useEffect, useRef, useState } from 'react';
import { TreeMorphState } from '../types';

// Declare globals loaded via script tags
declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}

interface GestureControllerProps {
  onStateChange: (state: TreeMorphState) => void;
  onHandMove: (pos: { x: number; y: number } | null) => void;
  onMagnify: (isMagnified: boolean) => void;
}

export const GestureController: React.FC<GestureControllerProps> = ({ onStateChange, onHandMove, onMagnify }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'active' | 'error'>('loading');
  const [gestureLabel, setGestureLabel] = useState<string>('');

  useEffect(() => {
    let camera: any = null;
    let hands: any = null;

    const onResults = (results: any) => {
      if (!canvasRef.current || !videoRef.current) return;

      const canvasCtx = canvasRef.current.getContext('2d');
      if (!canvasCtx) return;

      // 1. Draw Camera Feed & Skeleton
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw video frame
      canvasCtx.drawImage(
        results.image, 0, 0, canvasRef.current.width, canvasRef.current.height
      );

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        setStatus('active');
        const landmarks = results.multiHandLandmarks[0];

        // Draw Skeleton
        if (window.drawConnectors && window.HAND_CONNECTIONS) {
          window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {
            color: '#00FF00', 
            lineWidth: 2 
          });
        }
        if (window.drawLandmarks) {
          window.drawLandmarks(canvasCtx, landmarks, {
            color: '#FF0000', 
            lineWidth: 1, 
            radius: 3 
          });
        }

        // --- Logic: Detect Fist vs Open ---
        
        // Helper: Check if finger is curled
        const wrist = landmarks[0];
        const isFingerOpen = (tipIdx: number, pipIdx: number) => {
           const dTip = Math.hypot(landmarks[tipIdx].x - wrist.x, landmarks[tipIdx].y - wrist.y);
           const dPip = Math.hypot(landmarks[pipIdx].x - wrist.x, landmarks[pipIdx].y - wrist.y);
           return dTip > dPip;
        };

        const indexOpen = isFingerOpen(8, 6);
        const middleOpen = isFingerOpen(12, 10);
        const ringOpen = isFingerOpen(16, 14);
        const pinkyOpen = isFingerOpen(20, 18);
        const thumbOpen = isFingerOpen(4, 2); 

        const openCount = [indexOpen, middleOpen, ringOpen, pinkyOpen, thumbOpen].filter(Boolean).length;

        // --- Logic: Detect Pinch/Catch (Index Tip + Thumb Tip close) ---
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        
        // Threshold for pinch (relative to normalized coords)
        const isPinching = pinchDist < 0.05;

        // Priority Logic:
        if (isPinching) {
            onMagnify(true);
            setGestureLabel('CATCH');
        } else {
            onMagnify(false);
            
            // Only change tree state if NOT pinching
            if (openCount <= 1) {
                onStateChange(TreeMorphState.TREE_SHAPE);
                setGestureLabel('FORM');
            } else if (openCount >= 4) {
                onStateChange(TreeMorphState.SCATTERED);
                setGestureLabel('UNLEASH');
            } else {
                setGestureLabel('TRACKING');
            }
        }

        // --- Logic: Position Tracking ---
        const p = landmarks[9]; // Middle finger MCP
        onHandMove({
            x: (1 - p.x - 0.5) * 2, 
            y: (p.y - 0.5) * 2 
        });

      } else {
        onHandMove(null);
        setGestureLabel('NO HAND');
        onMagnify(false);
      }
      canvasCtx.restore();
    };

    const init = async () => {
      try {
        if (!window.Hands) {
           console.error("MediaPipe Hands not loaded yet");
           setTimeout(init, 500); 
           return;
        }

        hands = new window.Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults(onResults);

        if (videoRef.current) {
          camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (hands) await hands.send({image: videoRef.current});
            },
            width: 320,
            height: 240
          });
          await camera.start();
        }
      } catch (e) {
        console.error(e);
        setStatus('error');
      }
    };

    init();

    return () => {
      if (camera) camera.stop();
      if (hands) hands.close();
    };
  }, [onStateChange, onHandMove, onMagnify]);

  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Visual Feedback Window */}
      <div className="relative rounded-lg overflow-hidden border border-[#D4AF37]/50 shadow-[0_0_20px_rgba(212,175,55,0.3)] bg-black/80 w-[160px] h-[120px]">
         <video 
           ref={videoRef} 
           className="hidden" 
           playsInline 
           muted
         />
         <canvas 
           ref={canvasRef} 
           width={320} 
           height={240} 
           className="w-full h-full object-cover transform -scale-x-100" 
         />
         
         {/* Status Label */}
         <div className="absolute bottom-2 left-2 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
            <span className="text-[10px] text-white/80 font-sans tracking-wider uppercase">
               {status === 'active' ? gestureLabel : status === 'loading' ? 'Initializing...' : 'Camera Error'}
            </span>
         </div>
      </div>
      
      {/* Legend */}
      <div className="bg-black/40 backdrop-blur-md p-3 rounded-lg border border-white/10 text-[10px] text-[#D4AF37] font-sans scale-90 origin-top-right">
        <div className="flex justify-between gap-4 mb-1">
          <span>OPEN HAND</span>
          <span className="text-white font-bold">UNLEASH</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span>FIST</span>
          <span className="text-white font-bold">FORM TREE</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>PINCH</span>
          <span className="text-white font-bold">CATCH & VIEW</span>
        </div>
      </div>
    </div>
  );
};