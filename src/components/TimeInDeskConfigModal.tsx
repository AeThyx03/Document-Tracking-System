import React, { useState } from 'react';
import { TimeInDeskConfig, DocumentItem } from '../types';
import { PossdLogo } from './PossdLogo';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  RotateCcw,
  Sliders,
  Building2,
  HelpCircle,
  BellRing,
  Trash2,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { DEFAULT_TIME_IN_DESK_CONFIG, calculateDocumentTimeInDesk } from '../lib/timeInDesk';

interface TimeInDeskConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TimeInDeskConfig;
  onSaveConfig: (updated: TimeInDeskConfig) => void;
  documents: DocumentItem[];
  availableDivisions: string[];
  currentUserRole?: string;
}

export const TimeInDeskConfigModal: React.FC<TimeInDeskConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  documents,
  availableDivisions,
  currentUserRole = 'Staff',
}) => {
  if (!isOpen) return null;

  const isSystemAdmin = currentUserRole === 'System Admin';

  const [defaultHours, setDefaultHours] = useState<number>(config.defaultThresholdHours || 24);
  const [divisionThresholds, setDivisionThresholds] = useState<Record<string, number>>({
    ...config.divisionThresholds,
  });
  const [highlightRowOnExceed, setHighlightRowOnExceed] = useState<boolean>(
    config.highlightRowOnExceed ?? true
  );
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Calculate live preview of overdue documents with tentative settings
  const tentativeConfig: TimeInDeskConfig = {
    defaultThresholdHours: defaultHours,
    divisionThresholds,
    highlightRowOnExceed,
  };

  const overdueDocs = documents.filter((doc) => {
    const metrics = calculateDocumentTimeInDesk(doc, tentativeConfig);
    return metrics.isOverdue;
  });

  const handlePresetSelect = (hours: number) => {
    setDefaultHours(hours);
  };

  const handleDivisionChange = (division: string, value: string) => {
    setPermissionError(null);
    const num = parseInt(value, 10);
    
    // If user is trying to delete/clear the override by emptying the input
    if (isNaN(num) || num <= 0) {
      if (!isSystemAdmin) {
        setPermissionError(`Permission Denied: Only the System Administrator is authorized to delete or clear Division-Specific Threshold Overrides.`);
        return;
      }
      setDivisionThresholds((prev) => {
        const next = { ...prev };
        delete next[division];
        return next;
      });
    } else {
      setDivisionThresholds((prev) => ({
        ...prev,
        [division]: num,
      }));
    }
  };

  const handleDeleteOverride = (division: string) => {
    if (!isSystemAdmin) {
      setPermissionError(`Permission Denied: Only the System Administrator is authorized to delete Division-Specific Threshold Overrides.`);
      return;
    }
    setDivisionThresholds((prev) => {
      const next = { ...prev };
      delete next[division];
      return next;
    });
    setPermissionError(null);
  };

  const handleDeleteAllOverrides = () => {
    if (!isSystemAdmin) {
      setPermissionError(`Permission Denied: Only the System Administrator is authorized to delete Division-Specific Threshold Overrides.`);
      return;
    }
    setDivisionThresholds({});
    setPermissionError(null);
  };

  const handleResetDefaults = () => {
    if (!isSystemAdmin && Object.keys(divisionThresholds).length > 0) {
      setPermissionError(`Permission Denied: Resetting division overrides requires System Administrator authorization.`);
      return;
    }
    setDefaultHours(DEFAULT_TIME_IN_DESK_CONFIG.defaultThresholdHours);
    setDivisionThresholds({ ...DEFAULT_TIME_IN_DESK_CONFIG.divisionThresholds });
    setHighlightRowOnExceed(DEFAULT_TIME_IN_DESK_CONFIG.highlightRowOnExceed);
    setPermissionError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      defaultThresholdHours: Math.max(1, defaultHours),
      divisionThresholds,
      highlightRowOnExceed,
    });
    onClose();
  };

  // Merge default list of divisions with availableDivisions prop
  const allDivisions = Array.from(
    new Set([
      'Finance & Budget Division',
      'Operations & Emergency Management',
      'Planning & Quality Assurance',
      'Legal & Regulatory Affairs',
      'Administrative & General Services',
      'Executive Office of the Manager',
      'Central Records & Receiving Desk',
      'Information Technology Division',
      ...availableDivisions,
    ])
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 bg-[#0c2340] dark:bg-[#071526] border-b border-[#1b3d64] dark:border-slate-800 text-white flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-amber-400/50">
              <PossdLogo className="w-8 h-8" variant="black" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Time-in-Desk Threshold Configuration
              </h2>
              <p className="text-xs text-blue-200 dark:text-blue-300/80">
                Configure allowable dwell time thresholds per division. Documents exceeding their threshold highlight in red.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Pill Strip */}
        <div className="px-6 py-3 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Active Rule:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600">
              Default: {defaultHours} hours
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-400">Simulated Overdue Impact:</span>
            {overdueDocs.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>{overdueDocs.length} Documents Exceeded</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>All documents within threshold</span>
              </span>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: Global Default Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="global-threshold-input" className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Default Division Threshold (Hours)</span>
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">Applies when no division override is set</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-36">
                <input
                  id="global-threshold-input"
                  type="number"
                  min={1}
                  max={720}
                  value={defaultHours}
                  onChange={(e) => setDefaultHours(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-medium pointer-events-none">
                  hrs
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: '4h (Rush)', value: 4 },
                  { label: '8h (Same Day)', value: 8 },
                  { label: '12h (Half Day)', value: 12 },
                  { label: '24h (Standard)', value: 24 },
                  { label: '48h (2 Days)', value: 48 },
                  { label: '72h (3 Days)', value: 72 },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handlePresetSelect(preset.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      defaultHours === preset.value
                        ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Division-Specific Threshold Overrides */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>Division-Specific Threshold Overrides</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set customized maximum allowed desk stay hours for specific operational units.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 font-bold">
                  {Object.keys(divisionThresholds).length} custom overrides
                </span>

                {isSystemAdmin && Object.keys(divisionThresholds).length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllOverrides}
                    className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title="System Admin: Delete all division-specific overrides"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Delete All Overrides</span>
                  </button>
                )}
              </div>
            </div>

            {/* Permission feedback / error notice */}
            {permissionError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2 animate-in fade-in duration-150">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Authorization Notice: </span>
                  <span>{permissionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPermissionError(null)}
                  className="text-rose-500 hover:text-rose-800 dark:hover:text-rose-200 font-bold text-xs cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Admin permission badge info */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] flex items-center justify-between text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong className="text-slate-800 dark:text-slate-100">Security Rule: </strong>
                  Only <strong className="text-slate-900 dark:text-white">System Administrator</strong> possesses clearance to delete division threshold overrides.
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isSystemAdmin ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {isSystemAdmin ? 'Admin Clearance Granted' : `Viewing as ${currentUserRole}`}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 overflow-hidden">
              {allDivisions.map((division) => {
                const customVal = divisionThresholds[division];
                
                // Count documents in this division
                const docsInDiv = documents.filter((d) => d.targetDivision === division);
                const overdueInDiv = docsInDiv.filter((d) => {
                  const m = calculateDocumentTimeInDesk(d, tentativeConfig);
                  return m.isOverdue;
                });

                return (
                  <div
                    key={division}
                    className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-850 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">{division}</span>
                        {customVal !== undefined && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Custom Override
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{docsInDiv.length} active docs</span>
                        {overdueInDiv.length > 0 && (
                          <span className="text-rose-700 dark:text-rose-400 font-bold flex items-center gap-0.5">
                            • <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> {overdueInDiv.length} overdue
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative w-28">
                        <input
                          type="number"
                          min={1}
                          max={720}
                          placeholder={defaultHours.toString()}
                          value={customVal !== undefined ? customVal : ''}
                          onChange={(e) => handleDivisionChange(division, e.target.value)}
                          className="w-full pl-2.5 pr-7 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-mono text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-white dark:bg-slate-800"
                        />
                        <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium pointer-events-none">
                          hrs
                        </span>
                      </div>

                      {customVal !== undefined ? (
                        isSystemAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteOverride(division)}
                            title="System Admin: Delete division threshold override"
                            className="text-xs text-rose-700 dark:text-rose-300 hover:text-rose-900 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-900 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span>Delete Override</span>
                          </button>
                        ) : (
                          <span
                            title="System Administrator authorization required to delete division overrides"
                            className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md flex items-center gap-1 font-medium select-none"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Locked</span>
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 w-24 text-center">
                          (default {defaultHours}h)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Visual Alert Preferences */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BellRing className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Visual Highlighting Preferences</span>
            </h3>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
              <input
                type="checkbox"
                checked={highlightRowOnExceed}
                onChange={(e) => setHighlightRowOnExceed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Highlight entire document row in red when threshold is exceeded
                </span>
                <span className="text-slate-500 dark:text-slate-400 block mt-0.5">
                  Applies a soft red background tint and left red indicator strip to the table row so overdue items stand out immediately.
                </span>
              </div>
            </label>
          </div>

          {/* Helper Callout */}
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">How Time-in-Desk is measured:</span> Dwell time begins upon the document's arrival at the target division or latest internal movement desk. When cleared for outward dispatch or archived by the Department Manager, the metric freezes at the clearance timestamp.
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Reset to Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="save-threshold-config-btn"
                className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Save Threshold Configuration
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
