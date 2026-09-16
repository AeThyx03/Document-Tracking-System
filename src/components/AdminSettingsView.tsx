import React, { useState, useMemo } from 'react';
import { TimeInDeskConfig, DocumentItem, AppUserRole, RegistryDropdownOptions, DEFAULT_REGISTRY_DROPDOWN_OPTIONS } from '../types';
import { calculateDocumentTimeInDesk, DEFAULT_TIME_IN_DESK_CONFIG } from '../lib/timeInDesk';
import {
  Sliders,
  Timer,
  Clock,
  AlertTriangle,
  Users,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ShieldCheck,
  Building,
  Wifi,
  WifiOff,
  DownloadCloud,
  Activity,
  HardDrive,
  Download,
  Check,
  RefreshCw,
  Layers,
  Zap,
  Copy,
  FileCode,
  ExternalLink,
  FileText,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import { useOnlineStatus } from './usePWAInstall';
import { PWAInstallButton } from './PWAInstallButton';
import { AdminDropdownsConfig } from './AdminDropdownsConfig';
import { fetchCodebaseBundle, CodebaseBundleResponse } from '../lib/api';
import { canUserManageSettings } from '../lib/permissions';

interface AdminSettingsViewProps {
  timeInDeskConfig: TimeInDeskConfig;
  onSaveConfig: (newConfig: TimeInDeskConfig) => void;
  documents: DocumentItem[];
  staffList: AppUserRole[];
  onOpenRolesModal: () => void;
  availableDivisions: string[];
  currentUser?: AppUserRole | null;
  dropdownOptions?: RegistryDropdownOptions;
  onUpdateDropdownOptions?: (newOptions: RegistryDropdownOptions) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  timeInDeskConfig,
  onSaveConfig,
  documents,
  staffList,
  onOpenRolesModal,
  availableDivisions,
  currentUser,
  dropdownOptions = DEFAULT_REGISTRY_DROPDOWN_OPTIONS,
  onUpdateDropdownOptions = () => {},
}) => {
  const [adminActiveTab, setAdminActiveTab] = useState<'dropdowns' | 'sla' | 'overview'>('dropdowns');
  const [defaultHours, setDefaultHours] = useState(timeInDeskConfig.defaultThresholdHours);
  const [divisionThresholds, setDivisionThresholds] = useState<Record<string, number>>({
    ...timeInDeskConfig.divisionThresholds,
  });
  const [highlightRowOnExceed, setHighlightRowOnExceed] = useState(timeInDeskConfig.highlightRowOnExceed);
  const [selectedDivisionToAdd, setSelectedDivisionToAdd] = useState('');
  const [overrideHoursToAdd, setOverrideHoursToAdd] = useState(48);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  // Codebase compilation & verification states
  const [copyPromptStatus, setCopyPromptStatus] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle');
  const [copyRawStatus, setCopyRawStatus] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle');
  const [codebaseSummary, setCodebaseSummary] = useState<CodebaseBundleResponse | null>(null);

  const handleCopyPrompt = async () => {
    try {
      setCopyPromptStatus('loading');
      const bundle = await fetchCodebaseBundle();
      setCodebaseSummary(bundle);
      await navigator.clipboard.writeText(bundle.fullPrompt);
      setCopyPromptStatus('copied');
      setTimeout(() => setCopyPromptStatus('idle'), 3000);
    } catch (err) {
      console.error('Failed to copy codebase prompt:', err);
      setCopyPromptStatus('error');
      setTimeout(() => setCopyPromptStatus('idle'), 3500);
    }
  };

  const handleCopyRawCodebase = async () => {
    try {
      setCopyRawStatus('loading');
      const bundle = await fetchCodebaseBundle();
      setCodebaseSummary(bundle);
      await navigator.clipboard.writeText(bundle.rawCodebase);
      setCopyRawStatus('copied');
      setTimeout(() => setCopyRawStatus('idle'), 3000);
    } catch (err) {
      console.error('Failed to copy raw codebase:', err);
      setCopyRawStatus('error');
      setTimeout(() => setCopyRawStatus('idle'), 3500);
    }
  };

  const handleDownloadCodebase = async () => {
    try {
      const bundle = await fetchCodebaseBundle();
      setCodebaseSummary(bundle);
      const blob = new Blob([bundle.fullPrompt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `possd-codebase-verification-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download codebase:', err);
    }
  };

  // Strict check: Only System Admin may access System Admin Settings (SLA Thresholds, Staff)
  const isSystemAdmin = currentUser ? currentUser.role === 'System Admin' : true;
  const canManageSettings = currentUser ? canUserManageSettings(currentUser.role) : true;

  if (currentUser && !canManageSettings) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-center max-w-lg mx-auto my-12 space-y-4 animate-in fade-in">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center shadow-xs">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Settings Access Restricted
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Registry settings configuration is strictly restricted to <strong>Executive Management or System Admins</strong>.
          </p>
          <div className="mt-3 inline-block px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono">
            Current account: <span className="font-bold">{currentUser.name}</span> ({currentUser.role})
          </div>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={onOpenRolesModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Switch Role or View Directory</span>
          </button>
        </div>
      </div>
    );
  }

  // Overdue count calculation under tentative/active settings
  const overdueDocs = documents.filter((doc) => {
    const metrics = calculateDocumentTimeInDesk(doc, {
      defaultThresholdHours: defaultHours,
      divisionThresholds,
      highlightRowOnExceed,
    });
    return metrics.isOverdue;
  });

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveConfig({
      defaultThresholdHours: Math.max(1, defaultHours),
      divisionThresholds,
      highlightRowOnExceed,
    });
    setSaveFeedback('SLA threshold settings updated and applied across all desks.');
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  const handleResetDefaults = () => {
    setDefaultHours(DEFAULT_TIME_IN_DESK_CONFIG.defaultThresholdHours);
    setDivisionThresholds({ ...DEFAULT_TIME_IN_DESK_CONFIG.divisionThresholds });
    setHighlightRowOnExceed(DEFAULT_TIME_IN_DESK_CONFIG.highlightRowOnExceed);
    setSaveFeedback('Reset to institutional baseline defaults (24h default).');
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  const handleAddDivisionOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDivisionToAdd) return;
    setDivisionThresholds((prev) => ({
      ...prev,
      [selectedDivisionToAdd]: Math.max(1, overrideHoursToAdd),
    }));
    setSelectedDivisionToAdd('');
    setSaveFeedback(`Division rule added for "${selectedDivisionToAdd}". Click "Save Changes" to apply.`);
  };

  const handleDeleteOverride = (divName: string) => {
    setDivisionThresholds((prev) => {
      const next = { ...prev };
      delete next[divName];
      return next;
    });
    setSaveFeedback(`Rule for "${divName}" removed. Click "Save Changes" to apply.`);
  };

  const allDivisions = Array.from(
    new Set([
      'Central Records & Receiving Desk',
      'Finance & Budget Division',
      'Operations & Emergency Management',
      'Planning & Quality Assurance',
      'Legal & Regulatory Affairs',
      'Administrative & General Services',
      'Executive Office of the Manager',
      'Information Technology Division',
      ...availableDivisions,
    ])
  );

  const unconfiguredDivisions = allDivisions.filter((d) => divisionThresholds[d] === undefined);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-mono font-bold text-slate-300">
              {isSystemAdmin ? 'System Admin Only' : 'Executive Settings'}
            </span>
            <span className="text-xs text-slate-400">Settings &amp; Configuration</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            {isSystemAdmin ? 'System Administration & Threshold Settings' : 'System Registry Configuration'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            {isSystemAdmin 
              ? 'Configure institutional Time-in-Desk dwell time thresholds, supervise division compliance limits, manage staff credentials, and inspect offline caching.' 
              : 'Configure dropdown options, view system states, and inspect caching.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <PWAInstallButton />
          {isSystemAdmin && (
            <button
              type="button"
              id="btn-header-compile-code"
              onClick={handleCopyPrompt}
              title="Compile full codebase with audit prompt for AI checking"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              {copyPromptStatus === 'loading' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Compiling...</span>
                </>
              ) : copyPromptStatus === 'copied' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copied for Checking!</span>
                </>
              ) : (
                <>
                  <FileCode className="w-3.5 h-3.5 text-white" />
                  <span>Compile Code for Checking</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-white text-slate-900 shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-slate-900" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {saveFeedback && (
        <div className="p-3.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* Navigation Pills for Admin Settings */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          id="admin-tab-dropdowns"
          onClick={() => setAdminActiveTab('dropdowns')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            adminActiveTab === 'dropdowns'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Dropdown Options &amp; Focal Persons</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 dark:bg-slate-900/40 text-white font-mono">
            System Admin
          </span>
        </button>

        {isSystemAdmin && (
          <>
            <button
              type="button"
              id="admin-tab-sla"
              onClick={() => setAdminActiveTab('sla')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                adminActiveTab === 'sla'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Time-in-Desk SLA Thresholds</span>
            </button>

            <button
              type="button"
              id="admin-tab-overview"
              onClick={() => setAdminActiveTab('overview')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                adminActiveTab === 'overview'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>System Diagnostics &amp; Bundle</span>
            </button>
          </>
        )}
      </div>

      {/* Render Active Admin Tab */}
      {adminActiveTab === 'dropdowns' ? (
        <AdminDropdownsConfig
          dropdownOptions={dropdownOptions}
          onUpdateDropdownOptions={onUpdateDropdownOptions}
          staffList={staffList}
          currentUser={currentUser}
        />
      ) : adminActiveTab === 'overview' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Staff Roles & Access Box */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Staff Personnel Registry
                </span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {staffList.length} Staff
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Configure personnel accounts, manage login passwords, assign role hierarchies, and customize registry dropdowns.
            </p>

            <button
              type="button"
              id="admin-overview-open-roles-btn"
              onClick={onOpenRolesModal}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Staff Roles &amp; Passwords</span>
            </button>
          </div>

          {/* Data Persistence Architecture Box */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Database &amp; Persistence Layer
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                PostgreSQL Ready
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Authoritative document tracking, full movement history, supervisor remarks, and compliance trails.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>Enrolled Documents:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{documents.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Personnel Profiles:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{staffList.length}</span>
              </div>
              <div className="flex justify-between">
                <span>SLA Overdue Items:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{overdueDocs.length}</span>
              </div>
            </div>
          </div>

          {/* Service Worker & Caching Status Box */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>Service Worker &amp; Offline Cache</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                Active
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Static bundles, typography, and registry icons are precached. The application loads instantly even on weak or intermittent internet connections.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Connection: Active Internet</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  <span>Connection: Offline (Operating from local cache)</span>
                </>
              )}
            </div>
          </div>

          {/* System Architecture & Status Card */}
          <div className="p-5 bg-gradient-to-br from-white to-blue-50/40 dark:from-slate-900 dark:to-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  System Architecture &amp; Database
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold">
                PostgreSQL
              </span>
            </div>

            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Fully hardened with server-side document pagination, ACID relational transactions, append-only routing history, SLA computation in Asia/Manila timezone, and authenticated role-based audit logging.
            </p>

            <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Timezone: <strong className="text-slate-700 dark:text-slate-200">Asia/Manila (PST)</strong></span>
              <span>Pagination: <strong className="text-emerald-600 dark:text-emerald-400">Server-Side</strong></span>
            </div>
          </div>

          {/* Codebase Compilation & Checking Card */}
          <div className="p-5 bg-gradient-to-br from-white to-blue-50/60 dark:from-slate-900 dark:to-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl shadow-xs space-y-4 text-xs md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-xs">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Compile Full Codebase for AI Checking &amp; Verification
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Aggregates all project source files and bundles them with a comprehensive architecture audit prompt.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold flex items-center gap-1.5 border border-blue-200 dark:border-blue-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Bundle &amp; Audit Ready
              </span>
            </div>

            <div className="p-3.5 bg-white/90 dark:bg-slate-800/90 rounded-xl border border-blue-100 dark:border-blue-900/60 text-slate-600 dark:text-slate-300 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Status</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Ready to Compile</span>
                </div>
                <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Scope</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">Server Routes, PostgreSQL Schema, UI &amp; Tests</span>
                </div>
                {codebaseSummary && (
                  <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Compiled Stats</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {codebaseSummary.fileCount} files ({(codebaseSummary.totalSize / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                id="btn-copy-codebase-prompt"
                onClick={handleCopyPrompt}
                disabled={copyPromptStatus === 'loading'}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold transition-all cursor-pointer flex items-center justify-center gap-2 text-xs shadow-xs"
              >
                {copyPromptStatus === 'loading' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Compiling Codebase...</span>
                  </>
                ) : copyPromptStatus === 'copied' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied Code + Prompt!</span>
                  </>
                ) : copyPromptStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-300" />
                    <span>Failed - Click to Retry</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code + Check Prompt</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-copy-raw-codebase"
                onClick={handleCopyRawCodebase}
                disabled={copyRawStatus === 'loading'}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-bold transition-all cursor-pointer flex items-center justify-center gap-2 text-xs"
              >
                {copyRawStatus === 'loading' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Bundling...</span>
                  </>
                ) : copyRawStatus === 'copied' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Raw Codebase Copied!</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-slate-300" />
                    <span>Copy Raw Codebase Only</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-download-codebase"
                onClick={handleDownloadCodebase}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-all cursor-pointer flex items-center justify-center gap-2 text-xs border border-slate-200 dark:border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .txt Bundle</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* SLA Thresholds & Configuration Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Time-in-Desk SLA Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Time-in-Desk SLA Thresholds
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Allowable physical dwell time before a document is flagged as overdue
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Active Rule:
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  {defaultHours} Hours Default
                </span>
              </div>
            </div>

            {/* Baseline Default Hours Input */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Default General Baseline (Hours)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={defaultHours}
                  onChange={(e) => setDefaultHours(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-32 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  {[12, 24, 48, 72, 96, 120].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDefaultHours(preset)}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        defaultHours === preset
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {preset}h
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Applies to all divisions unless a division-specific rule is configured below.
              </p>
            </div>

            {/* Highlight Row Option */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Highlight Table Rows in Red when SLA Exceeded
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Flags documents immediately in the main registry and distribution views
                </p>
              </div>
              <input
                type="checkbox"
                checked={highlightRowOnExceed}
                onChange={(e) => setHighlightRowOnExceed(e.target.checked)}
                className="w-4 h-4 rounded text-slate-800 focus:ring-slate-500 cursor-pointer"
              />
            </div>

            {/* Division Overrides Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Division-Specific Threshold Overrides ({Object.keys(divisionThresholds).length})
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    High-volume or expedited desks can have customized allowable hours
                  </p>
                </div>
              </div>

              {/* Add New Division Override Form */}
              <form onSubmit={handleAddDivisionOverride} className="flex flex-col sm:flex-row gap-2 pt-1">
                <select
                  value={selectedDivisionToAdd}
                  onChange={(e) => setSelectedDivisionToAdd(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">-- Select Division to Override --</option>
                  {unconfiguredDivisions.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={overrideHoursToAdd}
                      onChange={(e) => setOverrideHoursToAdd(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-20 px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">hours</span>
                  </div>
                  <button
                    type="submit"
                    disabled={!selectedDivisionToAdd}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Rule</span>
                  </button>
                </div>
              </form>

              {/* Table of active division rules */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mt-3">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">Division Name</th>
                      <th className="px-3.5 py-2.5 w-32">Allowable SLA</th>
                      <th className="px-3.5 py-2.5 w-20 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {Object.entries(divisionThresholds).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3.5 py-4 text-center text-slate-400 italic">
                          No division-specific overrides active. All desks follow the {defaultHours}h default baseline.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(divisionThresholds).map(([divName, hours]) => (
                        <tr key={divName} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-3.5 py-2.5 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{divName}</span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                max="720"
                                value={hours}
                                onChange={(e) => {
                                  const num = parseInt(e.target.value, 10);
                                  if (!isNaN(num) && num > 0) {
                                    setDivisionThresholds((prev) => ({ ...prev, [divName]: num }));
                                  }
                                }}
                                className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                              />
                              <span className="text-slate-500 font-mono text-[11px]">hours</span>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteOverride(divName)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete division rule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Live Overdue Impact, Staff Registry & System Status */}
        <div className="space-y-6">
          {/* Overdue Live Summary Box */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Live SLA Impact
              </span>
              <span className="w-2 h-2 rounded-full bg-slate-400" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {overdueDocs.length}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Documents currently exceeding threshold
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Out of {documents.length} tracked records, {overdueDocs.length} will be visually flagged in red across desk queues.
            </p>
          </div>

          {/* Quick Staff Roles & Access Box */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Staff Personnel Registry
                </span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {staffList.length} Staff
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Configure personnel accounts, manage login passwords, assign role hierarchies, and customize registry dropdowns.
            </p>

            <button
              type="button"
              id="admin-open-roles-btn"
              onClick={onOpenRolesModal}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Staff Roles &amp; Passwords</span>
            </button>
          </div>

          {/* Data Persistence Architecture Box */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Database &amp; Persistence Layer
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Pre-PostgreSQL Ready
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Clean local persistence is active with authoritative document tracking, full movement history, supervisor remarks, and compliance trails. Ready for PostgreSQL backend integration.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>Enrolled Documents:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{documents.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Personnel Profiles:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{staffList.length}</span>
              </div>
              <div className="flex justify-between">
                <span>SLA Overdue Items:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{overdueDocs.length}</span>
              </div>
            </div>
          </div>

          {/* Service Worker & Caching Status Box */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>Service Worker &amp; Offline Cache</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                Active
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Static bundles, typography, and registry icons are precached. The application loads instantly even on weak or intermittent internet connections.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Connection: Active Internet</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  <span>Connection: Offline (Operating from local cache)</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
