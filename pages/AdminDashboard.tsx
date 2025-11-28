
import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { StaffMember, AppRoute } from '../types';
import { Trash2, UserPlus, Search, Users, MapPin, Fingerprint, Calendar, Settings } from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (route: AppRoute) => void;
  showSettings?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, showSettings = false }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadStaff = async () => {
    const data = await dbService.getAllStaff();
    setStaff(data);
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this staff member?')) {
      await dbService.deleteStaff(id);
      loadStaff();
    }
  };

  const filteredStaff = staff.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 md:p-8 pb-32">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Users className="text-emerald-400 hidden md:block" />
              Staff Management
            </h1>
            <p className="text-slate-400 text-sm md:text-base mt-1">Manage personnel records and assignments.</p>
          </div>
          
          <div className="flex gap-2">
            {showSettings && (
                <button 
                    onClick={() => onNavigate(AppRoute.API_CONFIG)}
                    className="hidden md:flex bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white px-4 py-3 rounded-xl font-semibold items-center gap-2 border border-slate-800 transition-all animate-in fade-in zoom-in"
                    title="Configure API Key"
                >
                    <Settings size={20} />
                </button>
            )}
            <button 
                onClick={() => onNavigate(AppRoute.ENROLLMENT)}
                className="hidden md:flex bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all hover:scale-105 active:scale-95"
            >
                <UserPlus size={20} />
                <span>Add New Staff</span>
            </button>
          </div>
        </div>

        {/* Sticky Search Bar */}
        <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-md py-4 mb-4 -mx-4 px-4 md:mx-0 md:px-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input 
              type="text"
              placeholder="Search by name or ID..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none shadow-lg placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 text-sm uppercase tracking-wider">
                <th className="p-5 font-semibold">Profile</th>
                <th className="p-5 font-semibold">Staff ID</th>
                <th className="p-5 font-semibold">Full Name</th>
                <th className="p-5 font-semibold">Assigned Unit</th>
                <th className="p-5 font-semibold">Registered</th>
                <th className="p-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredStaff.length > 0 ? (
                filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-5">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-950">
                        <img src={member.referenceImageBase64} alt={member.fullName} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="p-5 font-mono text-emerald-400 font-medium">{member.id}</td>
                    <td className="p-5 font-medium text-white">{member.fullName}</td>
                    <td className="p-5">
                      <span className="bg-slate-950 px-3 py-1 rounded-md border border-slate-700 text-xs font-mono text-slate-300">
                        {member.assignedUnit.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-5 text-sm text-slate-500">
                      {new Date(member.registeredAt).toLocaleDateString()}
                      <span className="block text-xs text-slate-600">
                         {new Date(member.registeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <button 
                        onClick={() => handleDelete(member.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-2 hover:bg-slate-800 rounded-lg"
                        title="Delete Staff"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500">
                    No staff records found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards List */}
        <div className="md:hidden space-y-4">
          {filteredStaff.length > 0 ? (
            filteredStaff.map((member) => (
              <div key={member.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-md flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shrink-0">
                  <img src={member.referenceImageBase64} alt={member.fullName} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold truncate pr-2">{member.fullName}</h3>
                    <button 
                      onClick={() => handleDelete(member.id)}
                      className="text-slate-600 hover:text-red-400 p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="text-emerald-500 font-mono text-xs mb-1 flex items-center gap-1">
                    <Fingerprint size={12} /> {member.id}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-slate-400 text-xs flex items-center gap-1">
                        <MapPin size={12} /> {member.assignedUnit.replace(/_/g, ' ')}
                    </p>
                    <p className="text-slate-600 text-xs flex items-center gap-1">
                        <Calendar size={12} /> {new Date(member.registeredAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-500">
              No records found.
            </div>
          )}
        </div>

        {/* Mobile FAB - High Z-index to float above footer */}
        <button 
          onClick={() => onNavigate(AppRoute.ENROLLMENT)}
          className="md:hidden fixed bottom-20 right-6 w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-900/50 z-[60] active:scale-95 transition-transform"
        >
          <UserPlus size={24} />
        </button>
      </div>
    </div>
  );
};
