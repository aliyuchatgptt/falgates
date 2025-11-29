
import React, { useState, useEffect } from 'react';
import { AppRoute } from '../types';
import { dbService } from '../services/db';
import { clearApiKeyCache } from '../services/geminiService';
import { 
  createFaceSet, 
  clearCredentialsCache, 
  hasFaceSet, 
  isConfigured as isFacePPConfigured,
  getFaceSetInfo 
} from '../services/faceplusplus';
import { ArrowLeft, Save, Key, Shield, CheckCircle, AlertCircle, Loader2, Scan, Database } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface ApiConfigProps {
  onNavigate: (route: AppRoute) => void;
}

export const ApiConfig: React.FC<ApiConfigProps> = ({ onNavigate }) => {
  // Gemini state
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiStatus, setGeminiStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [geminiMessage, setGeminiMessage] = useState('');

  // Face++ state
  const [faceppKey, setFaceppKey] = useState('');
  const [faceppSecret, setFaceppSecret] = useState('');
  const [faceppStatus, setFaceppStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [faceppMessage, setFaceppMessage] = useState('');
  const [facesetInitialized, setFacesetInitialized] = useState(false);
  const [faceCount, setFaceCount] = useState<number | null>(null);
  const [initializingFaceset, setInitializingFaceset] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load Gemini key
      const storedGeminiKey = await dbService.getSetting('GEMINI_API_KEY');
      if (storedGeminiKey) setGeminiKey(storedGeminiKey);

      // Load Face++ credentials
      const storedFaceppKey = await dbService.getSetting('FACEPP_API_KEY');
      const storedFaceppSecret = await dbService.getSetting('FACEPP_API_SECRET');
      if (storedFaceppKey) setFaceppKey(storedFaceppKey);
      if (storedFaceppSecret) setFaceppSecret(storedFaceppSecret);

      // Check FaceSet status
      const hasSet = await hasFaceSet();
      setFacesetInitialized(hasSet);

      if (hasSet) {
        const info = await getFaceSetInfo();
        if (info.success) {
          setFaceCount(info.faceCount || 0);
        }
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  };

  // Gemini handlers
  const handleSaveGemini = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiKey.trim()) return;

    setGeminiStatus('SAVING');
    setGeminiMessage('');

    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      
      try {
        await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { text: "Ping" }
        });
      } catch (apiError: any) {
        throw new Error("Invalid API Key: " + (apiError.message || apiError));
      }

      await dbService.setSetting('GEMINI_API_KEY', geminiKey);
      clearApiKeyCache();
      setGeminiStatus('SUCCESS');
      setGeminiMessage('Gemini API key verified and saved.');
    } catch (error: any) {
      setGeminiStatus('ERROR');
      setGeminiMessage(error.message || 'Failed to save API Key.');
    }
  };

  // Face++ handlers
  const handleSaveFacepp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faceppKey.trim() || !faceppSecret.trim()) return;

    setFaceppStatus('SAVING');
    setFaceppMessage('');

    try {
      await dbService.setSetting('FACEPP_API_KEY', faceppKey);
      await dbService.setSetting('FACEPP_API_SECRET', faceppSecret);
      clearCredentialsCache();
      
      setFaceppStatus('SUCCESS');
      setFaceppMessage('Face++ credentials saved. Now initialize the FaceSet below.');
    } catch (error: any) {
      setFaceppStatus('ERROR');
      setFaceppMessage(error.message || 'Failed to save credentials.');
    }
  };

  const handleInitializeFaceSet = async () => {
    setInitializingFaceset(true);
    setFaceppMessage('');

    try {
      const result = await createFaceSet('FalgatesStaff');
      
      if (result.success) {
        setFacesetInitialized(true);
        setFaceCount(0);
        setFaceppStatus('SUCCESS');
        setFaceppMessage('FaceSet created successfully! You can now enroll staff with Face++.');
      } else {
        setFaceppStatus('ERROR');
        setFaceppMessage(result.error || 'Failed to create FaceSet.');
      }
    } catch (error: any) {
      setFaceppStatus('ERROR');
      setFaceppMessage(error.message || 'Failed to initialize FaceSet.');
    } finally {
      setInitializingFaceset(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 md:p-8 pb-20">
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => onNavigate(AppRoute.ADMIN_DASHBOARD)} className="bg-slate-900 p-2 rounded-lg text-slate-400 hover:text-white border border-slate-800">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Key className="text-emerald-400" />
              API Configuration
            </h1>
            <p className="text-slate-500 text-sm">Configure facial recognition and AI services.</p>
          </div>
        </div>

        {/* Face++ Configuration - Primary */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
              <Scan size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Face++ Recognition</h2>
              <p className="text-slate-400 text-sm">Primary facial recognition service</p>
            </div>
          </div>

          {/* FaceSet Status */}
          {facesetInitialized && (
            <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-4 mb-6 flex items-center gap-3">
              <Database size={20} className="text-emerald-400" />
              <div>
                <p className="text-emerald-300 font-medium">FaceSet Active</p>
                <p className="text-emerald-400/70 text-sm">{faceCount} faces enrolled</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveFacepp} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">API Key</label>
              <input
                type="password"
                required
                placeholder="Your Face++ API Key"
                value={faceppKey}
                onChange={(e) => setFaceppKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm tracking-widest transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">API Secret</label>
              <input
                type="password"
                required
                placeholder="Your Face++ API Secret"
                value={faceppSecret}
                onChange={(e) => setFaceppSecret(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm tracking-widest transition-all"
              />
            </div>

            {faceppStatus === 'ERROR' && (
              <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl flex items-start gap-3 text-red-300 text-sm">
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <p>{faceppMessage}</p>
              </div>
            )}

            {faceppStatus === 'SUCCESS' && (
              <div className="p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-xl flex items-start gap-3 text-emerald-300 text-sm">
                <CheckCircle className="shrink-0 mt-0.5" size={16} />
                <p>{faceppMessage}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={faceppStatus === 'SAVING'}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {faceppStatus === 'SAVING' ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Save Credentials
              </button>

              {!facesetInitialized && faceppKey && faceppSecret && (
                <button
                  type="button"
                  onClick={handleInitializeFaceSet}
                  disabled={initializingFaceset}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {initializingFaceset ? <Loader2 className="animate-spin" size={20} /> : <Database size={20} />}
                  Initialize FaceSet
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Gemini Configuration - Secondary */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Gemini AI</h2>
              <p className="text-slate-400 text-sm">Used for image quality checks</p>
            </div>
          </div>

          <form onSubmit={handleSaveGemini} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">API Key</label>
              <input
                type="password"
                required
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm tracking-widest transition-all"
              />
            </div>

            {geminiStatus === 'ERROR' && (
              <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl flex items-start gap-3 text-red-300 text-sm">
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <p>{geminiMessage}</p>
              </div>
            )}

            {geminiStatus === 'SUCCESS' && (
              <div className="p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-xl flex items-start gap-3 text-emerald-300 text-sm">
                <CheckCircle className="shrink-0 mt-0.5" size={16} />
                <p>{geminiMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={geminiStatus === 'SAVING'}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {geminiStatus === 'SAVING' ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Save Gemini Key
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
