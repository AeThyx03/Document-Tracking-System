import React, { useState } from 'react';
import { AppUserRole, UserRoleType, DocumentItem, RegistryDropdownOptions } from '../types';
import { X, User, Trash2, Key, Plus, ShieldCheck, Settings2, Sparkles, Building, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RolesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AppUserRole | null;
  onSelectUser: (user: AppUserRole) => void;
  staffList: AppUserRole[];
  onAddStaffMember: (newStaff: AppUserRole & { password?: string }) => Promise<void> | void;
  onUpdateStaffRole: (staffId: string, newRole: UserRoleType, newDivision?: string) => Promise<void> | void;
  onDeleteStaffMember: (staffId: string) => Promise<void> | void;
  documents: DocumentItem[];
  dropdownOptions: RegistryDropdownOptions;
  onUpdateDropdownOptions: (newOptions: RegistryDropdownOptions) => void;
  onUpdateStaffCredentials?: (
    staffId: string,
    updates: {
      name?: string;
      role?: UserRoleType;
      division?: string;
      username?: string;
      status?: 'active' | 'suspended';
      email?: string;
      password?: string;
    }
  ) => Promise<void> | void;
  onImportStaff?: (importedStaff: any, newOptions: any) => Promise<void> | void;
}

export const RolesManagementModal: React.FC<RolesManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  staffList,
  onAddStaffMember,
  onUpdateStaffRole,
  onDeleteStaffMember,
  documents,
  dropdownOptions,
  onUpdateDropdownOptions,
  onUpdateStaffCredentials,
  onImportStaff,
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'add'>('directory');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">User & Role Management</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage personnel access and roles</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
             <button
                className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'directory' ? 'border-indigo-500 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                onClick={() => setActiveTab('directory')}
             >
                Personnel Directory
             </button>
             <button
                className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'add' ? 'border-indigo-500 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                onClick={() => setActiveTab('add')}
             >
                Add New Personnel
             </button>
          </div>
          {/* Main content */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
            {activeTab === 'directory' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {staffList.map(staff => (
                  <div key={staff.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-between shadow-sm">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{staff.name}</h3>
                      <p className="text-xs text-slate-500">{staff.role} • {staff.division}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <button
                        onClick={() => onDeleteStaffMember(staff.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors cursor-pointer"
                        title="Delete User"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'add' && (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const email = (formData.get('email') as string) || '';
                const name = (formData.get('name') as string) || '';
                const username = email.includes('@') ? email.split('@')[0] : name.toLowerCase().replace(/\s+/g, '_');
                onAddStaffMember({
                  id: 'usr_' + Date.now().toString(36),
                  username,
                  name,
                  role: formData.get('role') as any,
                  division: formData.get('division') as string,
                  email,
                  isFocalPerson: formData.get('isFocalPerson') === 'on'
                });
                setActiveTab('directory');
              }} className="max-w-xl mx-auto space-y-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-500" />
                    Personnel Details
                 </h3>
                 
                 <div>
                   <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                   <input required name="name" type="text" className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Role</label>
                     <select required name="role" className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500">
                        {dropdownOptions.roles.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                     </select>
                   </div>
                   <div>
                     <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Division</label>
                     <select required name="division" className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500">
                        {dropdownOptions.departments.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                     </select>
                   </div>
                 </div>

                 <div>
                   <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                   <input name="email" type="email" className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
                 </div>
                 
                 <div className="flex items-center gap-2 pt-2">
                   <input type="checkbox" name="isFocalPerson" id="isFocalPerson" className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
                   <label htmlFor="isFocalPerson" className="text-sm font-medium text-slate-700 dark:text-slate-300">Designate as Distribution Desk Focal Person</label>
                 </div>

                 <div className="pt-4 flex justify-end">
                    <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-md">
                      Register Personnel
                    </button>
                 </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};