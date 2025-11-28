
import React, { useState, useEffect } from 'react';
import { AppRoute } from '../types';
import { dbService } from '../services/db';
import { clearApiKeyCache } from '../services/geminiService';
import { ArrowLeft, Save, Key, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface ApiConfigProps {
  onNavigate: (route: AppRoute) => void;
}

export const ApiConfig: React.FC<ApiConfigProps> = ({ onNavigate }) => {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'LOADING' | 'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('LOADING');
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const storedKey = await dbService.getSetting('GEMINI_API_KEY');
        if (storedKey) setApiKey(storedKey);
      } catch (e) {
        console.error('Failed to load API key:', e);
      } finally {
        setStatus('IDLE');
      }
    };
    loadApiKey();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setStatus('SAVING');
    setTestResult('');

    try {
      // Basic validation: Try to instantiate the client
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      // Optional: A lightweight call to verify the key works
      // We'll just assume validity if instantiation doesn't fail, 
      // but a real "check" would require making a request.
      // Let's do a quick dry-run with a tiny prompt to verify.
      try {
        await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { text: "Ping" }
        });
      } catch (apiError: any) {
        throw new Error("Invalid API Key or Service Unavailable: " + (apiError.message || apiError));
      }

      await dbService.setSetting('GEMINI_API_KEY', apiKey);
      clearApiKeyCache(); // Clear cache so new key is used
      setStatus('SUCCESS');
      setTestResult('Key verified and saved successfully.');
      
      setTimeout(() => {
        onNavigate(AppRoute.ADMIN_DASHBOARD);
      }, 1500);

    } catch (error: any) {
      console.error(error);
      setStatus('ERROR');
      setTestResult(error.message || 'Failed to save API Key.');
    }
  };

  const handleClear = async () => {
    if(confirm("Are you sure? This will remove the custom API key.")) {
      try {
        await dbService.deleteSetting('GEMINI_API_KEY');
        clearApiKeyCache(); // Clear cache so environment key is used
        setApiKey('');
        setTestResult('Custom key removed. App will attempt to use default environment key.');
        setStatus('IDLE');
      } catch (e) {
        console.error('Failed to delete API key:', e);
        setTestResult('Failed to remove API key.');
        setStatus('ERROR');
      }
    }
  };

  if (status === 'LOADING') {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => onNavigate(AppRoute.ADMIN_DASHBOARD)} className="bg-slate-900 p-2 rounded-lg text-slate-400 hover:text-white border border-slate-800">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Key className="text-emerald-400" />
              API Configuration
            </h1>
            <p className="text-slate-500 text-sm">Manage fallback credentials for facial recognition.</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl">
          <div className="flex items-center justify-center w-16 h-16 bg-slate-800 rounded-full mx-auto mb-6 text-emerald-400">
             <Shield size={32} />
          </div>
          
          <h2 className="text-center text-xl font-bold text-white mb-2">Gemini API Key</h2>
          <p className="text-center text-slate-400 text-sm mb-8 px-4">
            If the system cannot access the environment key, it will fall back to the key provided here. 
            This data is stored securely in the cloud database.
          </p>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Enter API Key</label>
              <input
                type="password"
                required
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm tracking-widest transition-all"
              />
            </div>

            {status === 'ERROR' && (
              <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl flex items-start gap-3 text-red-300 text-sm animate-in fade-in">
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <p>{testResult}</p>
              </div>
            )}

            {status === 'SUCCESS' && (
              <div className="p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-xl flex items-start gap-3 text-emerald-300 text-sm animate-in fade-in">
                <CheckCircle className="shrink-0 mt-0.5" size={16} />
                <p>{testResult}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-4">
              <button
                type="submit"
                disabled={status === 'SAVING'}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === 'SAVING' ? 'Verifying...' : 'Verify & Save Key'} <Save size={20} />
              </button>
              
              {apiKey && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-full bg-transparent hover:bg-slate-800 text-slate-500 hover:text-red-400 p-3 rounded-xl font-medium transition-colors text-sm"
                >
                  Clear Saved Key
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
