import React, { useState, useMemo, useEffect } from 'react';
import { AppUserRole, RegistryDropdownOptions, DEFAULT_REGISTRY_DROPDOWN_OPTIONS } from '../types';
import { apiRequest } from '../lib/api';
import { getRoleConfig, hasSupervisorPermissions } from '../mockData';
import {
  Tag,
  FileText,
  Building2,
  Send,
  Users,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Save,
  AlertCircle,
  UserCheck,
  ShieldAlert,
  Layers,
  Sparkles,
  Search,
  Check,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';

interface AdminDropdownsConfigProps {
  dropdownOptions: RegistryDropdownOptions;
  onUpdateDropdownOptions: (newOptions: RegistryDropdownOptions) => void;
  staffList: AppUserRole[];
  currentUser?: AppUserRole | null;
}

type DropdownCategoryKey =
  | 'document_classification'
  | 'transaction_type'
  | 'communication_type'
  | 'report_type'
  | 'originating_agency'
  | 'target_division'
  | 'priority_level';

interface CategoryMeta {
  key: DropdownCategoryKey;
  label: string;
  description: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryMeta[] = [
  {
    key: 'document_classification',
    label: 'Document Classification',
    description: 'Routing direction classification (e.g., Incoming, Outgoing).',
    placeholder: 'e.g. Incoming',
    icon: ShieldCheck,
  },
  {
    key: 'transaction_type',
    label: 'Transaction Type',
    description: 'Categories of transactions processed (e.g. Simple, Complex).',
    placeholder: 'e.g. Urgent Special Clearance',
    icon: Tag,
  },
  {
    key: 'communication_type',
    label: 'Communication Type',
    description: 'Official correspondence and communication forms.',
    placeholder: 'e.g. Administrative Order',
    icon: FileText,
  },
  {
    key: 'report_type',
    label: 'Report / Document Type',
    description: 'Document classifications, inspection findings, and specialized reports.',
    placeholder: 'e.g. Environmental Clearance Slip',
    icon: Layers,
  },
  {
    key: 'originating_agency',
    label: 'Originating Dept / Agency',
    description: 'External departments, regional offices, external senders.',
    placeholder: 'e.g. Department of Transportation, Regional Trial Court',
    icon: Building2,
  },
  {
    key: 'target_division',
    label: 'Forward To / Target Division',
    description: 'Internal receiving sections within the agency.',
    placeholder: 'e.g. Administrative Section, Finance Division',
    icon: Send,
  },
  {
    key: 'priority_level',
    label: 'Routing Priority Level',
    description: 'Routing priorities (e.g. Normal, Urgent).',
    placeholder: 'e.g. High Priority',
    icon: Sparkles,
  }
];

export interface DropdownOptionRecord {
  id: number;
  category: string;
  value: string;
  label: string | null;
  sortOrder: number;
  isActive: boolean;
}

export const AdminDropdownsConfig: React.FC<AdminDropdownsConfigProps> = ({
  dropdownOptions,
  onUpdateDropdownOptions,
  staffList,
  currentUser,
}) => {
  const [designatedFocalPersons, setDesignatedFocalPersons] = useState<string[]>(() => {
    return (staffList || []).filter(s => s.isFocalPerson).map(s => s.id);
  });

  const [dbOptionsGrouped, setDbOptionsGrouped] = useState<Record<string, DropdownOptionRecord[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newOptionInput, setNewOptionInput] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<DropdownCategoryKey>('document_classification');
  const [quickSupervisorToAdd, setQuickSupervisorToAdd] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>('');

  const eligibleSupervisors = useMemo(() => {
    return staffList.filter((staff) => {
      if (staff.status === 'suspended') return false;
      return hasSupervisorPermissions(staff);
    });
  }, [staffList]);

  const nonSupervisorStaff = useMemo(() => {
    return staffList.filter((staff) => {
      return !hasSupervisorPermissions(staff);
    });
  }, [staffList]);

  const fetchOptions = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<{ dropdownOptions: Record<string, DropdownOptionRecord[]> }>('/api/dropdown-options/grouped?includeInactive=true');
      setDbOptionsGrouped(data.dropdownOptions || {});
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error fetching dropdowns');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleAddOption = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawVal = newOptionInput.trim();
    if (!rawVal) return;

    try {
      await apiRequest('/api/dropdown-options', {
        method: 'POST',
        body: JSON.stringify({
          category: selectedCategory,
          value: rawVal,
          label: rawVal,
        }),
      });

      await fetchOptions();
      setNewOptionInput('');
      setSaveSuccessMsg(`Option added successfully.`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add option');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleDeactivateOption = async (id: number) => {
    try {
      await apiRequest(`/api/dropdown-options/${id}/deactivate`, { method: 'PATCH' });
      await fetchOptions();
      setSaveSuccessMsg(`Option deactivated.`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to deactivate option');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleRestoreOption = async (id: number) => {
    try {
      await apiRequest(`/api/dropdown-options/${id}/restore`, { method: 'PATCH' });
      await fetchOptions();
      setSaveSuccessMsg(`Option restored.`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to restore option');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleReorder = async (id: number, direction: 'up' | 'down') => {
    const currentList = dbOptionsGrouped[selectedCategory] || [];
    const index = currentList.findIndex(o => o.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentList.length - 1) return;

    const newList = [...currentList];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newList[index].sortOrder;
    newList[index].sortOrder = newList[swapIndex].sortOrder;
    newList[swapIndex].sortOrder = temp;

    try {
      await apiRequest('/api/dropdown-options/reorder', {
        method: 'PUT',
        body: JSON.stringify({
          items: [
            { id: newList[index].id, sortOrder: newList[index].sortOrder },
            { id: newList[swapIndex].id, sortOrder: newList[swapIndex].sortOrder }
          ]
        })
      });
      await fetchOptions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reorder');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleToggleFocalPerson = async (id: string) => {
    const staff = staffList.find(s => s.id === id);
    if (!staff) return;
    const isCurrentlyDesignated = designatedFocalPersons.includes(id);
    try {
      const res = await fetch(`/api/personnel/${staff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...staff, isFocalPerson: !isCurrentlyDesignated })
      });
      if (res.ok) {
        setDesignatedFocalPersons(prev => {
          if (isCurrentlyDesignated) {
            return prev.filter(p => p !== id);
          } else {
            return [...prev, id];
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddQuickSupervisor = async () => {
    if (!quickSupervisorToAdd) return;
    const staff = staffList.find(s => s.id === quickSupervisorToAdd);
    if (!staff) return;
    
    try {
      const res = await fetch(`/api/personnel/${staff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...staff, isFocalPerson: true })
      });
      if (res.ok) {
        setDesignatedFocalPersons(prev => [...prev, staff.id]);
        setSaveSuccessMsg('Focal Person added successfully!');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
    setQuickSupervisorToAdd('');
  };

  const handleRemoveFocalPerson = async (id: string) => {
    const staff = staffList.find(s => s.id === id);
    if (!staff) return;
    try {
      const res = await fetch(`/api/personnel/${staff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...staff, isFocalPerson: false })
      });
      if (res.ok) {
        setDesignatedFocalPersons(prev => prev.filter(p => p !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveFocalPersons = () => {
    // Legacy save, nothing to do since it's saved automatically now
    setSaveSuccessMsg('Focal Person configurations are saved automatically!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6" id="admin-dropdown-settings-module">
      <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-2xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/40 text-[11px] font-mono font-bold text-indigo-300">
              System Admin Exclusive
            </span>
            <span className="text-xs text-indigo-200/70 font-medium">Registry &amp; Routing Governance</span>
          </div>
          <h3 className="text-lg font-bold tracking-tight text-white mt-1 flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-400" />
            Dropdown Options &amp; Focal Person Assignment
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Configure authoritative dropdown choices. Changes are instantly synchronized with PostgreSQL. Designate Focal Persons exclusively from enrolled personnel with supervisor permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            id="admin-save-dropdowns-btn"
            onClick={handleSaveFocalPersons}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white shadow-sm transition-all cursor-pointer hover:shadow-md"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Focal Persons</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs font-medium text-emerald-200 flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}
      
      {errorMsg && (
        <div className="p-3.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs font-medium text-rose-200 flex items-center gap-2 shadow-sm animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Part 1: Focal Person Assignment */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Focal Person Designation
                </h4>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Supervisor Permissions Required
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Under agency protocol, Focal Persons assigned to monitor transactions, manage incoming/outgoing flow, and resolve compliance must be selected among enrolled personnel with supervisor permissions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                Eligible Supervisors:
              </span>
              <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                {eligibleSupervisors.length} of {staffList.length} Staff
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Select Enrolled Supervisor to Designate
              </label>
              <select
                id="select-focal-supervisor"
                value={quickSupervisorToAdd}
                onChange={(e) => setQuickSupervisorToAdd(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose from Enrolled Personnel with Supervisor Roles --</option>
                {eligibleSupervisors
                  .filter((s) => !designatedFocalPersons.includes(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} — {s.role} ({s.division})
                    </option>
                  ))}
              </select>
            </div>

            <div className="sm:self-end w-full sm:w-auto">
              <button
                type="button"
                id="btn-add-focal-person"
                onClick={handleAddQuickSupervisor}
                disabled={!quickSupervisorToAdd}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Designate as Focal Person</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>
              Dropdown filtering active: Only personnel enrolled with Supervisor, Division Manager, Department Manager, or System Admin permissions appear above.
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Active Designated Focal Persons ({designatedFocalPersons.length})
            </span>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                placeholder="Filter supervisor roster..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {eligibleSupervisors
              .filter(
                (s) =>
                  !staffSearchQuery ||
                  s.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
                  s.division.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
                  s.role.toLowerCase().includes(staffSearchQuery.toLowerCase())
              )
              .map((staff) => {
                const isDesignated = designatedFocalPersons.includes(staff.id);
                const roleConfig = getRoleConfig(staff.role);

                return (
                  <div
                    key={staff.id}
                    onClick={() => handleToggleFocalPerson(staff.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isDesignated
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-400/50 shadow-xs'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            isDesignated
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {staff.avatarInitials || staff.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {staff.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                            {staff.division}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${roleConfig.badgeBg} ${roleConfig.badgeText} ${roleConfig.badgeBorder}`}
                      >
                        {staff.role}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px]">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">Supervisor Auth Verified</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={isDesignated}
                          onChange={() => {}} 
                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span
                          className={`font-semibold ${
                            isDesignated ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-400'
                          }`}
                        >
                          {isDesignated ? 'Active Focal' : 'Assign'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {eligibleSupervisors.length === 0 && (
            <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
              <AlertCircle className="w-5 h-5 mx-auto text-amber-500 mb-1.5" />
              No enrolled personnel with supervisor permissions found in the roster. Open Staff Roles to enroll or promote personnel to Supervisor or Manager rank.
            </div>
          )}

          {nonSupervisorStaff.length > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  <strong>{nonSupervisorStaff.length} enrolled staff</strong> (e.g. {nonSupervisorStaff.slice(0, 3).map((s) => s.name).join(', ')}{nonSupervisorStaff.length > 3 ? '...' : ''}) hold standard Receiving/Staff roles and are excluded from the Focal Person selector.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Part 2: PostgreSQL Configurable Dropdown Options (7 Categories) */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-6 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        )}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                PostgreSQL Dropdown Options Editor
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-[9px] uppercase tracking-wider font-bold border border-emerald-200 dark:border-emerald-800">Live Sync</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Enter, customize, or remove standard dropdown choices used across document intake, logging, and routing slips. Database changes are applied immediately.
              </p>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mt-4">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const items = dbOptionsGrouped[cat.key] || [];
              const activeCount = items.filter(o => o.isActive).length;
              const isActiveTab = selectedCategory === cat.key;

              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.key);
                    setNewOptionInput('');
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActiveTab
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isActiveTab
                        ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {activeCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {(() => {
          const currentMeta = CATEGORIES.find((c) => c.key === selectedCategory)!;
          const currentItems = (dbOptionsGrouped[selectedCategory] || []).sort((a, b) => a.sortOrder - b.sortOrder);
          const Icon = currentMeta.icon;

          return (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Icon className="w-4 h-4 text-blue-500" />
                    <span>{currentMeta.label} Options</span>
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {currentMeta.description}
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleAddOption}
                className="flex flex-col sm:flex-row gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newOptionInput}
                    onChange={(e) => setNewOptionInput(e.target.value)}
                    placeholder={currentMeta.placeholder}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  id={`btn-add-${selectedCategory}-option`}
                  disabled={!newOptionInput.trim() || isLoading}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Option</span>
                </button>
              </form>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-850/40">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                  <span>Configured Option Value</span>
                  <span className="w-24 text-right">Actions</span>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-96 overflow-y-auto">
                  {currentItems.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 italic">
                      No options currently configured for {currentMeta.label}. Type an option above and click Add.
                    </div>
                  ) : (
                    currentItems.map((item, index) => (
                      <div
                        key={item.id}
                        className={`px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${item.isActive ? 'hover:bg-white dark:hover:bg-slate-800/80 bg-transparent' : 'bg-slate-100 dark:bg-slate-900/50 opacity-60'}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-mono text-slate-600 dark:text-slate-300 shrink-0">
                            {index + 1}
                          </span>
                          <span className={`text-xs font-medium truncate ${item.isActive ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400 line-through'}`}>
                            {item.value}
                          </span>
                          {!item.isActive && (
                            <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-[9px] font-bold uppercase rounded text-slate-600 dark:text-slate-400">Inactive</span>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-1 shrink-0 w-24">
                          <button
                            type="button"
                            onClick={() => handleReorder(item.id, 'up')}
                            disabled={index === 0 || !item.isActive}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 transition-colors"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorder(item.id, 'down')}
                            disabled={index === currentItems.length - 1 || !item.isActive}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 transition-colors"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          {item.isActive ? (
                            <button
                              type="button"
                              onClick={() => handleDeactivateOption(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="Deactivate option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRestoreOption(item.id)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                              title="Restore option"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
export default AdminDropdownsConfig;
