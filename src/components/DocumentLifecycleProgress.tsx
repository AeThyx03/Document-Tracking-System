import React, { useState } from 'react';
import { DocumentItem } from '../types';
import {
  Inbox,
  Clock,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Send,
  FileCheck2,
  MapPin,
  User,
  MessageSquare,
  Sparkles,
  Check,
} from 'lucide-react';

interface DocumentLifecycleProgressProps {
  document: DocumentItem;
  variant?: 'compact' | 'detailed';
  showLabels?: boolean;
}

export function getLifecycleStage(document: DocumentItem) {
  const isCleared = !!document.managerClearance?.isCleared;
  const status = document.currentStatus;
  const hasPendingRemarks = document.supervisorRemarks?.some(
    (r) => r.complianceRequired && !r.complied
  );

  // Stage 3: Cleared / Dispatched (100%)
  if (isCleared || status === 'Cleared for Out' || status === 'Dispatched / Completed') {
    return {
      stageIndex: 3,
      stageKey: 'cleared' as const,
      stageTitle: isCleared && document.managerClearance?.clearanceType === 'archived_completed'
        ? 'Cleared (Archived)'
        : status === 'Dispatched / Completed'
        ? 'Dispatched'
        : 'Cleared for Out',
      progressPercent: 100,
      isPendingRemarks: false,
      isCleared: true,
      color: 'emerald',
    };
  }

  // Stage 2: Complied / Ready for Clearance (75%)
  if (status === 'Complied / Ready for Clearance') {
    return {
      stageIndex: 2,
      stageKey: 'complied' as const,
      stageTitle: 'Complied / Ready',
      progressPercent: 75,
      isPendingRemarks: false,
      isCleared: false,
      color: 'teal',
    };
  }

  // Stage 1: Under Review / Supervisor Action (50%)
  if (status === 'Under Review' || status === 'Supervisor Comment Needed' || hasPendingRemarks) {
    return {
      stageIndex: 1,
      stageKey: 'review' as const,
      stageTitle: hasPendingRemarks || status === 'Supervisor Comment Needed'
        ? 'Supervisor Action Needed'
        : 'Under Review',
      progressPercent: 50,
      isPendingRemarks: !!hasPendingRemarks,
      isCleared: false,
      color: hasPendingRemarks || status === 'Supervisor Comment Needed' ? 'amber' : 'blue',
    };
  }

  // Stage 0: Logged (25%)
  return {
    stageIndex: 0,
    stageKey: 'logged' as const,
    stageTitle: 'Incoming Logged',
    progressPercent: 25,
    isPendingRemarks: false,
    isCleared: false,
    color: 'indigo',
  };
}

const STAGES = [
  { id: 'logged', label: 'Logged', short: 'Log' },
  { id: 'review', label: 'Review', short: 'Rev' },
  { id: 'complied', label: 'Complied', short: 'Comp' },
  { id: 'cleared', label: 'Cleared', short: 'Clear' },
];

export const DocumentLifecycleProgress: React.FC<DocumentLifecycleProgressProps> = ({
  document,
  variant = 'compact',
  showLabels = true,
}) => {
  const stage = getLifecycleStage(document);
  const getStageTooltip = (s, isPassed, isCurrent) => {
    let text = `${s.label}: ${isPassed ? 'Completed' : isCurrent ? 'Current Stage' : 'Pending'}`;
    if (s.id === 'received' && document.dateReceived) {
       text += ` on ${document.dateReceived} ${document.timeReceived || ''}`;
    } else if (s.id === 'review' && document.movements?.length) {
       const lastMov = document.movements[document.movements.length - 1];
       text += `\nLast updated: ${new Date(lastMov.timestamp).toLocaleString()}\nLocation: ${lastMov.currentDesk}`;
    } else if (s.id === 'complied' && document.supervisorRemarks?.length) {
       const lastRemark = document.supervisorRemarks[document.supervisorRemarks.length - 1];
       text += `\nDirective: "${lastRemark.remarkText}"\nBy: ${lastRemark.supervisorName}`;
    } else if (s.id === 'cleared' && document.managerClearance?.isCleared) {
       text += `\nCleared on ${new Date(document.managerClearance.clearedAt).toLocaleString()}\nBy: ${document.managerClearance.clearedBy}`;
    }
    return text;
  };


  if (variant === 'detailed') {
    return (
      <div className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Document Lifecycle Journey
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                stage.color === 'emerald'
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : stage.color === 'teal'
                  ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800'
                  : stage.color === 'amber'
                  ? 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : stage.color === 'blue'
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                  : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
              }`}
            >
              {stage.stageTitle}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
            {stage.progressPercent}% Complete
          </span>
        </div>

        {/* Multi-step track */}
        <div className="relative">
          {/* Background Line */}
          <div className="absolute top-3.5 left-6 right-6 h-1 bg-slate-200 dark:bg-slate-700 -z-0" />

          {/* Active Fill Line */}
          <div
            className={`absolute top-3.5 left-6 h-1 transition-all duration-500 -z-0 ${
              stage.color === 'emerald'
                ? 'bg-emerald-500'
                : stage.color === 'teal'
                ? 'bg-teal-500'
                : stage.color === 'amber'
                ? 'bg-amber-500'
                : stage.color === 'blue'
                ? 'bg-blue-500'
                : 'bg-indigo-500'
            }`}
            style={{
              width: `calc(${stage.stageIndex / (STAGES.length - 1)} * (100% - 3rem))`,
            }}
          />

          <div className="grid grid-cols-4 gap-2 relative z-10">
            {STAGES.map((s, idx) => {
              const isPassed = idx < stage.stageIndex;
              const isCurrent = idx === stage.stageIndex;
              const isUpcoming = idx > stage.stageIndex;

              return (
                <div key={s.id} className="flex flex-col items-center text-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                      isPassed
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-200 dark:ring-emerald-900'
                        : isCurrent
                        ? stage.color === 'emerald'
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-200 dark:ring-emerald-900 animate-pulse'
                          : stage.color === 'amber'
                          ? 'bg-amber-500 text-white ring-4 ring-amber-200 dark:ring-amber-900 animate-pulse'
                          : stage.color === 'teal'
                          ? 'bg-teal-600 text-white ring-4 ring-teal-200 dark:ring-teal-900 animate-pulse'
                          : 'bg-blue-600 text-white ring-4 ring-blue-200 dark:ring-blue-900 animate-pulse'
                        : 'bg-white dark:bg-slate-800 text-slate-400 border-2 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isCurrent ? (
                      <span>{idx + 1}</span>
                    ) : (
                      <span className="text-[11px]">{idx + 1}</span>
                    )}
                  </div>

                  <span
                    className={`text-xs mt-1.5 font-semibold ${
                      isCurrent
                        ? 'text-slate-900 dark:text-white font-bold'
                        : isPassed
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  const lastMovement =
    document.movements && document.movements.length > 0
      ? document.movements[document.movements.length - 1]
      : null;

  const activeRemark =
    document.supervisorRemarks?.find((r) => r.complianceRequired && !r.complied) ||
    (document.supervisorRemarks && document.supervisorRemarks.length > 0
      ? document.supervisorRemarks[document.supervisorRemarks.length - 1]
      : null);

  const isCleared = !!document.managerClearance?.isCleared;

  // Compact variant for table rows
  return (
    <div
      className="relative flex flex-col gap-1.5 w-full min-w-[170px] max-w-[230px] group/lifecycle cursor-pointer"
      onMouseEnter={() => setIsTooltipOpen(true)}
      onMouseLeave={() => setIsTooltipOpen(false)}
    >
      {/* Top row: Status pill & Percent */}
      <div className="flex items-center justify-between gap-1.5 cursor-pointer">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10.5px] border whitespace-nowrap shadow-2xs transition-all duration-200 hover:scale-105 hover:shadow-md hover:ring-2 hover:ring-offset-1 dark:hover:ring-offset-slate-900 ${
            stage.color === 'emerald'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:ring-emerald-400/60 hover:border-emerald-400'
              : stage.color === 'teal'
              ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800 hover:ring-teal-400/60 hover:border-teal-400'
              : stage.color === 'amber'
              ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:ring-amber-400/60 hover:border-amber-400'
              : stage.color === 'blue'
              ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:ring-blue-400/60 hover:border-blue-400'
              : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:ring-indigo-400/60 hover:border-indigo-400'
          }`}
        >
          {stage.color === 'emerald' ? (
            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 transition-transform group-hover/lifecycle:scale-110" />
          ) : stage.color === 'teal' ? (
            <FileCheck2 className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0 transition-transform group-hover/lifecycle:scale-110" />
          ) : stage.color === 'amber' ? (
            <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 transition-transform group-hover/lifecycle:scale-110" />
          ) : stage.color === 'blue' ? (
            <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0 transition-transform group-hover/lifecycle:scale-110" />
          ) : (
            <Inbox className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0 transition-transform group-hover/lifecycle:scale-110" />
          )}
          <span className="truncate max-w-[125px]">{stage.stageTitle}</span>
        </span>

        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 group-hover/lifecycle:text-blue-400 shrink-0 transition-colors">
          {stage.progressPercent}%
        </span>
      </div>

      {/* Hover Information Tooltip Popup */}
      {isTooltipOpen && (
        <div className="absolute left-0 bottom-full mb-2.5 z-50 w-72 sm:w-80 p-3.5 rounded-xl bg-slate-950/95 border border-slate-700/90 shadow-2xl shadow-black/80 text-left pointer-events-none backdrop-blur-md animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150 ring-1 ring-blue-500/20">
          {/* Tooltip Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span className="text-xs font-bold text-white tracking-tight">
                {stage.stageTitle}
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-blue-400">
              {stage.progressPercent}% Complete
            </span>
          </div>

          {/* Timestamp Details */}
          <div className="space-y-2 text-[11px]">
            {/* Initial Log Timestamp */}
            <div className="flex items-start gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400">Logged Incoming:</span>{' '}
                <span className="font-semibold text-slate-200">
                  {document.dateReceived} at {document.timeReceived || '08:00:00'}
                </span>
              </div>
            </div>

            {/* Current Physical Station & Custodian */}
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400">Current Station:</span>{' '}
                <span className="font-semibold text-slate-200">
                  {document.currentLocation || document.targetDivision}
                </span>
                {document.currentCustodian && (
                  <div className="text-[10px] text-emerald-300 font-medium mt-0.5">
                    Custodian: {document.currentCustodian}
                  </div>
                )}
              </div>
            </div>

            {/* Latest Movement and User-Specific Notes */}
            {lastMovement ? (
              <div className="pt-1.5 border-t border-slate-800/80">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                  <Send className="w-3 h-3 text-sky-400" />
                  Latest Movement ({new Date(lastMovement.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </div>
                <div className="text-slate-300">
                  {lastMovement.personnelName}: {lastMovement.currentDesk} → {lastMovement.forwardToDesk}
                </div>
                {lastMovement.notes && (
                  <div className="mt-1 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10.5px] text-amber-200/90 italic flex items-start gap-1">
                    <MessageSquare className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                    <span>"{lastMovement.notes}"</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Supervisor Action / Specific Remarks */}
            {activeRemark && (
              <div className="pt-1.5 border-t border-slate-800/80">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  Supervisor Note ({activeRemark.supervisorName})
                </div>
                <div className="text-slate-200 text-[10.5px] line-clamp-2">
                  "{activeRemark.remarkText}"
                </div>
                {activeRemark.complied ? (
                  <div className="mt-1 text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Complied by {activeRemark.compliedBy || 'Staff'} {activeRemark.complianceNotes ? `("${activeRemark.complianceNotes}")` : ''}
                  </div>
                ) : (
                  <div className="mt-0.5 text-[10px] text-amber-300 font-medium">
                    Pending compliance action
                  </div>
                )}
              </div>
            )}

            {/* Manager Clearance Details */}
            {isCleared && document.managerClearance && (
              <div className="pt-1.5 border-t border-slate-800/80">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Clearance Granted
                </div>
                <div className="text-slate-300 text-[10.5px]">
                  Authorized by <span className="font-semibold text-white">{document.managerClearance.clearedBy || 'Division Manager'}</span>
                  {document.managerClearance.clearedAt && (
                    <span className="text-slate-400 text-[10px] block">
                      {new Date(document.managerClearance.clearedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                {document.managerClearance.clearanceRemarks && (
                  <div className="mt-0.5 text-[10px] text-slate-400 italic">
                    "{document.managerClearance.clearanceRemarks}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Tooltip Arrow */}
          <div className="absolute left-6 top-full w-2 h-2 bg-slate-950 border-r border-b border-slate-700/90 -translate-y-1 rotate-45" />
        </div>
      )}

      {/* Progress Track & Step Nodes */}
      <div className="relative w-full py-1 cursor-pointer">
        {/* Background track */}
        <div className="h-1.5 w-full bg-slate-200/90 dark:bg-slate-700/80 group-hover/lifecycle:bg-slate-300 dark:group-hover/lifecycle:bg-slate-600 rounded-full overflow-hidden transition-colors">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              stage.color === 'emerald'
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                : stage.color === 'teal'
                ? 'bg-teal-500 shadow-sm shadow-teal-500/50'
                : stage.color === 'amber'
                ? 'bg-amber-500 shadow-sm shadow-amber-500/50'
                : stage.color === 'blue'
                ? 'bg-blue-500 shadow-sm shadow-blue-500/50'
                : 'bg-indigo-500 shadow-sm shadow-indigo-500/50'
            }`}
            style={{ width: `${stage.progressPercent}%` }}
          />
        </div>

        {/* Micro Step Markers */}
        <div className="flex items-center justify-between -mt-1.5 px-0.5">
          {STAGES.map((s, idx) => {
            const isPassed = idx < stage.stageIndex;
            const isCurrent = idx === stage.stageIndex;

            return (
              <div
                key={s.id}
                title={getStageTooltip(s, isPassed, isCurrent)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-200 border cursor-pointer hover:scale-175 hover:z-20 hover:ring-2 hover:ring-offset-1 dark:hover:ring-offset-slate-900 ${
                  isPassed
                    ? 'bg-emerald-500 border-emerald-600 ring-1 ring-emerald-200 dark:ring-emerald-900 hover:ring-emerald-400'
                    : isCurrent
                    ? stage.color === 'emerald'
                      ? 'bg-emerald-500 border-white ring-2 ring-emerald-400'
                      : stage.color === 'amber'
                      ? 'bg-amber-500 border-white ring-2 ring-amber-400'
                      : stage.color === 'teal'
                      ? 'bg-teal-500 border-white ring-2 ring-teal-400'
                      : 'bg-blue-600 border-white ring-2 ring-blue-400'
                    : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:border-slate-400 hover:ring-slate-400'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Step Sequence Labels */}
      {showLabels && (
        <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 font-medium px-0.5">
          {STAGES.map((s, idx) => {
            const isCurrent = idx === stage.stageIndex;
            const isPassed = idx < stage.stageIndex;

            

            return (
              <span
                key={s.id}
                className={
                  isCurrent
                    ? 'text-slate-900 dark:text-white font-bold underline decoration-blue-500 underline-offset-2'
                    : isPassed
                    ? 'text-slate-600 dark:text-slate-300 font-medium'
                    : 'text-slate-400 dark:text-slate-500'
                }
              >
                {s.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
