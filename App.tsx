
import React, { useState } from 'react';
import { Kiosk } from './pages/Kiosk';
import { AdminDashboard } from './pages/AdminDashboard';
import { Enrollment } from './pages/Enrollment';
import { Analysis } from './pages/Analysis';
import { ApiConfig } from './pages/ApiConfig';
import { AppRoute } from './types';
import { LayoutDashboard, Monitor, Menu, X, ShieldCheck, BarChart3, Settings } from 'lucide-react';

const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.KIOSK);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Developer Mode Logic
  const [devClicks, setDevClicks] = useState(0);
  const [settingsUnlocked, setSettingsUnlocked] = useState(false);

  const navigate = (route: AppRoute) => {
    // If we are leaving the config page, auto-lock the settings behind us
    if (currentRoute === AppRoute.API_CONFIG && route !== AppRoute.API_CONFIG) {
        setSettingsUnlocked(false);
    }
    setCurrentRoute(route);
    setIsMobileMenuOpen(false);
  };

  const handleFooterClick = () => {
    // If already unlocked, do nothing
    if (settingsUnlocked) return;

    const newCount = devClicks + 1;
    setDevClicks(newCount);
    
    if (newCount >= 3) {
        setSettingsUnlocked(true);
        setDevClicks(0);
    }
  };

  const renderScreen = () => {
    switch (currentRoute) {
      case AppRoute.KIOSK:
        return <Kiosk />;
      case AppRoute.ADMIN_DASHBOARD:
        return <AdminDashboard onNavigate={navigate} showSettings={settingsUnlocked} />;
      case AppRoute.ENROLLMENT:
        return <Enrollment onNavigate={navigate} />;
      case AppRoute.ANALYSIS:
        return <Analysis onNavigate={navigate} />;
      case AppRoute.API_CONFIG:
        return <ApiConfig onNavigate={navigate} />;
      default:
        return <Kiosk />;
    }
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-50 flex flex-col overflow-hidden">
      {/* Navigation Bar */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(AppRoute.KIOSK)}>
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-900/50">
              <ShieldCheck size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight leading-none">
              Falgates<span className="text-emerald-500">Rice</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2">
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex">
                <button
                onClick={() => navigate(AppRoute.KIOSK)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentRoute === AppRoute.KIOSK 
                    ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/50' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
                >
                <Monitor size={18} />
                Kiosk Mode
                </button>
                <button
                onClick={() => navigate(AppRoute.ADMIN_DASHBOARD)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentRoute === AppRoute.ADMIN_DASHBOARD || currentRoute === AppRoute.ENROLLMENT
                    ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/50' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
                >
                <LayoutDashboard size={18} />
                Admin
                </button>
                <button
                onClick={() => navigate(AppRoute.ANALYSIS)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentRoute === AppRoute.ANALYSIS
                    ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/50' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
                >
                <BarChart3 size={18} />
                Analysis
                </button>
            </div>

             {/* Only show Settings button if unlocked */}
             {settingsUnlocked && (
                <button
                  onClick={() => navigate(AppRoute.API_CONFIG)}
                  className={`p-3 rounded-xl border transition-all ml-2 animate-in fade-in zoom-in ${
                    currentRoute === AppRoute.API_CONFIG
                      ? 'bg-slate-800 text-emerald-400 border-emerald-900/50'
                      : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900'
                  }`}
                  title="Settings & API Config"
                >
                  <Settings size={20} />
                </button>
             )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-slate-300 active:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-slate-900 border-b border-slate-800 shadow-2xl animate-in slide-in-from-top-5">
             <div className="p-4 flex flex-col gap-2">
                <button
                  onClick={() => navigate(AppRoute.KIOSK)}
                  className={`flex items-center gap-3 p-4 rounded-xl text-base font-medium transition-all ${
                    currentRoute === AppRoute.KIOSK 
                      ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-900/50' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Monitor size={20} />
                  Kiosk Mode
                </button>
                <button
                  onClick={() => navigate(AppRoute.ADMIN_DASHBOARD)}
                  className={`flex items-center gap-3 p-4 rounded-xl text-base font-medium transition-all ${
                    currentRoute === AppRoute.ADMIN_DASHBOARD || currentRoute === AppRoute.ENROLLMENT
                      ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-900/50' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <LayoutDashboard size={20} />
                  Admin Dashboard
                </button>
                <button
                  onClick={() => navigate(AppRoute.ANALYSIS)}
                  className={`flex items-center gap-3 p-4 rounded-xl text-base font-medium transition-all ${
                    currentRoute === AppRoute.ANALYSIS
                      ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-900/50' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <BarChart3 size={20} />
                  Deep Analysis
                </button>
                
                {/* Mobile Hidden Settings */}
                {settingsUnlocked && (
                    <button
                      onClick={() => navigate(AppRoute.API_CONFIG)}
                      className={`flex items-center gap-3 p-4 rounded-xl text-base font-medium transition-all mt-2 border-t border-slate-800 animate-in fade-in slide-in-from-right-5 ${
                        currentRoute === AppRoute.API_CONFIG
                          ? 'text-emerald-400' 
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Settings size={20} />
                      Settings & API Key
                    </button>
                )}
             </div>
          </div>
        )}
      </nav>

      {/* Main Content - No global overflow-auto, handled per page */}
      <main className="flex-1 overflow-hidden bg-slate-950 relative flex flex-col">
        {renderScreen()}
      </main>

      {/* Footer with Secret Trigger */}
      <footer className="bg-slate-950 py-3 border-t border-slate-900 flex justify-center items-center shrink-0 z-50 select-none">
        <p 
            onClick={handleFooterClick}
            className="text-[10px] md:text-xs text-slate-600 font-medium tracking-wide uppercase cursor-pointer active:text-slate-500 transition-colors"
        >
          Developed By <span className="text-emerald-500 font-bold ml-1">Traceroot Technology Solutions</span>
        </p>
      </footer>
    </div>
  );
};

export default App;
