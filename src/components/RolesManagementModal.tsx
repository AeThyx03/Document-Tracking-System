import React, { useState } from 'react';
import { AppUserRole, UserRoleType, DocumentItem, RegistryDropdownOptions } from '../types';
import { ROLE_CONFIGS, getRoleConfig } from '../mockData';
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
  Layers,
  Settings2,
  Info,
  Shield,
  HelpCircle,
  RotateCcw
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
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'dropdown_options' | 'add' | 'permissions'>('directory');

  // Combined roles, departments, and desks (custom options from admin + system defaults)
  const availableRoles = Array.from(new Set([...dropdownOptions.roles, ...SYSTEM_ROLES]));
  const availableDepartments = dropdownOptions.departments.length > 0 ? dropdownOptions.departments : DEFAULT_DEPARTMENTS;
  const availableDesks = dropdownOptions.desks.length > 0 ? dropdownOptions.desks : DEFAULT_DESKS;

  // Quick staff form state (inline fast add on directory tab)
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

  // Inline custom entry modes for Detailed Enrollment
  const [isCustomRoleActive, setIsCustomRoleActive] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [isCustomDeptActive, setIsCustomDeptActive] = useState(false);
  const [customDeptInput, setCustomDeptInput] = useState('');
  const [isCustomDeskActive, setIsCustomDeskActive] = useState(false);
  const [customDeskInput, setCustomDeskInput] = useState('');

  // Dropdown Options Admin State (for manually adding entries)
  const [roleInput, setRoleInput] = useState('');
  const [deptInput, setDeptInput] = useState('');
  const [deskInput, setDeskInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3000);
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

    if (dropdownOptions.desks.some((desk) => desk.toLowerCase() === trimmed.toLowerCase())) {
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
    if (window.confirm('Clear all entries from Roles, Departments, and Desks? This will reset all dropdowns to empty.')) {
      onUpdateDropdownOptions({
        roles: [],
        departments: [],
        desks: [],
      });
      showFeedback('All dropdown entries have been cleared.');
    }
  };

  // --- Handlers for Staff Enrollment ---
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

    const newStaff: AppUserRole = {
      id: `staff-${Date.now()}`,
      name: quickName.trim(),
      role: chosenRole,
      division: chosenDivision,
      avatarInitials: initials || 'ST',
      email: `${quickName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@agency.gov`,
      assignedDesk: chosenDesk,
    };

    onAddStaffMember(newStaff);
    setQuickName('');
    showFeedback(`Personnel ${newStaff.name} enrolled successfully.`);
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

    // If a custom role was added on the fly, persist it into dropdownOptions
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

    const newStaff: AppUserRole = {
      id: `staff-${Date.now()}`,
      name: newName.trim(),
      role: chosenRole,
      division: chosenDivision,
      avatarInitials: initials || 'ST',
      email: newEmail.trim() || `${newName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@agency.gov`,
      assignedDesk: chosenDesk || `${chosenDivision} Station`,
    };

    onAddStaffMember(newStaff);
    setNewName('');
    setNewRole(availableRoles[0] || 'Admin Staff');
    setNewDivision(availableDepartments[0] || 'Central Records & Receiving Desk');
    setNewDesk(availableDesks[0] || 'Records Receiving Counter A');
    setNewEmail('');
    setIsCustomRoleActive(false);
    setCustomRoleInput('');
    setIsCustomDeptActive(false);
    setCustomDeptInput('');
    setIsCustomDeskActive(false);
    setCustomDeskInput('');
    setActiveTab('directory');
    showFeedback(`Personnel ${newStaff.name} registered as ${newStaff.role}.`);
  };

  const handleDeleteStaff = (staffId: string) => {
    onDeleteStaffMember(staffId);
    setConfirmDeleteId(null);
  };

  const totalConfiguredEntries =
    dropdownOptions.roles.length + dropdownOptions.departments.length + dropdownOptions.desks.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Staff Roles & Personnel Registry</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                  {staffList.length} Personnel
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  {totalConfiguredEntries} Dropdown Entries
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage staff members, configure custom dropdown options, assign roles, or switch active sessions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center gap-2 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'directory'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Personnel Directory ({staffList.length})</span>
          </button>

          {/* NEW TAB: Dropdown Options (Admin) */}
          <button
            onClick={() => setActiveTab('dropdown_options')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'dropdown_options'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Dropdown Options</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              totalConfiguredEntries > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {totalConfiguredEntries}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'add'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Detailed Enrollment</span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'permissions'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Permissions Matrix</span>
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMsg && (
          <div
            className={`px-6 py-2 text-xs font-semibold flex items-center gap-2 transition-all ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: PERSONNEL DIRECTORY */}
          {activeTab === 'directory' && (
            <div className="space-y-4">

              {/* CURRENT ACTIVE SESSION BANNER & DELETE CURRENT USER */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    {currentUser.avatarInitials || currentUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">Active Session:</span>
                      <strong className="text-slate-900 text-sm font-bold">{currentUser.name}</strong>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {currentUser.role}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Division: <span className="font-semibold text-slate-700">{currentUser.division}</span>
                      {currentUser.assignedDesk && (
                        <span> • Station: <span className="font-semibold text-slate-700">{currentUser.assignedDesk}</span></span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Option to Delete Current Staff with confirmation */}
                <div className="flex items-center gap-2 shrink-0">
                  {confirmDeleteId === currentUser.id ? (
                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                      <span className="text-[11px] font-bold text-rose-800">
                        Remove active staff?
                      </span>
                      <button
                        onClick={() => handleDeleteStaff(currentUser.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-medium hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (staffList.length <= 1) {
                          alert('Cannot delete the last remaining staff member.');
                          return;
                        }
                        setConfirmDeleteId(currentUser.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition-colors"
                      title="Delete the active staff member and switch session to another personnel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Current Staff</span>
                    </button>
                  )}
                </div>
              </div>

              {/* QUICK-ADD STAFF BAR (Driven by custom dropdown options) */}
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Quick Add New Staff</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('dropdown_options')}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
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
                    className="flex-1 min-w-[180px] text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <select
                    value={quickRole}
                    onChange={(e) => setQuickRole(e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[180px]"
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
                    className="text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[210px]"
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
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
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

                  return (
                    <div
                      key={staff.id}
                      className={`p-4 rounded-xl border transition-all relative ${
                        isCurrent
                          ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      {/* Top Row: Avatar, Name, Delete Button */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center ${
                              isCurrent
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {staff.avatarInitials || staff.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-xs text-slate-900">{staff.name}</h3>
                              {isCurrent && (
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.2 rounded">
                                  Current User
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

                        {/* Card Top Actions: Delete Button */}
                        <div className="flex items-center gap-1">
                          {staffList.length > 1 && !isConfirmingDelete && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(staff.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title={`Delete ${staff.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Staff Meta Info */}
                      <div className="mt-2.5 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 truncate text-slate-600">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{staff.division}</span>
                        </div>
                        {staff.assignedDesk && (
                          <div className="flex items-center gap-1.5 truncate text-slate-500">
                            <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{staff.assignedDesk}</span>
                          </div>
                        )}
                        {staff.email && (
                          <div className="flex items-center gap-1.5 truncate text-[11px] text-slate-400">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate">{staff.email}</span>
                          </div>
                        )}
                      </div>

                      {/* 1-CLICK ROLE ASSIGNMENT (Uses custom configured roles) */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5 mt-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-500">Assign Role:</span>
                          <span className="text-[10px] text-slate-400">1-click switch</span>
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
                                  className={`text-[10px] px-2 py-1 rounded-lg font-semibold transition-all ${
                                    isSelected
                                      ? 'bg-slate-900 text-white shadow-xs ring-1 ring-slate-900'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
                              className="text-indigo-600 font-semibold hover:underline"
                            >
                              + Add Roles
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Switch Session OR Delete Confirmation */}
                      {isConfirmingDelete ? (
                        <div className="mt-2.5 pt-2 border-t border-rose-100 bg-rose-50/80 p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs">
                          <span className="text-rose-900 font-bold text-[11px]">
                            Confirm delete {staff.name}?
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleDeleteStaff(staff.id)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg shadow-xs"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 bg-white border border-slate-200 text-slate-700 text-[11px] font-medium rounded-lg hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <FileText className="w-3 h-3 text-slate-400" />
                            <span>
                              Custody:{' '}
                              <strong className={heldDocsCount > 0 ? 'text-indigo-600' : 'text-slate-700'}>
                                {heldDocsCount}
                              </strong>
                            </span>
                          </div>

                          {!isCurrent && (
                            <button
                              onClick={() => onSelectUser(staff)}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
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
              <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Go to Enrollment</span>
                  </button>
                  {totalConfiguredEntries > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllDropdowns}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Clear all dropdown entries"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* THREE SECTIONS: ROLES, DEPARTMENTS, DESKS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. ASSIGNED ROLES */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      <h4 className="font-bold text-xs text-slate-900">Assigned Roles</h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {dropdownOptions.roles.length} entries
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1.5 mb-3">
                    Roles available when enrolling personnel & assigning duties.
                  </p>

                  {/* Add Role Input */}
                  <form onSubmit={handleAddRole} className="flex items-center gap-1.5 mb-3">
                    <input
                      type="text"
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      placeholder="e.g. Chief Reviewer"
                      className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!roleInput.trim()}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
                    >
                      + Add
                    </button>
                  </form>

                  {/* Roles List */}
                  <div className="flex-1 min-h-[140px] max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                    {dropdownOptions.roles.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-lg">
                        <Shield className="w-6 h-6 text-slate-300 mb-1" />
                        <p className="text-xs font-semibold text-slate-600">No roles yet</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Type above to add custom roles</p>
                      </div>
                    ) : (
                      dropdownOptions.roles.map((role) => (
                        <div
                          key={role}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs hover:bg-slate-100/80 transition-colors"
                        >
                          <span className="font-semibold text-slate-800 truncate" title={role}>
                            {role}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
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
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-bold text-xs text-slate-900">Departments / Divisions</h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {dropdownOptions.departments.length} entries
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1.5 mb-3">
                    Office divisions selectable for staff assignments.
                  </p>

                  {/* Add Department Input */}
                  <form onSubmit={handleAddDepartment} className="flex items-center gap-1.5 mb-3">
                    <input
                      type="text"
                      value={deptInput}
                      onChange={(e) => setDeptInput(e.target.value)}
                      placeholder="e.g. Finance & Budget"
                      className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={!deptInput.trim()}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
                    >
                      + Add
                    </button>
                  </form>

                  {/* Departments List */}
                  <div className="flex-1 min-h-[140px] max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                    {dropdownOptions.departments.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-lg">
                        <Building className="w-6 h-6 text-slate-300 mb-1" />
                        <p className="text-xs font-semibold text-slate-600">No departments yet</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Type above to add departments</p>
                      </div>
                    ) : (
                      dropdownOptions.departments.map((dept) => (
                        <div
                          key={dept}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs hover:bg-slate-100/80 transition-colors"
                        >
                          <span className="font-semibold text-slate-800 truncate" title={dept}>
                            {dept}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteDepartment(dept)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
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
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-purple-600" />
                      <h4 className="font-bold text-xs text-slate-900">Assigned Desks</h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      {dropdownOptions.desks.length} entries
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1.5 mb-3">
                    Physical workstations or routing desks in the office.
                  </p>

                  {/* Add Desk Input */}
                  <form onSubmit={handleAddDesk} className="flex items-center gap-1.5 mb-3">
                    <input
                      type="text"
                      value={deskInput}
                      onChange={(e) => setDeskInput(e.target.value)}
                      placeholder="e.g. Counter 1 - Front Receiving"
                      className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="submit"
                      disabled={!deskInput.trim()}
                      className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
                    >
                      + Add
                    </button>
                  </form>

                  {/* Desks List */}
                  <div className="flex-1 min-h-[140px] max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                    {dropdownOptions.desks.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-lg">
                        <Briefcase className="w-6 h-6 text-slate-300 mb-1" />
                        <p className="text-xs font-semibold text-slate-600">No desks yet</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Type above to add workstations</p>
                      </div>
                    ) : (
                      dropdownOptions.desks.map((desk) => (
                        <div
                          key={desk}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs hover:bg-slate-100/80 transition-colors"
                        >
                          <span className="font-semibold text-slate-800 truncate" title={desk}>
                            {desk}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteDesk(desk)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
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

              {/* Bottom Quick-Action Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>
                    When enrolling staff in the <strong>Detailed Enrollment</strong> tab, the dropdowns will only show the entries configured above.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('add')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors shrink-0 inline-flex items-center gap-1.5"
                >
                  <span>Proceed to Detailed Enrollment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: DETAILED ENROLLMENT (DROPDOWNS DRIVEN BY ADMIN ENTRIES) */}
          {activeTab === 'add' && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Detailed Staff Enrollment</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Register a new personnel record. All selection dropdowns are populated from your custom options.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('dropdown_options')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Configure Dropdowns</span>
                </button>
              </div>

              <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Personnel Full Name & Honorific <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Maria Santos (Chief Budget Officer)"
                    className="w-full text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Dropdown 1: Assigned Role & Dropdown 2: Department/Division */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Assigned Role Dropdown */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="detailed-role-select" className="block text-xs font-semibold text-slate-700">
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
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
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
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white shadow-2xs"
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
                          className="flex-1 text-xs rounded-xl border border-indigo-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/20"
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
                          className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
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
                        <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/90 text-[11px] space-y-1.5 mt-1">
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${activeConfig.badgeBg} ${activeConfig.badgeText} ${activeConfig.badgeBorder}`}>
                              {activeConfig.role}
                            </span>
                            <span className="text-slate-500 font-medium text-[10px]">{activeConfig.title}</span>
                          </div>
                          <p className="text-slate-600 text-[10.5px] leading-tight">
                            {activeConfig.summary}
                          </p>
                          <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-200/60 text-[10px] text-slate-600">
                            <span className="flex items-center gap-1">
                              {activeConfig.canLogIncoming ? (
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              ) : (
                                <X className="w-3 h-3 text-slate-300 shrink-0" />
                              )}
                              <span>Log Incoming</span>
                            </span>
                            <span className="flex items-center gap-1">
                              {activeConfig.canRecordMovement ? (
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              ) : (
                                <X className="w-3 h-3 text-slate-300 shrink-0" />
                              )}
                              <span>Movements</span>
                            </span>
                            <span className="flex items-center gap-1">
                              {activeConfig.canIssueSupervisorRemarks ? (
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              ) : (
                                <X className="w-3 h-3 text-slate-300 shrink-0" />
                              )}
                              <span>Directives / Remarks</span>
                            </span>
                            <span className="flex items-center gap-1">
                              {activeConfig.canAuthorizeClearance ? (
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              ) : (
                                <X className="w-3 h-3 text-slate-300 shrink-0" />
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
                      <label htmlFor="detailed-division-select" className="block text-xs font-semibold text-slate-700">
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
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
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
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white shadow-2xs"
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
                          className="flex-1 text-xs rounded-xl border border-indigo-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/20"
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
                          className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
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
                      <label htmlFor="detailed-desk-select" className="block text-xs font-semibold text-slate-700">
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
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
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
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white shadow-2xs"
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
                          className="flex-1 text-xs rounded-xl border border-indigo-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/20"
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
                          className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
                        >
                          Save & Use
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Email Address
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. maria.santos@agency.gov"
                      className="w-full text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab('directory')}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Register Personnel</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: PERMISSIONS MATRIX */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Role Authority & Permission Matrix</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Standardized hierarchy and privilege matrix from intake reception to executive clearance.
                    </p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-medium self-start sm:self-auto">
                    Workflow Sequence Enforced
                  </span>
                </div>
              </div>

              {/* Workflow Step Progression Map */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Standard Clearance Progression
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="px-2.5 py-1 bg-sky-100 text-sky-800 font-semibold rounded-md border border-sky-200">
                    1. Admin Staff
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-semibold rounded-md border border-indigo-200">
                    2. Staff
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-semibold rounded-md border border-amber-300 flex items-center gap-1">
                    <span>3. Supervisor</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-bold">Prereq</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="px-2.5 py-1 bg-violet-100 text-violet-800 font-semibold rounded-md border border-violet-200">
                    4. Division Manager
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-semibold rounded-md border border-emerald-200">
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
                          ? 'border-indigo-600 bg-indigo-50/20 shadow-2xs'
                          : 'border-slate-200 bg-white'
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
                          <span className="text-xs font-bold text-slate-800">{cfg.title}</span>

                          {cfg.role === 'Supervisor' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
                              Prerequisite Before Division Manager
                            </span>
                          )}

                          {cfg.role === 'Division Manager' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 border border-violet-200 font-semibold">
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
                          <span className="text-[11px] text-slate-500 font-medium">
                            {cfg.hierarchyNote}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-2">{cfg.summary}</p>

                      {/* Prerequisite relationship highlight for Supervisor and Division Manager */}
                      {cfg.role === 'Supervisor' && (
                        <div className="mt-2.5 p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Workflow Rule:</span> Same operational permissions as the Division Manager. Supervisor conducts preliminary review and audits initial compliance before the document is escalated to the Division Manager.
                          </div>
                        </div>
                      )}

                      {cfg.role === 'Division Manager' && (
                        <div className="mt-2.5 p-2.5 bg-violet-50/80 border border-violet-200 rounded-lg text-xs text-violet-900 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-violet-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Workflow Rule:</span> Same operational permissions as Supervisor. Conducts secondary division-level review following the prerequisite Supervisor endorsement, then endorses files to Department Manager.
                          </div>
                        </div>
                      )}

                      {/* Permission Badges Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {cfg.canLogIncoming ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          )}
                          <span className={cfg.canLogIncoming ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                            Log Incoming
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canRecordMovement ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          )}
                          <span className={cfg.canRecordMovement ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                            Update Desks
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canIssueSupervisorRemarks ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          )}
                          <span className={cfg.canIssueSupervisorRemarks ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                            Supervisor Remarks
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canAuthorizeClearance ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          )}
                          <span className={cfg.canAuthorizeClearance ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                            Manager Clearance
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canFulfillCompliance ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          )}
                          <span className={cfg.canFulfillCompliance ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                            Fulfill Compliance
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canManageStaff ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          )}
                          <span className={cfg.canManageStaff ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                            Manage Personnel
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canConfigureSync ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          )}
                          <span className={cfg.canConfigureSync ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                            Sync & Registry
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cfg.canDeleteDocuments ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          )}
                          <span className={cfg.canDeleteDocuments ? 'text-rose-700 font-bold' : 'text-slate-400'}>
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
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Active Role: <strong className="text-slate-800">{currentUser.role}</strong> ({currentUser.name})
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
