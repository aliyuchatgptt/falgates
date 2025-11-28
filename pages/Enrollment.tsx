import React, { useState, useEffect } from 'react';
import { CameraFrame } from '../components/CameraFrame';
import { dbService } from '../services/db';
import { checkImageQuality } from '../services/geminiService';
import { DistributionUnit, StaffMember, AppRoute, ImageAngleType } from '../types';
import { Save, AlertCircle, CheckCircle, Loader2, ArrowLeft, Camera, Fingerprint, User, ChevronLeft, ChevronRight } from 'lucide-react';

interface EnrollmentProps {
  onNavigate: (route: AppRoute) => void;
}

interface CapturedPhoto {
  imageBase64: string;
  angleType: ImageAngleType;
  isValid: boolean;
  reason: string;
}

const PHOTO_ANGLES: { type: ImageAngleType; label: string; instruction: string }[] = [
  { type: 'front', label: 'Front View', instruction: 'Look directly at the camera' },
  { type: 'left', label: 'Left Profile', instruction: 'Turn your head slightly to the left' },
  { type: 'right', label: 'Right Profile', instruction: 'Turn your head slightly to the right' },
];

export const Enrollment: React.FC<EnrollmentProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    id: 'Generating...',
    unit: DistributionUnit.PLATFORM_A
  });
  
  // Multi-photo capture state
  const [currentAngleIndex, setCurrentAngleIndex] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
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

  const currentAngle = PHOTO_ANGLES[currentAngleIndex];
  const currentCapturedPhoto = capturedPhotos.find(p => p.angleType === currentAngle.type);
  const allPhotosValid = PHOTO_ANGLES.every(angle => 
    capturedPhotos.some(p => p.angleType === angle.type && p.isValid)
  );

  const handleCapture = async (img: string) => {
    setIsChecking(true);
    
    const result = await checkImageQuality(img);
    
    const newPhoto: CapturedPhoto = {
      imageBase64: img,
      angleType: currentAngle.type,
      isValid: result.valid,
      reason: result.reason,
    };

    // Replace existing photo for this angle or add new
    setCapturedPhotos(prev => {
      const filtered = prev.filter(p => p.angleType !== currentAngle.type);
      return [...filtered, newPhoto];
    });
    
    setIsChecking(false);

    // Auto-advance to next angle if photo is valid and not on last angle
    if (result.valid && currentAngleIndex < PHOTO_ANGLES.length - 1) {
      setTimeout(() => setCurrentAngleIndex(currentAngleIndex + 1), 1000);
    }
  };

  const handleRetake = () => {
    setCapturedPhotos(prev => prev.filter(p => p.angleType !== currentAngle.type));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allPhotosValid || !formData.fullName) return;

    setIsSaving(true);
    try {
      const mockEmbedding = Array.from({ length: 128 }, () => Math.random());
      
      // Use front photo as the primary reference image
      const frontPhoto = capturedPhotos.find(p => p.angleType === 'front');
      
      const newStaff: StaffMember = {
        id: formData.id,
        fullName: formData.fullName,
        assignedUnit: formData.unit,
        registeredAt: Date.now(),
        faceEmbedding: mockEmbedding,
        referenceImageBase64: frontPhoto!.imageBase64
      };

      // Save staff member first
      await dbService.addStaff(newStaff);

      // Save all images to staff_images table
      const imagesToSave = capturedPhotos.map(p => ({
        imageBase64: p.imageBase64,
        angleType: p.angleType,
      }));
      await dbService.addStaffImages(formData.id, imagesToSave);

      onNavigate(AppRoute.ADMIN_DASHBOARD);
    } catch (err) {
      alert(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Compute form validity
  const isIdReady = formData.id !== 'Generating...' && formData.id !== 'ERROR';
  const isNameReady = formData.fullName.trim().length > 0;
  const canSubmit = isIdReady && isNameReady && allPhotosValid && !isSaving;

  let buttonText = "Complete Enrollment";
  if (isSaving) buttonText = "Registering...";
  else if (!isIdReady) buttonText = "Generating ID...";
  else if (!isNameReady) buttonText = "Enter Staff Name";
  else if (!allPhotosValid) buttonText = `Capture All ${PHOTO_ANGLES.length} Photos`;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 md:p-8 pb-20">
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => onNavigate(AppRoute.ADMIN_DASHBOARD)} className="bg-slate-900 p-2 rounded-lg text-slate-400 hover:text-white border border-slate-800">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Enroll New Staff</h1>
            <p className="text-slate-500 text-sm">Capture 3 photos from different angles for accurate recognition.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Multi-Photo Capture */}
          <div className="flex flex-col gap-4 order-2 lg:order-1">
            
            {/* Photo Progress Indicator */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-400">Photo Progress</span>
                <span className="text-sm font-mono text-emerald-400">
                  {capturedPhotos.filter(p => p.isValid).length} / {PHOTO_ANGLES.length}
                </span>
              </div>
              <div className="flex gap-2">
                {PHOTO_ANGLES.map((angle, idx) => {
                  const photo = capturedPhotos.find(p => p.angleType === angle.type);
                  const isActive = idx === currentAngleIndex;
                  const isComplete = photo?.isValid;
                  
                  return (
                    <button
                      key={angle.type}
                      onClick={() => setCurrentAngleIndex(idx)}
                      className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                        isActive 
                          ? 'border-emerald-500 bg-emerald-500/10' 
                          : isComplete 
                            ? 'border-emerald-600/50 bg-emerald-900/20' 
                            : 'border-slate-700 bg-slate-800/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {isComplete ? (
                          <CheckCircle size={20} className="text-emerald-400" />
                        ) : (
                          <User size={20} className={isActive ? 'text-emerald-400' : 'text-slate-500'} />
                        )}
                        <span className={`text-xs font-medium ${
                          isActive ? 'text-emerald-400' : isComplete ? 'text-emerald-500' : 'text-slate-500'
                        }`}>
                          {angle.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Camera / Preview Area */}
            <div className="bg-slate-900 p-2 rounded-3xl border border-slate-800 shadow-xl overflow-hidden relative aspect-[4/3] lg:aspect-auto lg:h-[400px]">
              {!currentCapturedPhoto ? (
                <>
                  <CameraFrame onCapture={handleCapture} label={currentAngle.label} />
                  {/* Angle instruction overlay */}
                  <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
                    <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 text-center">
                      <p className="text-white font-medium">{currentAngle.instruction}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="relative w-full h-full rounded-2xl overflow-hidden group">
                  <img src={currentCapturedPhoto.imageBase64} alt={currentAngle.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent pointer-events-none md:hidden" />
                  
                  <button 
                    type="button"
                    onClick={handleRetake}
                    className="absolute bottom-4 right-4 z-20 bg-white text-slate-900 px-4 py-2 md:px-6 md:py-3 rounded-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm md:text-base cursor-pointer"
                  >
                    <Camera size={18} className="md:w-5 md:h-5" /> Retake
                  </button>
                </div>
              )}
            </div>

            {/* Navigation buttons for angles */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentAngleIndex(Math.max(0, currentAngleIndex - 1))}
                disabled={currentAngleIndex === 0}
                className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <ChevronLeft size={20} /> Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentAngleIndex(Math.min(PHOTO_ANGLES.length - 1, currentAngleIndex + 1))}
                disabled={currentAngleIndex === PHOTO_ANGLES.length - 1}
                className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                Next <ChevronRight size={20} />
              </button>
            </div>

            {/* AI Feedback */}
            {(isChecking || currentCapturedPhoto) && (
              <div className={`p-5 rounded-2xl border flex items-start gap-4 animate-in slide-in-from-bottom-5 ${
                isChecking 
                  ? 'bg-blue-950/40 border-blue-900 text-blue-200' 
                  : currentCapturedPhoto?.isValid 
                    ? 'bg-emerald-950/40 border-emerald-900 text-emerald-200' 
                    : 'bg-red-950/40 border-red-900 text-red-200'
              }`}>
                {isChecking ? (
                  <Loader2 className="animate-spin shrink-0 mt-1" />
                ) : currentCapturedPhoto?.isValid ? (
                  <CheckCircle className="shrink-0 mt-1" />
                ) : (
                  <AlertCircle className="shrink-0 mt-1" />
                )}
                <div>
                  <p className="font-bold text-lg">
                    {isChecking ? 'Checking Photo Quality...' : currentCapturedPhoto?.isValid ? 'Photo Approved' : 'Photo Rejected'}
                  </p>
                  <p className="text-sm opacity-80 mt-1 leading-relaxed">
                    {isChecking ? "AI is analyzing lighting and face visibility." : currentCapturedPhoto?.reason}
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

              {/* Photo Thumbnails Summary */}
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Captured Photos</label>
                <div className="grid grid-cols-3 gap-2">
                  {PHOTO_ANGLES.map((angle) => {
                    const photo = capturedPhotos.find(p => p.angleType === angle.type);
                    return (
                      <div 
                        key={angle.type}
                        className={`aspect-square rounded-xl border-2 overflow-hidden ${
                          photo?.isValid 
                            ? 'border-emerald-500' 
                            : photo 
                              ? 'border-red-500' 
                              : 'border-slate-700 bg-slate-800'
                        }`}
                      >
                        {photo ? (
                          <img src={photo.imageBase64} alt={angle.label} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User size={24} className="text-slate-600" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Front • Left • Right
                </p>
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
