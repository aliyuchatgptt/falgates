import React, { useRef, useEffect, useState } from 'react';
import { RefreshCw, ScanFace } from 'lucide-react';

interface CameraFrameProps {
  onCapture?: (imageBase64: string) => void;
  autoStart?: boolean;
  label?: string;
  mode?: 'default' | 'fullscreen'; // New prop to control styling
}

export const CameraFrame: React.FC<CameraFrameProps> = ({ 
  onCapture, 
  autoStart = true, 
  label,
  mode = 'default' 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      console.error(err);
      setError('Camera access denied or unavailable.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (autoStart) startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current && onCapture) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Flip horizontally to match the mirrored video
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onCapture(dataUrl);
      }
    }
  };

  // Styles based on mode
  const containerClasses = mode === 'fullscreen'
    ? "relative w-full h-full bg-black overflow-hidden" // No border, no radius for kiosk
    : "relative w-full h-full bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800"; // Card style

  // Move controls higher up in fullscreen to avoid bottom nav/safe areas
  const controlsPosition = mode === 'fullscreen' ? 'bottom-8 md:bottom-12' : 'bottom-6';

  return (
    <div className={containerClasses}>
      
      {/* Label Badge */}
      {label && <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider border border-white/10">{label}</div>}
      
      {/* Error State */}
      {error ? (
        <div className="flex items-center justify-center h-full bg-slate-900 text-red-400 p-6 text-center">
          <div>
            <ScanFace className="w-12 h-12 mx-auto mb-2 opacity-50" />
            {error}
          </div>
        </div>
      ) : (
        <div className="relative h-full w-full">
           <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover transform scale-x-[-1]" 
          />
          
          {/* Face Guide Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
             <div className="w-64 h-80 border-2 border-dashed border-white rounded-[40%]"></div>
          </div>
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls Overlay */}
      <div className={`absolute ${controlsPosition} left-0 right-0 flex justify-center items-center gap-6 z-20`}>
        {!stream && !error && (
          <button onClick={startCamera} className="bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-full shadow-lg transition-all active:scale-95">
            <RefreshCw size={24} />
          </button>
        )}
        {stream && onCapture && (
          <button 
            onClick={handleCapture}
            className="group relative flex items-center justify-center"
            title="Capture Photo"
          >
            <div className="w-20 h-20 rounded-full border-4 border-white/80 flex items-center justify-center transition-all group-active:scale-95 bg-white/10 backdrop-blur-sm">
               <div className="w-16 h-16 bg-white rounded-full shadow-inner group-hover:bg-slate-100"></div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};