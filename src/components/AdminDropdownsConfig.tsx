import React, { useState, useMemo } from 'react';
import { AppUserRole, RegistryDropdownOptions, DEFAULT_REGISTRY_DROPDOWN_OPTIONS } from '../types';
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
} from 'lucide-react';

interface AdminDropdownsConfigProps {
  dropdownOptions: RegistryDropdownOptions;
  onUpdateDropdownOptions: (newOptions: RegistryDropdownOptions) => void;
  staffList: AppUserRole[];
  currentUser?: AppUserRole | null;
}

type DropdownCategoryKey =
  | 'documentTypes'
  | 'communicationTypes'
  | 'reportTypes'
  | 'originatingAgencies'
  | 'targetDivisions';

interface CategoryMeta {
  key: DropdownCategoryKey;
  label: string;
  fieldInDoc: string;
  description: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultItems: string[];
}

const CATEGORIES: CategoryMeta[] = [
  {
    key: 'documentTypes',
    label: 'Transaction Type',
    fieldInDoc: 'documentType',
    description: 'Categories of transactions processed through POSSD (e.g. Simple, Complex, Technical).',
    placeholder: 'e.g. Urgent Special Clearance',
    icon: Tag,
    defaultItems: DEFAULT_REGISTRY_DROPDOWN_OPTIONS.documentTypes,
  },
  {
    key: 'communicationTypes',
    label: 'Communication Type',
    fieldInDoc: 'communicationType',
    description: 'Official correspondence and communication forms received or transmitted.',
    placeholder: 'e.g. Administrative Order',
    icon: FileText,
    defaultItems: DEFAULT_REGISTRY_DROPDOWN_OPTIONS.communicationTypes,
  },
  {
    key: 'reportTypes',
    label: 'Report / Document Type',
    fieldInDoc: 'reportType',
    description: 'Document classifications, inspection findings, and specialized reports.',
    placeholder: 'e.g. Environmental Clearance Slip',
    icon: Layers,
    defaultItems: DEFAULT_REGISTRY_DROPDOWN_OPTIONS.reportTypes,
  },
  {
    key: 'originatingAgencies',
    label: 'Originating Dept / Agency',
    fieldInDoc: 'originDepartment',
    description: 'External departments, government bureaus, regional offices, and external senders.',
    placeholder: 'e.g. Department of Transportation, Regional Trial Court',
    icon: Building2,
    defaultItems: DEFAULT_REGISTRY_DROPDOWN_OPTIONS.originatingAgencies || [],
  },
  {
    key: 'targetDivisions',
    label: 'Forward To / Target Division',
    fieldInDoc: 'targetDivision',
    description: 'Internal receiving sections, operating units, and division offices within the agency.',
    placeholder: 'e.g. Administrative Section, Finance Division',
    icon: Send,
    defaultItems: DEFAULT_REGISTRY_DROPDOWN_OPTIONS.targetDivisions || [],
  },
];

export const AdminDropdownsConfig: React.FC<AdminDropdownsConfigProps> = ({
  dropdownOptions,
  onUpdateDropdownOptions,
  staffList,
  currentUser,
}) => {
  // Active editable state
  const [transactionTypes, setTransactionTypes] = useState<string[]>(
    dropdownOptions.documentTypes?.length > 0
      ? dropdownOptions.documentTypes
      : DEFAULT_REGISTRY_DROPDOWN_OPTIONS.documentTypes
  );
  const [communicationTypes, setCommunicationTypes] = useState<string[]>(
    dropdownOptions.communicationTypes?.length > 0
      ? dropdownOptions.communicationTypes
      : DEFAULT_REGISTRY_DROPDOWN_OPTIONS.communicationTypes
  );
  const [reportTypes, setReportTypes] = useState<string[]>(
    dropdownOptions.reportTypes?.length > 0
      ? dropdownOptions.reportTypes
      : DEFAULT_REGISTRY_DROPDOWN_OPTIONS.reportTypes
  );
  const [originatingAgencies, setOriginatingAgencies] = useState<string[]>(
    dropdownOptions.originatingAgencies && dropdownOptions.originatingAgencies.length > 0
      ? dropdownOptions.originatingAgencies
      : DEFAULT_REGISTRY_DROPDOWN_OPTIONS.originatingAgencies || []
  );
  const [targetDivisions, setTargetDivisions] = useState<string[]>(
    dropdownOptions.targetDivisions && dropdownOptions.targetDivisions.length > 0
      ? dropdownOptions.targetDivisions
      : dropdownOptions.departments?.length > 0
      ? dropdownOptions.departments
      : DEFAULT_REGISTRY_DROPDOWN_OPTIONS.targetDivisions || []
  );

  // Focal person designated state
  const [designatedFocalPersons, setDesignatedFocalPersons] = useState<string[]>(() => {
    if (dropdownOptions.focalPersons && dropdownOptions.focalPersons.length > 0) {
      return dropdownOptions.focalPersons;
    }
    return DEFAULT_REGISTRY_DROPDOWN_OPTIONS.focalPersons || ['Mary Flor Aquino', 'Aubrey Camille Cabreras'];
  });

  // Inputs for adding new options
  const [newOptionInputs, setNewOptionInputs] = useState<Record<DropdownCategoryKey, string>>({
    documentTypes: '',
    communicationTypes: '',
    reportTypes: '',
    originatingAgencies: '',
    targetDivisions: '',
  });

  const [selectedCategory, setSelectedCategory] = useState<DropdownCategoryKey>('documentTypes');
  const [quickSupervisorToAdd, setQuickSupervisorToAdd] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>('');

  // 1. Filter enrolled personnel who have supervisor permissions
  const eligibleSupervisors = useMemo(() => {
    return staffList.filter((staff) => {
      // Must not be suspended
      if (staff.status === 'suspended') return false;
      return hasSupervisorPermissions(staff);
    });
  }, [staffList]);

  // 2. Filter personnel who DO NOT have supervisor permissions (for institutional transparency note)
  const nonSupervisorStaff = useMemo(() => {
    return staffList.filter((staff) => {
      return !hasSupervisorPermissions(staff);
    });
  }, [staffList]);

  // Handlers for adding and deleting dropdown options
  const handleAddOption = (categoryKey: DropdownCategoryKey, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawVal = newOptionInputs[categoryKey]?.trim();
    if (!rawVal) return;

    const updaterMap: Record<DropdownCategoryKey, React.Dispatch<React.SetStateAction<string[]>>> = {
      documentTypes: setTransactionTypes,
      communicationTypes: setCommunicationTypes,
      reportTypes: setReportTypes,
      originatingAgencies: setOriginatingAgencies,
      targetDivisions: setTargetDivisions,
    };

    updaterMap[categoryKey]((prev) => {
      if (prev.some((item) => item.toLowerCase() === rawVal.toLowerCase())) {
        return prev;
      }
      return [...prev, rawVal];
    });

    setNewOptionInputs((prev) => ({ ...prev, [categoryKey]: '' }));
  };

  const handleDeleteOption = (categoryKey: DropdownCategoryKey, itemToDelete: string) => {
    const updaterMap: Record<DropdownCategoryKey, React.Dispatch<React.SetStateAction<string[]>>> = {
      documentTypes: setTransactionTypes,
      communicationTypes: setCommunicationTypes,
      reportTypes: setReportTypes,
      originatingAgencies: setOriginatingAgencies,
      targetDivisions: setTargetDivisions,
    };

    updaterMap[categoryKey]((prev) => prev.filter((item) => item !== itemToDelete));
  };

  const handleResetCategory = (categoryKey: DropdownCategoryKey) => {
    const cat = CATEGORIES.find((c) => c.key === categoryKey);
    if (!cat) return;
    const updaterMap: Record<DropdownCategoryKey, React.Dispatch<React.SetStateAction<string[]>>> = {
      documentTypes: setTransactionTypes,
      communicationTypes: setCommunicationTypes,
      reportTypes: setReportTypes,
      originatingAgencies: setOriginatingAgencies,
      targetDivisions: setTargetDivisions,
    };
    updaterMap[categoryKey]([...cat.defaultItems]);
    setSaveSuccessMsg(`Reset "${cat.label}" options to institutional presets.`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Focal person toggle handler - strictly selects among eligible supervisors
  const handleToggleFocalPerson = (supervisorName: string) => {
    setDesignatedFocalPersons((prev) => {
      if (prev.includes(supervisorName)) {
        // Remove
        return prev.filter((name) => name !== supervisorName);
      } else {
        // Add
        return [...prev, supervisorName];
      }
    });
  };

  const handleAddQuickSupervisor = () => {
    if (!quickSupervisorToAdd) return;
    if (!designatedFocalPersons.includes(quickSupervisorToAdd)) {
      setDesignatedFocalPersons((prev) => [...prev, quickSupervisorToAdd]);
    }
    setQuickSupervisorToAdd('');
  };

  // Save all options
  const handleSaveAll = () => {
    const updated: RegistryDropdownOptions = {
      ...dropdownOptions,
      documentTypes: transactionTypes,
      transactionTypes: transactionTypes,
      communicationTypes,
      reportTypes,
      originatingAgencies,
      targetDivisions,
      departments: targetDivisions, // keep departments aligned
      focalPersons: designatedFocalPersons,
    };

    onUpdateDropdownOptions(updated);
    setSaveSuccessMsg('System Admin dropdown options & Focal Person configurations saved successfully!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleResetAllToDefaults = () => {
    setTransactionTypes([...DEFAULT_REGISTRY_DROPDOWN_OPTIONS.documentTypes]);
    setCommunicationTypes([...DEFAULT_REGISTRY_DROPDOWN_OPTIONS.communicationTypes]);
    setReportTypes([...DEFAULT_REGISTRY_DROPDOWN_OPTIONS.reportTypes]);
    setOriginatingAgencies([...(DEFAULT_REGISTRY_DROPDOWN_OPTIONS.originatingAgencies || [])]);
    setTargetDivisions([...(DEFAULT_REGISTRY_DROPDOWN_OPTIONS.targetDivisions || [])]);
    setDesignatedFocalPersons([...(DEFAULT_REGISTRY_DROPDOWN_OPTIONS.focalPersons || [])]);

    setSaveSuccessMsg('Reset all dropdown options and focal persons to default settings.');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Current category data helper
  const getCategoryList = (key: DropdownCategoryKey): string[] => {
    switch (key) {
      case 'documentTypes':
        return transactionTypes;
      case 'communicationTypes':
        return communicationTypes;
      case 'reportTypes':
        return reportTypes;
      case 'originatingAgencies':
        return originatingAgencies;
      case 'targetDivisions':
        return targetDivisions;
    }
  };

  return (
    <div className="space-y-6" id="admin-dropdown-settings-module">
      {/* Top Banner & Save Action Bar */}
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
            Configure authoritative dropdown choices for Transaction Type, Communication Type, Report / Document Type, Originating Dept / Agency, and Forward To / Target Division. Designate Focal Persons exclusively from enrolled personnel with supervisor permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetAllToDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>
          <button
            type="button"
            id="admin-save-dropdowns-btn"
            onClick={handleSaveAll}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white shadow-sm transition-all cursor-pointer hover:shadow-md"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Dropdown Settings</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs font-medium text-emerald-200 flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Part 1: Focal Person Assignment (Supervisor Permissions Mandatory) */}
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

        {/* Quick Add from Eligible Supervisors Bar */}
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
                  .filter((s) => !designatedFocalPersons.includes(s.name))
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

        {/* Search & Active Designated Badges */}
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

          {/* Supervisor Personnel Cards Grid */}
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
                const isDesignated = designatedFocalPersons.includes(staff.name);
                const roleConfig = getRoleConfig(staff.role);

                return (
                  <div
                    key={staff.id}
                    onClick={() => handleToggleFocalPerson(staff.name)}
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
                          onChange={() => {}} // handled by card click
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

          {/* Non-supervisor exclusion note */}
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

      {/* Part 2: Configurable Dropdown Options (5 Categories) */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Registry Dropdown Options Editor
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Enter, customize, or remove standard dropdown choices used across document intake, logging, and routing slips.
              </p>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mt-4">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const items = getCategoryList(cat.key);
              const isActive = selectedCategory === cat.key;

              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isActive
                        ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {items.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Category Management Area */}
        {(() => {
          const currentMeta = CATEGORIES.find((c) => c.key === selectedCategory)!;
          const currentItems = getCategoryList(selectedCategory);
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

                <button
                  type="button"
                  onClick={() => handleResetCategory(selectedCategory)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset {currentMeta.label} to Presets</span>
                </button>
              </div>

              {/* Add Input Form */}
              <form
                onSubmit={(e) => handleAddOption(selectedCategory, e)}
                className="flex flex-col sm:flex-row gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newOptionInputs[selectedCategory]}
                    onChange={(e) =>
                      setNewOptionInputs((prev) => ({
                        ...prev,
                        [selectedCategory]: e.target.value,
                      }))
                    }
                    placeholder={currentMeta.placeholder}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  id={`btn-add-${selectedCategory}-option`}
                  disabled={!newOptionInputs[selectedCategory].trim()}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Option</span>
                </button>
              </form>

              {/* List of Current Options */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-850/40">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                  <span>Configured Option Value</span>
                  <span>Action</span>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-72 overflow-y-auto">
                  {currentItems.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 italic">
                      No options currently configured for {currentMeta.label}. Type an option above and click Add.
                    </div>
                  ) : (
                    currentItems.map((item, index) => (
                      <div
                        key={`${item}-${index}`}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-mono text-slate-600 dark:text-slate-300 shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {item}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteOption(selectedCategory, item)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                          title={`Delete option "${item}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
