import React, { useState, useEffect } from 'react';
import { CameraFrame } from '../components/CameraFrame';
import { dbService } from '../services/db';
import { checkImageQuality } from '../services/geminiService';
import { DistributionUnit, StaffMember, AppRoute } from '../types';
import { Save, AlertCircle, CheckCircle, Loader2, ArrowLeft, Camera, Fingerprint } from 'lucide-react';

interface EnrollmentProps {
  onNavigate: (route: AppRoute) => void;
}

export const Enrollment: React.FC<EnrollmentProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    id: 'Generating...',
    unit: DistributionUnit.PLATFORM_A
  });
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [qualityCheck, setQualityCheck] = useState<{ valid: boolean; reason: string } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Auto-generate ID on mount
    const fetchNextId = async () => {
      try {
        const nextId = await dbService.getNextId();
        setFormData(prev => ({ ...prev, id: nextId }));
      } catch (e) {
        console.error("Failed to generate ID", e);
        setFormData(prev => ({ ...prev, id: 'ERROR' }));
      }
    };
    fetchNextId();
  }, []);

  const handleCapture = async (img: string) => {
    setCapturedImage(img);
    setIsChecking(true);
    setQualityCheck(null);
    
    const result = await checkImageQuality(img);
    setQualityCheck(result);
    setIsChecking(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedImage || !qualityCheck?.valid || !formData.fullName) return;

    setIsSaving(true);
    try {
      // Create Mock Embedding (since we are using Gemini for verification, we store a dummy vector for data structure compliance)
      const mockEmbedding = Array.from({ length: 128 }, () => Math.random());

      const newStaff: StaffMember = {
        id: formData.id,
        fullName: formData.fullName,
        assignedUnit: formData.unit,
        registeredAt: Date.now(),
        faceEmbedding: mockEmbedding,
        referenceImageBase64: capturedImage
      };

      await dbService.addStaff(newStaff);
      onNavigate(AppRoute.ADMIN_DASHBOARD);
    } catch (err) {
      alert(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Compute form validity and button label
  const isIdReady = formData.id !== 'Generating...' && formData.id !== 'ERROR';
  const isNameReady = formData.fullName.trim().length > 0;
  const isPhotoReady = capturedImage && !isChecking && qualityCheck?.valid;
  
  const canSubmit = isIdReady && isNameReady && isPhotoReady && !isSaving;

  let buttonText = "Complete Enrollment";
  if (isSaving) buttonText = "Registering...";
  else if (!isIdReady) buttonText = "Generating ID...";
  else if (!isNameReady) buttonText = "Enter Staff Name";
  else if (!capturedImage) buttonText = "Capture Photo Required";
  else if (isChecking) buttonText = "Analyzing Quality...";
  else if (!qualityCheck?.valid) buttonText = "Invalid Photo - Retake";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 md:p-8 pb-20">
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => onNavigate(AppRoute.ADMIN_DASHBOARD)} className="bg-slate-900 p-2 rounded-lg text-slate-400 hover:text-white border border-slate-800">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Enroll New Staff</h1>
            <p className="text-slate-500 text-sm">Register personnel to database.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Biometrics */}
          <div className="flex flex-col gap-4 order-2 lg:order-1">
            <div className="bg-slate-900 p-2 rounded-3xl border border-slate-800 shadow-xl overflow-hidden relative aspect-[4/3] lg:aspect-auto lg:h-[500px]">
              {!capturedImage ? (
                <CameraFrame onCapture={handleCapture} label="Enrollment Camera" />
              ) : (
                <div className="relative w-full h-full rounded-2xl overflow-hidden group">
                  <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                  {/* Overlay gradient for better button visibility on mobile */}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent pointer-events-none md:hidden" />
                  
                  <button 
                    type="button"
                    onClick={() => setCapturedImage(null)}
                    className="absolute bottom-4 right-4 z-20 bg-white text-slate-900 px-4 py-2 md:px-6 md:py-3 rounded-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm md:text-base cursor-pointer"
                  >
                    <Camera size={18} className="md:w-5 md:h-5" /> Retake
                  </button>
                </div>
              )}
            </div>

            {/* AI Feedback */}
            {capturedImage && (
              <div className={`p-5 rounded-2xl border flex items-start gap-4 animate-in slide-in-from-bottom-5 ${
                isChecking 
                  ? 'bg-blue-950/40 border-blue-900 text-blue-200' 
                  : qualityCheck?.valid 
                    ? 'bg-emerald-950/40 border-emerald-900 text-emerald-200' 
                    : 'bg-red-950/40 border-red-900 text-red-200'
              }`}>
                {isChecking ? (
                  <Loader2 className="animate-spin shrink-0 mt-1" />
                ) : qualityCheck?.valid ? (
                  <CheckCircle className="shrink-0 mt-1" />
                ) : (
                  <AlertCircle className="shrink-0 mt-1" />
                )}
                <div>
                  <p className="font-bold text-lg">
                    {isChecking ? 'Checking Photo Quality...' : qualityCheck?.valid ? 'Photo Approved' : 'Photo Rejected'}
                  </p>
                  <p className="text-sm opacity-80 mt-1 leading-relaxed">
                    {isChecking ? "AI is analyzing lighting and face visibility." : qualityCheck?.reason}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Form */}
          <div className="bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 order-1 lg:order-2 h-fit">
            <form onSubmit={handleSave} className="space-y-6">
              
              {/* Auto-Generated ID Badge */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Assigned Staff ID</p>
                  <p className="text-2xl font-mono text-emerald-400 font-bold tracking-wider">{formData.id}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-emerald-600 border border-slate-800">
                  <Fingerprint size={24} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Full Name</label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none text-lg transition-all focus:border-emerald-500/50"
                  placeholder="e.g. John Doe"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Assigned Distribution Unit</label>
                <div className="relative">
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none text-lg appearance-none cursor-pointer transition-all focus:border-emerald-500/50"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value as DistributionUnit })}
                  >
                    {Object.values(DistributionUnit).map(u => (
                      <option key={u} value={u}>{u.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`w-full flex items-center justify-center gap-3 p-5 rounded-xl font-bold text-lg transition-all shadow-lg ${
                    !canSubmit
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {isSaving ? <Loader2 className="animate-spin" size={24} /> : canSubmit ? <Save size={24} /> : <AlertCircle size={24} />}
                  {buttonText}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};