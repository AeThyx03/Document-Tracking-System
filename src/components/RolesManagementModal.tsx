import React, { useState, useEffect } from 'react';
import { AppUserRole, UserRoleType, DocumentItem, RegistryDropdownOptions } from '../types';
import { ROLE_CONFIGS, getRoleConfig } from '../mockData';
import { PossdLogo } from './PossdLogo';
import {
  Users,
  ShieldCheck,
  UserPlus,
  CheckCircle2,
  Lock,
  ArrowRight,
  Briefcase,
  Building,
  Mail,
  X,
  Plus,
  ChevronRight,
  FileText,
  AlertCircle,
  Trash2,
  Sparkles,
  Check,
  SlidersHorizontal,
  Settings2,
  Shield,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  UserCheck,
  Ban
} from 'lucide-react';

interface RolesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUserRole;
  onSelectUser: (user: AppUserRole) => void;
  staffList: AppUserRole[];
  onAddStaffMember: (newStaff: AppUserRole) => void;
  onUpdateStaffRole: (staffId: string, newRole: UserRoleType) => void;
  onDeleteStaffMember: (staffId: string) => void;
  documents: DocumentItem[];
  dropdownOptions: RegistryDropdownOptions;
  onUpdateDropdownOptions: (newOptions: RegistryDropdownOptions) => void;
  onUpdateStaffCredentials?: (
    staffId: string,
    updates: { username?: string; password?: string; status?: 'active' | 'suspended' }
  ) => void;
}

const SYSTEM_ROLES: string[] = [
  'Admin Staff',
  'Staff',
  'Supervisor',
  'Division Manager',
  'Department Manager',
  'System Admin',
];

const DEFAULT_DEPARTMENTS: string[] = [
  'Central Records & Receiving Desk',
  'Finance & Budget Division',
  'Planning & Quality Assurance',
  'Executive Office of the Manager',
  'Information & Records Technology',
  'General Administration & HR',
];

const DEFAULT_DESKS: string[] = [
  'Records Receiving Counter A',
  'Finance Evaluation Bay 1',
  'Planning Drafting Bay 2',
  'Central Manager Suite 101',
  'Executive Review Table',
  'Central Registry Systems Hub',
];

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
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'dropdown_options' | 'add' | 'permissions'>('directory');

  // Combined roles, departments, and desks
  const availableRoles = Array.from(new Set([...dropdownOptions.roles, ...SYSTEM_ROLES]));
  const availableDepartments = dropdownOptions.departments.length > 0 ? dropdownOptions.departments : DEFAULT_DEPARTMENTS;
  const availableDesks = dropdownOptions.desks.length > 0 ? dropdownOptions.desks : DEFAULT_DESKS;

  // Quick staff form state
  const [quickName, setQuickName] = useState('');
  const [quickRole, setQuickRole] = useState<string>(availableRoles[0] || 'Admin Staff');
  const [quickDivision, setQuickDivision] = useState<string>(availableDepartments[0] || 'Central Records & Receiving Desk');

  // Confirmation state for deletion
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Detailed Enrollment form state
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<string>(availableRoles[0] || 'Admin Staff');
  const [newDivision, setNewDivision] = useState<string>(availableDepartments[0] || 'Central Records & Receiving Desk');
  const [newDesk, setNewDesk] = useState<string>(availableDesks[0] || 'Records Receiving Counter A');
  const [newEmail, setNewEmail] = useState('');

  // Credentials fields for Detailed Enrollment
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newStatus, setNewStatus] = useState<'active' | 'suspended'>('active');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUsernameCustomized, setIsUsernameCustomized] = useState(false);

  // When personnel name changes in enrollment form, auto-suggest username if user hasn't customized it
  useEffect(() => {
    if (!isUsernameCustomized) {
      const suggested = newName.trim().toLowerCase().replace(/[^a-z0-9]/g, '.');
      setNewUsername(suggested);
    }
  }, [newName, isUsernameCustomized]);

  // Inline custom entry modes for Detailed Enrollment
  const [isCustomRoleActive, setIsCustomRoleActive] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [isCustomDeptActive, setIsCustomDeptActive] = useState(false);
  const [customDeptInput, setCustomDeptInput] = useState('');
  const [isCustomDeskActive, setIsCustomDeskActive] = useState(false);
  const [customDeskInput, setCustomDeskInput] = useState('');

  // Dropdown Options Admin State
  const [roleInput, setRoleInput] = useState('');
  const [deptInput, setDeptInput] = useState('');
  const [deskInput, setDeskInput] = useState('');
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Credentials Management Dialog / Drawer for existing staff
  const [credentialStaff, setCredentialStaff] = useState<AppUserRole | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
  const [showEditPassword, setShowEditPassword] = useState(false);

  if (!isOpen) return null;

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3200);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // --- Handlers for Admin Dropdown Entries ---
  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roleInput.trim();
    if (!trimmed) return;

    if (dropdownOptions.roles.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      showFeedback(`"${trimmed}" is already in the assigned roles list.`, 'error');
      return;
    }

    const updatedRoles = [...dropdownOptions.roles, trimmed];
    onUpdateDropdownOptions({
      ...dropdownOptions,
      roles: updatedRoles,
    });
    setRoleInput('');
    showFeedback(`Role "${trimmed}" added to enrollment dropdown.`);
  };

  const handleDeleteRole = (roleToDelete: string) => {
    const updatedRoles = dropdownOptions.roles.filter((r) => r !== roleToDelete);
    onUpdateDropdownOptions({
      ...dropdownOptions,
      roles: updatedRoles,
    });
    showFeedback(`Role "${roleToDelete}" removed from dropdown.`);
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = deptInput.trim();
    if (!trimmed) return;

    if (dropdownOptions.departments.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
      showFeedback(`"${trimmed}" is already in the department/division list.`, 'error');
      return;
    }

    const updatedDepartments = [...dropdownOptions.departments, trimmed];
    onUpdateDropdownOptions({
      ...dropdownOptions,
      departments: updatedDepartments,
    });
    setDeptInput('');
    showFeedback(`Department "${trimmed}" added to enrollment dropdown.`);
  };

  const handleDeleteDepartment = (deptToDelete: string) => {
    const updatedDepartments = dropdownOptions.departments.filter((d) => d !== deptToDelete);
    onUpdateDropdownOptions({
      ...dropdownOptions,
      departments: updatedDepartments,
    });
    showFeedback(`Department "${deptToDelete}" removed from dropdown.`);
  };

  const handleAddDesk = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = deskInput.trim();
    if (!trimmed) return;

    if (dropdownOptions.desks.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
      showFeedback(`"${trimmed}" is already in the assigned desks list.`, 'error');
      return;
    }

    const updatedDesks = [...dropdownOptions.desks, trimmed];
    onUpdateDropdownOptions({
      ...dropdownOptions,
      desks: updatedDesks,
    });
    setDeskInput('');
    showFeedback(`Workstation "${trimmed}" added to enrollment dropdown.`);
  };

  const handleDeleteDesk = (deskToDelete: string) => {
    const updatedDesks = dropdownOptions.desks.filter((d) => d !== deskToDelete);
    onUpdateDropdownOptions({
      ...dropdownOptions,
      desks: updatedDesks,
    });
    showFeedback(`Workstation "${deskToDelete}" removed from dropdown.`);
  };

  const handleClearAllDropdowns = () => {
    onUpdateDropdownOptions({
      roles: [],
      departments: [],
      desks: [],
    });
    setIsConfirmingClearAll(false);
    showFeedback('All custom entries cleared. System fallback defaults restored.');
  };

  // --- Handlers for Staff Management ---
  const handleQuickAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;

    const chosenRole = quickRole || availableRoles[0] || 'Admin Staff';
    const chosenDivision = quickDivision || availableDepartments[0] || 'Central Records & Receiving Desk';
    const chosenDesk = availableDesks[0] || `${chosenDivision} Station`;

    const initials = quickName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');

    const autoUsername = quickName.toLowerCase().trim().replace(/[^a-z0-9]/g, '.');

    const newStaff: AppUserRole = {
      id: `staff-${Date.now()}`,
      name: quickName.trim(),
      role: chosenRole,
      division: chosenDivision,
      avatarInitials: initials || 'ST',
      email: `${autoUsername}@agency.gov`,
      assignedDesk: chosenDesk,
      username: autoUsername,
      password: 'password123',
      status: 'active',
    };

    onAddStaffMember(newStaff);
    setQuickName('');
    showFeedback(`Personnel ${newStaff.name} enrolled with username "${autoUsername}".`);
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const chosenRole = isCustomRoleActive && customRoleInput.trim()
      ? customRoleInput.trim()
      : (newRole || availableRoles[0] || 'Admin Staff');

    const chosenDivision = isCustomDeptActive && customDeptInput.trim()
      ? customDeptInput.trim()
      : (newDivision || availableDepartments[0] || 'Central Records & Receiving Desk');

    const chosenDesk = isCustomDeskActive && customDeskInput.trim()
      ? customDeskInput.trim()
      : (newDesk || availableDesks[0] || 'Records Receiving Counter A');

    let updatedOptions = { ...dropdownOptions };
    let hasOptionsChanged = false;

    if (isCustomRoleActive && customRoleInput.trim() && !dropdownOptions.roles.includes(customRoleInput.trim())) {
      updatedOptions.roles = [...updatedOptions.roles, customRoleInput.trim()];
      hasOptionsChanged = true;
    }
    if (isCustomDeptActive && customDeptInput.trim() && !dropdownOptions.departments.includes(customDeptInput.trim())) {
      updatedOptions.departments = [...updatedOptions.departments, customDeptInput.trim()];
      hasOptionsChanged = true;
    }
    if (isCustomDeskActive && customDeskInput.trim() && !dropdownOptions.desks.includes(customDeskInput.trim())) {
      updatedOptions.desks = [...updatedOptions.desks, customDeskInput.trim()];
      hasOptionsChanged = true;
    }

    if (hasOptionsChanged) {
      onUpdateDropdownOptions(updatedOptions);
    }

    const initials = newName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');

    const cleanUsername = (newUsername.trim() || newName.toLowerCase().replace(/[^a-z0-9]/g, '.')).toLowerCase();
    const cleanPassword = newPassword.trim() || 'password123';

    const newStaff: AppUserRole = {
      id: `staff-${Date.now()}`,
      name: newName.trim(),
      role: chosenRole,
      division: chosenDivision,
      avatarInitials: initials || 'ST',
      email: newEmail.trim() || `${cleanUsername}@agency.gov`,
      assignedDesk: chosenDesk || `${chosenDivision} Station`,
      username: cleanUsername,
      password: cleanPassword,
      status: newStatus,
    };

    onAddStaffMember(newStaff);
    setNewName('');
    setNewRole(availableRoles[0] || 'Admin Staff');
    setNewDivision(availableDepartments[0] || 'Central Records & Receiving Desk');
    setNewDesk(availableDesks[0] || 'Records Receiving Counter A');
    setNewEmail('');
    setNewUsername('');
    setNewPassword('password123');
    setNewStatus('active');
    setIsUsernameCustomized(false);
    setIsCustomRoleActive(false);
    setCustomRoleInput('');
    setIsCustomDeptActive(false);
    setCustomDeptInput('');
    setIsCustomDeskActive(false);
    setCustomDeskInput('');
    setActiveTab('directory');
    showFeedback(`Personnel ${newStaff.name} registered with credentials (@${cleanUsername}).`);
  };

  const handleDeleteStaff = (staffId: string) => {
    onDeleteStaffMember(staffId);
    setConfirmDeleteId(null);
  };

  const handleOpenCredentialsModal = (staff: AppUserRole) => {
    setCredentialStaff(staff);
    setEditUsername(staff.username || staff.name.toLowerCase().replace(/[^a-z0-9]/g, '.'));
    setEditPassword(staff.password || (staff.role === 'System Admin' ? 'admin123' : 'password123'));
    setEditStatus(staff.status || 'active');
    setShowEditPassword(false);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialStaff) return;

    const trimmedUsername = editUsername.trim().toLowerCase();
    const trimmedPassword = editPassword.trim();

    if (!trimmedUsername) {
      showFeedback('Username cannot be empty.', 'error');
      return;
    }
    if (!trimmedPassword) {
      showFeedback('Password cannot be empty.', 'error');
      return;
    }

    if (onUpdateStaffCredentials) {
      onUpdateStaffCredentials(credentialStaff.id, {
        username: trimmedUsername,
        password: trimmedPassword,
        status: editStatus,
      });
    }

    showFeedback(`Credentials updated for ${credentialStaff.name} (@${trimmedUsername}).`);
    setCredentialStaff(null);
  };

  const totalConfiguredEntries =
    dropdownOptions.roles.length + dropdownOptions.departments.length + dropdownOptions.desks.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0c2340] dark:bg-[#071526] border-b border-[#1b3d64] dark:border-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-amber-400/50">
              <PossdLogo className="w-8 h-8" variant="black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Staff Roles & Personnel Registry</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-500/30 font-medium">
                  {staffList.length} Personnel
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  {totalConfiguredEntries} Dropdown Entries
                </span>
              </div>
              <p className="text-xs text-blue-200 dark:text-blue-300/80 mt-0.5">
                Manage staff members, configure login credentials, customize dropdown options, and assign administrative roles.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center gap-2 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'directory'
                ? 'border-blue-700 dark:border-blue-500 text-blue-900 dark:text-blue-300 bg-white dark:bg-slate-900 rounded-t-lg shadow-2xs font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>Personnel Directory ({staffList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('dropdown_options')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'dropdown_options'
                ? 'border-blue-700 dark:border-blue-500 text-blue-900 dark:text-blue-300 bg-white dark:bg-slate-900 rounded-t-lg shadow-2xs font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>Dropdown Options</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              totalConfiguredEntries > 0 ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
            }`}>
              {totalConfiguredEntries}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'add'
                ? 'border-blue-700 dark:border-blue-500 text-blue-900 dark:text-blue-300 bg-white dark:bg-slate-900 rounded-t-lg shadow-2xs font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>Detailed Enrollment</span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'permissions'
                ? 'border-blue-700 dark:border-blue-500 text-blue-900 dark:text-blue-300 bg-white dark:bg-slate-900 rounded-t-lg shadow-2xs font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Permission Matrix</span>
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMsg && (
          <div
            className={`px-6 py-2 text-xs font-semibold flex items-center gap-2 transition-all ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-900/60'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-b border-rose-200 dark:border-rose-900/60'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-white dark:bg-slate-900">
          
          {/* TAB 1: PERSONNEL DIRECTORY */}
          {activeTab === 'directory' && (
            <div className="space-y-4">

              {/* CURRENT ACTIVE SESSION BANNER & DELETE CURRENT USER */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    {currentUser.avatarInitials || currentUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Active Session:</span>
                      <strong className="text-slate-900 dark:text-white text-sm font-bold">{currentUser.name}</strong>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {currentUser.role}
                      </span>
                      {currentUser.username && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          @{currentUser.username}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      Division: <span className="font-semibold text-slate-700 dark:text-slate-200">{currentUser.division}</span>
                      {currentUser.assignedDesk && (
                        <span> • Station: <span className="font-semibold text-slate-700 dark:text-slate-200">{currentUser.assignedDesk}</span></span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Option to Delete Current Staff with confirmation */}
                <div className="flex items-center gap-2 shrink-0">
                  {confirmDeleteId === currentUser.id ? (
                    <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 px-3 py-1.5 rounded-xl">
                      <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
                        Remove active staff?
                      </span>
                      <button
                        onClick={() => handleDeleteStaff(currentUser.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (staffList.length <= 1) {
                          showFeedback('Cannot delete the last remaining staff member.', 'error');
                          return;
                        }
                        setConfirmDeleteId(currentUser.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold text-xs transition-colors cursor-pointer"
                      title="Delete the active staff member and switch session to another personnel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Current Staff</span>
                    </button>
                  )}
                </div>
              </div>

              {/* QUICK-ADD STAFF BAR */}
              <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Quick Add New Staff</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('dropdown_options')}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Settings2 className="w-3 h-3" />
                    <span>Manage Dropdown Options</span>
                  </button>
                </div>

                <form onSubmit={handleQuickAddStaff} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    required
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="Staff Full Name (e.g. Maria Santos)"
                    className="flex-1 min-w-[180px] text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <select
                    value={quickRole}
                    onChange={(e) => setQuickRole(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[180px] cursor-pointer"
                    title="Select staff role"
                  >
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  <select
                    value={quickDivision}
                    onChange={(e) => setQuickDivision(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[210px] cursor-pointer"
                    title="Select department / division"
                  >
                    {availableDepartments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Staff</span>
                  </button>
                </form>
              </div>

              {/* STAFF DIRECTORY GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {staffList.map((staff) => {
                  const isCurrent = staff.id === currentUser.id || staff.name === currentUser.name;
                  const roleConfig = getRoleConfig(staff.role);
                  const heldDocsCount = documents.filter((d) => d.currentCustodian?.includes(staff.name)).length;
                  const isConfirmingDelete = confirmDeleteId === staff.id;
                  const isSuspended = staff.status === 'suspended';

                  return (
                    <div
                      key={staff.id}
                      className={`p-4 rounded-xl border transition-all relative ${
                        isCurrent
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs'
                      }`}
                    >
                      {/* Top Row: Avatar, Name, Role, and Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center ${
                              isCurrent
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            {staff.avatarInitials || staff.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-xs text-slate-900 dark:text-white">{staff.name}</h3>
                              {isCurrent && (
                                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950 px-1.5 py-0.2 rounded">
                                  Current User
                                </span>
                              )}
                              {isSuspended && (
                                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-900/60">
                                  Suspended
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold inline-block mt-0.5 ${roleConfig.badgeBg} ${roleConfig.badgeText} border ${roleConfig.badgeBorder}`}
                            >
                              {staff.role}
                            </span>
                          </div>
                        </div>

                        {/* Top Actions: Edit Credentials & Delete Button */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenCredentialsModal(staff)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                            title={`Manage login credentials for ${staff.name}`}
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {staffList.length > 1 && !isConfirmingDelete && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(staff.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title={`Delete ${staff.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Staff Meta Info */}
                      <div className="mt-2.5 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 truncate text-slate-600 dark:text-slate-300">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{staff.division}</span>
                        </div>
                        {staff.assignedDesk && (
                          <div className="flex items-center gap-1.5 truncate text-slate-500 dark:text-slate-400">
                            <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{staff.assignedDesk}</span>
                          </div>
                        )}
                        {staff.email && (
                          <div className="flex items-center gap-1.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate">{staff.email}</span>
                          </div>
                        )}
                        {/* Credentials Info Badge */}
                        <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 mt-1.5">
                          <span className="flex items-center gap-1">
                            <Key className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>Username: <strong className="font-mono text-slate-700 dark:text-slate-300">@{staff.username || 'unassigned'}</strong></span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenCredentialsModal(staff)}
                            className="text-[10.5px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            Edit Credentials
                          </button>
                        </div>
                      </div>

                      {/* 1-CLICK ROLE ASSIGNMENT */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 mt-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-500 dark:text-slate-400">Assign Role:</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">1-click switch</span>
                        </div>

                        {dropdownOptions.roles.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {dropdownOptions.roles.map((r) => {
                              const isSelected = staff.role === r;
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => onUpdateStaffRole(staff.id, r)}
                                  className={`text-[10px] px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs ring-1 ring-slate-900 dark:ring-white'
                                      : 'bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                                  }`}
                                  title={`Assign "${r}" to ${staff.name}`}
                                >
                                  {r}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic flex items-center justify-between">
                            <span>No custom roles configured</span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('dropdown_options')}
                              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                            >
                              + Add Roles
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Switch Session OR Delete Confirmation */}
                      {isConfirmingDelete ? (
                        <div className="mt-2.5 pt-2 border-t border-rose-100 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/50 p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs">
                          <span className="text-rose-900 dark:text-rose-300 font-bold text-[11px]">
                            Confirm delete {staff.name}?
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleDeleteStaff(staff.id)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg shadow-xs cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <FileText className="w-3 h-3 text-slate-400" />
                            <span>
                              Custody:{' '}
                              <strong className={heldDocsCount > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}>
                                {heldDocsCount}
                              </strong>
                            </span>
                          </div>

                          {!isCurrent && (
                            <button
                              onClick={() => onSelectUser(staff)}
                              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>Switch Session</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 2: DROPDOWN OPTIONS CONFIGURATION (ADMIN) */}
          {activeTab === 'dropdown_options' && (
            <div className="space-y-5">
              
              {/* Top Informational Banner */}
              <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                      <span>Staff Enrollment Dropdown Management</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Admin Controls
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      Enter the exact entries for <strong>Assigned Roles</strong>, <strong>Departments & Divisions</strong>, and <strong>Assigned Desks</strong>. All entries configured here immediately populate the selection dropdowns in Detailed Staff Enrollment.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('add')}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Go to Enrollment</span>
                  </button>
                  {totalConfiguredEntries > 0 && (
                    isConfirmingClearAll ? (
                      <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-xl">
                        <span className="text-[11px] text-rose-300 font-medium">Clear all?</span>
                        <button
                          type="button"
                          onClick={handleClearAllDropdowns}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-md cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingClearAll(false)}
                          className="px-1.5 py-0.5 text-slate-400 hover:text-white text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingClearAll(true)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Clear all dropdown entries"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* THREE SECTIONS: ROLES, DEPARTMENTS, DESKS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. ASSIGNED ROLES */}
                <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">Assigned Roles</h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {dropdownOptions.roles.length} entries
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 mb-3">
                    Roles available when enrolling personnel & assigning duties.
                  </p>

                  <form onSubmit={handleAddRole} className="flex items-center gap-1.5 mb-3">
                    <input
                      type="text"
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      placeholder="e.g. Chief Reviewer"
                      className="flex-1 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!roleInput.trim()}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
                    >
                      + Add
                    </button>
                  </form>

                  <div className="flex-1 min-h-[140px] max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                    {dropdownOptions.roles.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                        <Shield className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No roles yet</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Type above to add custom roles</p>
                      </div>
                    ) : (
                      dropdownOptions.roles.map((role) => (
                        <div
                          key={role}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 text-xs hover:bg-slate-100/80 dark:hover:bg-slate-900 transition-colors"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={role}>
                            {role}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                            title={`Delete role ${role}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. DEPARTMENTS & DIVISIONS */}
                <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">Departments / Divisions</h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {dropdownOptions.departments.length} entries
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 mb-3">
                    Office divisions selectable for staff assignments.
                  </p>

                  <form onSubmit={handleAddDepartment} className="flex items-center gap-1.5 mb-3">
                    <input
                      type="text"
                      value={deptInput}
                      onChange={(e) => setDeptInput(e.target.value)}
                      placeholder="e.g. Finance & Budget"
                      className="flex-1 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={!deptInput.trim()}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
                    >
                      + Add
                    </button>
                  </form>

                  <div className="flex-1 min-h-[140px] max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                    {dropdownOptions.departments.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                        <Building className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No departments yet</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Type above to add departments</p>
                      </div>
                    ) : (
                      dropdownOptions.departments.map((dept) => (
                        <div
                          key={dept}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 text-xs hover:bg-slate-100/80 dark:hover:bg-slate-900 transition-colors"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={dept}>
                            {dept}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteDepartment(dept)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                            title={`Delete department ${dept}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. ASSIGNED DESKS & WORKSTATIONS */}
                <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">Assigned Desks</h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      {dropdownOptions.desks.length} entries
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 mb-3">
                    Specific workstations selectable in personnel routing.
                  </p>

                  <form onSubmit={handleAddDesk} className="flex items-center gap-1.5 mb-3">
                    <input
                      type="text"
                      value={deskInput}
                      onChange={(e) => setDeskInput(e.target.value)}
                      placeholder="e.g. Evaluation Bay 3"
                      className="flex-1 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      type="submit"
                      disabled={!deskInput.trim()}
                      className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
                    >
                      + Add
                    </button>
                  </form>

                  <div className="flex-1 min-h-[140px] max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                    {dropdownOptions.desks.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                        <Briefcase className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No desks yet</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Type above to add desks</p>
                      </div>
                    ) : (
                      dropdownOptions.desks.map((desk) => (
                        <div
                          key={desk}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 text-xs hover:bg-slate-100/80 dark:hover:bg-slate-900 transition-colors"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={desk}>
                            {desk}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteDesk(desk)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                            title={`Delete desk ${desk}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: DETAILED ENROLLMENT & CREDENTIALS REGISTRATION */}
          {activeTab === 'add' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Enroll New Staff & Provision Credentials</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Register personnel details, assign divisions, and configure secure portal login credentials.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('dropdown_options')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Configure Dropdowns</span>
                </button>
              </div>

              <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Personnel Full Name & Honorific <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Maria Santos (Chief Budget Officer)"
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Dropdown 1: Assigned Role & Dropdown 2: Department/Division */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Assigned Role Dropdown */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="detailed-role-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Assigned Role <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomRoleActive(!isCustomRoleActive);
                          if (!isCustomRoleActive && !customRoleInput) {
                            setCustomRoleInput('');
                          }
                        }}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer"
                      >
                        {isCustomRoleActive ? 'Select from list' : '+ Enter custom role'}
                      </button>
                    </div>

                    {!isCustomRoleActive ? (
                      <select
                        id="detailed-role-select"
                        required
                        value={newRole}
                        onChange={(e) => {
                          if (e.target.value === '__add_custom__') {
                            setIsCustomRoleActive(true);
                          } else {
                            setNewRole(e.target.value);
                          }
                        }}
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white dark:bg-slate-800 shadow-2xs cursor-pointer"
                      >
                        <option value="" disabled>-- Select an Assigned Role --</option>
                        <optgroup label="System Roles">
                          {SYSTEM_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </optgroup>
                        {dropdownOptions.roles.filter((r) => !SYSTEM_ROLES.includes(r)).length > 0 && (
                          <optgroup label="Custom Configured Roles">
                            {dropdownOptions.roles
                              .filter((r) => !SYSTEM_ROLES.includes(r))
                              .map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                          </optgroup>
                        )}
                        <option value="__add_custom__">+ Add another custom role...</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          required
                          value={customRoleInput}
                          onChange={(e) => setCustomRoleInput(e.target.value)}
                          placeholder="Type role title (e.g. Chief Auditor)"
                          className="flex-1 text-xs rounded-xl border border-indigo-300 dark:border-indigo-700 px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/30"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = customRoleInput.trim();
                            if (trimmed) {
                              if (!dropdownOptions.roles.includes(trimmed)) {
                                onUpdateDropdownOptions({
                                  ...dropdownOptions,
                                  roles: [...dropdownOptions.roles, trimmed],
                                });
                              }
                              setNewRole(trimmed);
                              setIsCustomRoleActive(false);
                              showFeedback(`Custom role "${trimmed}" registered.`);
                            }
                          }}
                          className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                        >
                          Save & Use
                        </button>
                      </div>
                    )}

                    {/* Role Authority & Permission Preview */}
                    {(() => {
                      const activeRoleName = isCustomRoleActive && customRoleInput.trim() ? customRoleInput.trim() : newRole;
                      const activeConfig = getRoleConfig(activeRoleName);
                      if (!activeConfig) return null;

                      return (
                        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/60 text-[11px] space-y-1.5 mt-1">
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${activeConfig.badgeBg} ${activeConfig.badgeText} ${activeConfig.badgeBorder}`}>
                              {activeConfig.role}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 font-medium text-[10px]">{activeConfig.title}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-[10.5px] leading-tight">
                            {activeConfig.summary}
                          </p>
                          <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-200/60 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              {activeConfig.canLogIncoming ? (
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <X className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                              )}
                              <span>Log Incoming</span>
                            </span>
                            <span className="flex items-center gap-1">
                              {activeConfig.canRecordMovement ? (
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <X className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                              )}
                              <span>Movements</span>
                            </span>
                            <span className="flex items-center gap-1">
                              {activeConfig.canIssueSupervisorRemarks ? (
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <X className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                              )}
                              <span>Directives / Remarks</span>
                            </span>
                            <span className="flex items-center gap-1">
                              {activeConfig.canAuthorizeClearance ? (
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <X className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                              )}
                              <span>Executive Clearance</span>
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Department / Division Dropdown */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="detailed-division-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Department / Division <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomDeptActive(!isCustomDeptActive);
                          if (!isCustomDeptActive && !customDeptInput) {
                            setCustomDeptInput('');
                          }
                        }}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer"
                      >
                        {isCustomDeptActive ? 'Select from list' : '+ Enter custom department'}
                      </button>
                    </div>

                    {!isCustomDeptActive ? (
                      <select
                        id="detailed-division-select"
                        required
                        value={newDivision}
                        onChange={(e) => {
                          if (e.target.value === '__add_custom__') {
                            setIsCustomDeptActive(true);
                          } else {
                            setNewDivision(e.target.value);
                          }
                        }}
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white dark:bg-slate-800 shadow-2xs cursor-pointer"
                      >
                        <option value="" disabled>-- Select a Department / Division --</option>
                        {availableDepartments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                        <option value="__add_custom__">+ Add another department...</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          required
                          value={customDeptInput}
                          onChange={(e) => setCustomDeptInput(e.target.value)}
                          placeholder="Type department name"
                          className="flex-1 text-xs rounded-xl border border-indigo-300 dark:border-indigo-700 px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/30"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = customDeptInput.trim();
                            if (trimmed) {
                              if (!dropdownOptions.departments.includes(trimmed)) {
                                onUpdateDropdownOptions({
                                  ...dropdownOptions,
                                  departments: [...dropdownOptions.departments, trimmed],
                                });
                              }
                              setNewDivision(trimmed);
                              setIsCustomDeptActive(false);
                              showFeedback(`Department "${trimmed}" registered.`);
                            }
                          }}
                          className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                        >
                          Save & Use
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dropdown 3: Assigned Desk & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Assigned Desk Dropdown */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="detailed-desk-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Assigned Desk / Workstation
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomDeskActive(!isCustomDeskActive);
                          if (!isCustomDeskActive && !customDeskInput) {
                            setCustomDeskInput('');
                          }
                        }}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer"
                      >
                        {isCustomDeskActive ? 'Select from list' : '+ Custom workstation'}
                      </button>
                    </div>

                    {!isCustomDeskActive ? (
                      <select
                        id="detailed-desk-select"
                        value={newDesk}
                        onChange={(e) => {
                          if (e.target.value === '__add_custom__') {
                            setIsCustomDeskActive(true);
                          } else {
                            setNewDesk(e.target.value);
                          }
                        }}
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white dark:bg-slate-800 shadow-2xs cursor-pointer"
                      >
                        <option value="">-- Select an Assigned Desk (Optional) --</option>
                        {availableDesks.map((desk) => (
                          <option key={desk} value={desk}>
                            {desk}
                          </option>
                        ))}
                        <option value="__add_custom__">+ Add another desk / station...</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={customDeskInput}
                          onChange={(e) => setCustomDeskInput(e.target.value)}
                          placeholder="e.g. Finance Chamber Bay 3"
                          className="flex-1 text-xs rounded-xl border border-indigo-300 dark:border-indigo-700 px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/30"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = customDeskInput.trim();
                            if (trimmed) {
                              if (!dropdownOptions.desks.includes(trimmed)) {
                                onUpdateDropdownOptions({
                                  ...dropdownOptions,
                                  desks: [...dropdownOptions.desks, trimmed],
                                });
                              }
                              setNewDesk(trimmed);
                              setIsCustomDeskActive(false);
                              showFeedback(`Workstation "${trimmed}" registered.`);
                            }
                          }}
                          className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                        >
                          Save & Use
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Official Email Address
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. maria.santos@agency.gov"
                      className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* LOGIN CREDENTIALS SECTION ENROLLED BY SYSTEM ADMIN */}
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 dark:text-amber-300">
                      <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Portal Login Credentials (Enrolled by Admin)</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                      System Admin Enrolled
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Username */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Portal Username <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => {
                          setNewUsername(e.target.value);
                          setIsUsernameCustomized(true);
                        }}
                        placeholder="e.g. maria.santos"
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Initial Password <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setNewPassword(generateRandomPassword())}
                          className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Generate</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Password"
                          className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 pr-8 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Account Status */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Account Status
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as 'active' | 'suspended')}
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="active">Active (Access Granted)</option>
                        <option value="suspended">Suspended (Access Blocked)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('directory')}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Register Personnel & Credentials</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: PERMISSIONS MATRIX */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Role Authority & Permission Matrix</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Standardized hierarchy and privilege matrix from intake reception to executive clearance.
                    </p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg font-medium self-start sm:self-auto">
                    Workflow Sequence Enforced
                  </span>
                </div>
              </div>

              {/* Workflow Step Progression Map */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Standard Clearance Progression
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="px-2.5 py-1 bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-semibold rounded-md border border-sky-200 dark:border-sky-800">
                    1. Admin Staff
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-semibold rounded-md border border-indigo-200 dark:border-indigo-800">
                    2. Staff
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-semibold rounded-md border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                    <span>3. Supervisor</span>
                    <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1 py-0.2 rounded font-bold">Prereq</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="px-2.5 py-1 bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 font-semibold rounded-md border border-violet-200 dark:border-violet-800">
                    4. Division Manager
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold rounded-md border border-emerald-200 dark:border-emerald-800">
                    5. Department Manager
                  </span>
                </div>
              </div>

              {/* Matrix Cards for 6 Standardized Roles */}
              <div className="space-y-3">
                {[
                  'Admin Staff',
                  'Staff',
                  'Supervisor',
                  'Division Manager',
                  'Department Manager',
                  'System Admin',
                ].map((roleKey) => {
                  const cfg = getRoleConfig(roleKey);
                  const isCurrentRole = currentUser.role === cfg.role;

                  return (
                    <div
                      key={cfg.role}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrentRole
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} inline-flex items-center gap-1.5`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                            {cfg.role}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white">{cfg.title}</span>

                          {cfg.role === 'Supervisor' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-semibold">
                              Prerequisite Before Division Manager
                            </span>
                          )}

                          {cfg.role === 'Division Manager' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800 font-semibold">
                              Division Review (Follows Supervisor)
                            </span>
                          )}

                          {isCurrentRole && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white font-bold">
                              Your Active Role
                            </span>
                          )}
                        </div>

                        {cfg.hierarchyNote && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {cfg.hierarchyNote}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">{cfg.summary}</p>

                      {/* Prerequisite relationship highlight for Supervisor and Division Manager */}
                      {cfg.role === 'Supervisor' && (
                        <div className="mt-2.5 p-2.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Workflow Rule:</span> Same operational permissions as the Division Manager. Supervisor conducts preliminary review and audits initial compliance before the document is escalated to the Division Manager.
                          </div>
                        </div>
                      )}

                      {cfg.role === 'Division Manager' && (
                        <div className="mt-2.5 p-2.5 bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/60 rounded-lg text-xs text-violet-900 dark:text-violet-300 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-violet-700 dark:text-violet-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Workflow Rule:</span> Same operational permissions as Supervisor. Conducts secondary division-level review following the prerequisite Supervisor endorsement, then endorses files to Department Manager.
                          </div>
                        </div>
                      )}

                      {/* Permission Badges Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {cfg.canLogIncoming ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={cfg.canLogIncoming ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-600'}>
                            Log Incoming
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canRecordMovement ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={cfg.canRecordMovement ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-600'}>
                            Update Desks
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canIssueSupervisorRemarks ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={cfg.canIssueSupervisorRemarks ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-600'}>
                            Supervisor Remarks
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canAuthorizeClearance ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={cfg.canAuthorizeClearance ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-600'}>
                            Manager Clearance
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canFulfillCompliance ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={cfg.canFulfillCompliance ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-600'}>
                            Fulfill Compliance
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canManageStaff ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={cfg.canManageStaff ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-600'}>
                            Manage Personnel
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canConfigureSync ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={cfg.canConfigureSync ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-600'}>
                            Sync & Registry
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canDeleteDocuments ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span className={cfg.canDeleteDocuments ? 'text-rose-700 dark:text-rose-400 font-bold' : 'text-slate-400 dark:text-slate-600'}>
                            Delete Logs (In/Out)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Active Role: <strong className="text-slate-800 dark:text-slate-200">{currentUser.role}</strong> ({currentUser.name})
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* CREDENTIALS ENROLLMENT & EDITING DIALOG */}
      {credentialStaff && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 bg-[#0c2340] dark:bg-[#071526] text-white flex items-center justify-between border-b border-[#1b3d64] dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Enroll Login Credentials</h3>
                  <p className="text-[11px] text-blue-200 dark:text-slate-400">
                    Staff: <span className="font-semibold text-white">{credentialStaff.name}</span> ({credentialStaff.role})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCredentialStaff(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCredentials} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Login Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="e.g. maria.santos"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10.5px] text-slate-400 dark:text-slate-500">
                  Staff members use this username to authenticate into their assigned role.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditPassword(generateRandomPassword())}
                    className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Account Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('active')}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editStatus === 'active'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('suspended')}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editStatus === 'suspended'
                        ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 ring-1 ring-rose-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-600" />
                    <span>Suspended</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCredentialStaff(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Save Enrolled Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
