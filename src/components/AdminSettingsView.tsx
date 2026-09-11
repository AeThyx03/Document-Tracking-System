import React, { useState } from 'react';
import { TimeInDeskConfig, DocumentItem, AppUserRole } from '../types';
import { calculateDocumentTimeInDesk, DEFAULT_TIME_IN_DESK_CONFIG } from '../lib/timeInDesk';
import { SheetMetadata } from '../lib/googleSheets';
import {
  Sliders,
  Timer,
  Clock,
  AlertTriangle,
  Users,
  FileSpreadsheet,
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
} from 'lucide-react';
import { useOnlineStatus } from './usePWAInstall';
import { PWAInstallButton } from './PWAInstallButton';

interface AdminSettingsViewProps {
  timeInDeskConfig: TimeInDeskConfig;
  onSaveConfig: (newConfig: TimeInDeskConfig) => void;
  documents: DocumentItem[];
  staffList: AppUserRole[];
  sheetConfig: SheetMetadata | null;
  onOpenRolesModal: () => void;
  onOpenSheetModal: () => void;
  availableDivisions: string[];
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  timeInDeskConfig,
  onSaveConfig,
  documents,
  staffList,
  sheetConfig,
  onOpenRolesModal,
  onOpenSheetModal,
  availableDivisions,
}) => {
  const [defaultHours, setDefaultHours] = useState(timeInDeskConfig.defaultThresholdHours);
  const [divisionThresholds, setDivisionThresholds] = useState<Record<string, number>>({
    ...timeInDeskConfig.divisionThresholds,
  });
  const [highlightRowOnExceed, setHighlightRowOnExceed] = useState(timeInDeskConfig.highlightRowOnExceed);
  const [selectedDivisionToAdd, setSelectedDivisionToAdd] = useState('');
  const [overrideHoursToAdd, setOverrideHoursToAdd] = useState(48);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

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
              System Admin Only
            </span>
            <span className="text-xs text-slate-400">Settings &amp; SLA Controls</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            System Administration &amp; Threshold Settings
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Configure institutional Time-in-Desk dwell time thresholds, supervise division compliance limits, manage staff credentials, and inspect offline caching.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton />
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

      {/* Main Grid: Thresholds Configuration & Overview */}
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

          {/* Google Sheets Integration Box */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Master Google Sheet Sync
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                sheetConfig
                  ? 'bg-slate-800 text-slate-200 border border-slate-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
                {sheetConfig ? 'Linked' : 'Not Linked'}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Zero-Login public synchronization is enabled. Connect a single Google Sheet set to &quot;Anyone with the link as Editor&quot; to permanently store all entries.
            </p>

            <button
              type="button"
              id="admin-open-sheet-btn"
              onClick={onOpenSheetModal}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Configure Master Sheet Integration</span>
            </button>
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
    </div>
  );
};
