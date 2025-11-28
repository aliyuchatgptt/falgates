import React, { useState, useEffect } from 'react';
import { CameraFrame } from '../components/CameraFrame';
import { dbService } from '../services/db';
import { verifyIdentityWithGemini } from '../services/geminiService';
import { StaffMember, RecognitionResult } from '../types';
import { Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';

export const Kiosk: React.FC = () => {
  const [mode, setMode] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'FAILURE'>('IDLE');
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  useEffect(() => {
    dbService.getAllStaff().then(setStaffList).catch(console.error);
  }, []);

  const handleLiveCapture = async (liveImage: string) => {
    if (mode === 'SCANNING') return;

    setMode('SCANNING');
    
    if (staffList.length === 0) {
      setResult({ isMatch: false, confidence: 0, message: "No staff database found." });
      setMode('FAILURE');
      setTimeout(() => setMode('IDLE'), 3000);
      return;
    }

    try {
      let foundMatch: RecognitionResult | null = null;
      // Demo logic: Check first few staff members to save tokens/time
      // In production with real embeddings, you'd sort by vector distance first
      for (const staff of staffList) {
        const verify = await verifyIdentityWithGemini(liveImage, staff.referenceImageBase64);
        if (verify.match && verify.confidence > 80) {
          foundMatch = {
            isMatch: true,
            confidence: verify.confidence,
            staffMember: staff,
            message: verify.explanation
          };
          break;
        }
      }

      if (foundMatch && foundMatch.staffMember) {
        setResult(foundMatch);
        setMode('SUCCESS');

        // --- Log the Check-In ---
        await dbService.logCheckIn({
          staffId: foundMatch.staffMember.id,
          staffName: foundMatch.staffMember.fullName,
          assignedUnit: foundMatch.staffMember.assignedUnit,
          timestamp: Date.now(),
          confidenceScore: foundMatch.confidence
        });

      } else {
        setResult({ isMatch: false, confidence: 0, message: "Identity could not be verified." });
        setMode('FAILURE');
      }
    } catch (e) {
      console.error(e);
      setResult({ isMatch: false, confidence: 0, message: "System error during verification." });
      setMode('FAILURE');
    } finally {
      setTimeout(() => {
        setMode('IDLE');
        setResult(null);
      }, 5000);
    }
  };

  return (
    <div className="h-full w-full flex flex-col relative bg-black overflow-hidden">
      
      {/* Fullscreen Camera Area */}
      <div className="flex-1 relative overflow-hidden">
        <CameraFrame 
           onCapture={handleLiveCapture} 
           autoStart={true} 
           label={mode === 'SCANNING' ? 'ANALYZING BIOMETRICS...' : 'LIVE IDENTIFICATION'}
           mode="fullscreen"
        />

        {/* Scanning Overlay Effect */}
        {mode === 'SCANNING' && (
          <div className="absolute inset-0 bg-black/40 z-10 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-300">
            <Loader2 className="w-16 h-16 text-emerald-400 animate-spin mb-4" />
            <div className="text-emerald-400 font-mono text-xl tracking-widest animate-pulse">PROCESSING</div>
          </div>
        )}

        {/* Idle Instructions */}
        {mode === 'IDLE' && (
          <div className="absolute top-20 left-0 right-0 z-10 text-center pointer-events-none px-4">
             <h2 className="text-3xl font-bold text-white drop-shadow-md mb-2">Staff Check-In</h2>
             <p className="text-white/80 text-sm bg-black/40 inline-block px-3 py-1 rounded-full backdrop-blur-md">
               Center face & tap capture button
             </p>
          </div>
        )}
      </div>

      {/* Result Bottom Sheet */}
      <div 
        className={`absolute bottom-0 left-0 right-0 z-30 transition-transform duration-500 ease-out transform ${
          mode === 'SUCCESS' || mode === 'FAILURE' ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className={`rounded-t-3xl p-6 pb-12 shadow-2xl border-t-2 ${
          mode === 'SUCCESS' 
            ? 'bg-slate-900/95 border-emerald-500 shadow-emerald-900/50' 
            : 'bg-slate-900/95 border-red-500 shadow-red-900/50'
        } backdrop-blur-xl`}>
          
          <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-6"></div>

          {mode === 'SUCCESS' && result?.staffMember && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500 text-slate-900 mb-4 shadow-lg ring-4 ring-emerald-500/20 animate-in zoom-in duration-300">
                <ShieldCheck size={40} />
              </div>
              <h2 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-1">Access Granted</h2>
              <h1 className="text-3xl font-bold text-white mb-6">{result.staffMember.fullName}</h1>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                  <p className="text-slate-400 text-xs uppercase mb-1">Staff ID</p>
                  <p className="text-xl font-mono text-white">{result.staffMember.id}</p>
                </div>
                <div className="bg-emerald-900/20 p-4 rounded-2xl border border-emerald-500/30">
                   <p className="text-emerald-400/70 text-xs uppercase mb-1">Assigned Unit</p>
                   <p className="text-xl font-bold text-emerald-300 leading-tight">
                     {result.staffMember.assignedUnit.replace(/_/g, ' ')}
                   </p>
                </div>
              </div>
            </div>
          )}

          {mode === 'FAILURE' && (
             <div className="text-center">
               <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500 text-white mb-4 shadow-lg ring-4 ring-red-500/20 animate-in shake duration-300">
                 <ShieldAlert size={40} />
               </div>
               <h2 className="text-red-400 text-sm font-bold uppercase tracking-wider mb-1">Verification Failed</h2>
               <h3 className="text-2xl font-bold text-white mb-4">No Match Found</h3>
               <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">{result?.message || "Please ensure you are registered or try again in better lighting."}</p>
               
               <button 
                 onClick={() => setMode('IDLE')}
                 className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-semibold transition-colors"
               >
                 Try Again
               </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};