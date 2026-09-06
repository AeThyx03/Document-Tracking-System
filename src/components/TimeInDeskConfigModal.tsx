import React, { useState } from 'react';
import { TimeInDeskConfig, DocumentItem } from '../types';
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
} from 'lucide-react';
import { DEFAULT_TIME_IN_DESK_CONFIG, calculateDocumentTimeInDesk } from '../lib/timeInDesk';

interface TimeInDeskConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TimeInDeskConfig;
  onSaveConfig: (updated: TimeInDeskConfig) => void;
  documents: DocumentItem[];
  availableDivisions: string[];
}

export const TimeInDeskConfigModal: React.FC<TimeInDeskConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  documents,
  availableDivisions,
}) => {
  if (!isOpen) return null;

  const [defaultHours, setDefaultHours] = useState<number>(config.defaultThresholdHours || 24);
  const [divisionThresholds, setDivisionThresholds] = useState<Record<string, number>>({
    ...config.divisionThresholds,
  });
  const [highlightRowOnExceed, setHighlightRowOnExceed] = useState<boolean>(
    config.highlightRowOnExceed ?? true
  );

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
    const num = parseInt(value, 10);
    setDivisionThresholds((prev) => {
      const next = { ...prev };
      if (isNaN(num) || num <= 0) {
        delete next[division];
      } else {
        next[division] = num;
      }
      return next;
    });
  };

  const handleResetDefaults = () => {
    setDefaultHours(DEFAULT_TIME_IN_DESK_CONFIG.defaultThresholdHours);
    setDivisionThresholds({ ...DEFAULT_TIME_IN_DESK_CONFIG.divisionThresholds });
    setHighlightRowOnExceed(DEFAULT_TIME_IN_DESK_CONFIG.highlightRowOnExceed);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Clock className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Time-in-Desk Threshold Configuration
              </h2>
              <p className="text-xs text-slate-300">
                Configure allowable dwell time thresholds per division. Documents exceeding their threshold highlight in red.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Pill Strip */}
        <div className="px-6 py-3 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">Active Rule:</span>
            <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
              Default: {defaultHours} hours
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Simulated Overdue Impact:</span>
            {overdueDocs.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>{overdueDocs.length} Documents Exceeded</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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
              <label htmlFor="global-threshold-input" className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Default Division Threshold (Hours)</span>
              </label>
              <span className="text-xs text-slate-500">Applies when no division override is set</span>
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
                  className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
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
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      defaultHours === preset.value
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Division-Specific Threshold Overrides */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Division-Specific Threshold Overrides</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set customized maximum allowed desk stay hours for specific operational units.
                </p>
              </div>
              <span className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                {Object.keys(divisionThresholds).length} custom overrides
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden">
              {allDivisions.map((division) => {
                const customVal = divisionThresholds[division];
                const activeThreshold = customVal !== undefined ? customVal : defaultHours;
                
                // Count documents in this division
                const docsInDiv = documents.filter((d) => d.targetDivision === division);
                const overdueInDiv = docsInDiv.filter((d) => {
                  const m = calculateDocumentTimeInDesk(d, tentativeConfig);
                  return m.isOverdue;
                });

                return (
                  <div
                    key={division}
                    className="p-3 bg-white hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{division}</span>
                        {customVal !== undefined && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Custom Override
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{docsInDiv.length} active docs</span>
                        {overdueInDiv.length > 0 && (
                          <span className="text-rose-700 font-bold flex items-center gap-0.5">
                            • <AlertTriangle className="w-3 h-3 text-rose-600" /> {overdueInDiv.length} overdue
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
                          className="w-full pl-2.5 pr-7 py-1.5 rounded-lg border border-slate-300 font-mono text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-600 bg-white"
                        />
                        <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-medium pointer-events-none">
                          hrs
                        </span>
                      </div>

                      {customVal !== undefined ? (
                        <button
                          type="button"
                          onClick={() => handleDivisionChange(division, '')}
                          title="Clear override and use default"
                          className="text-[11px] text-slate-400 hover:text-rose-600 px-1.5 py-1 rounded hover:bg-slate-100 transition-colors"
                        >
                          Clear
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 w-10 text-center">
                          (default)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Visual Alert Preferences */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-indigo-600" />
              <span>Visual Highlighting Preferences</span>
            </h3>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/80 transition-colors">
              <input
                type="checkbox"
                checked={highlightRowOnExceed}
                onChange={(e) => setHighlightRowOnExceed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">
                  Highlight entire document row in red when threshold is exceeded
                </span>
                <span className="text-slate-500 block mt-0.5">
                  Applies a soft red background tint and left red indicator strip to the table row so overdue items stand out immediately.
                </span>
              </div>
            </label>
          </div>

          {/* Helper Callout */}
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">How Time-in-Desk is measured:</span> Dwell time begins upon the document's arrival at the target division or latest internal movement desk. When cleared for outward dispatch or archived by the Department Manager, the metric freezes at the clearance timestamp.
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset to Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="save-threshold-config-btn"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
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
