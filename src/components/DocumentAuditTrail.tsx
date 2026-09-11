import React, { useState, useMemo } from 'react';
import { DocumentItem, InternalMovement, SupervisorRemark, AppUserRole } from '../types';
import {
  History,
  MapPin,
  ArrowRight,
  MessageSquare,
  CheckCircle,
  ShieldCheck,
  Inbox,
  Clock,
  Filter,
  ArrowUpDown,
  Copy,
  Check,
  Printer,
  Search,
  ExternalLink,
  User,
  FileText,
  AlertCircle,
} from 'lucide-react';

export interface AuditTrailEvent {
  id: string;
  type: 'inflow' | 'movement' | 'remark' | 'compliance' | 'clearance';
  timestamp: string;
  actorName: string;
  actorRole: string;
  actionTitle: string;
  stageLabel: string;
  fromDesk?: string;
  toDesk?: string;
  statusUpdate?: string;
  notes?: string;
  complianceRequired?: boolean;
  complied?: boolean;
  clearanceType?: string;
  exitTrackingNumber?: string;
  forwardedToExternal?: string;
}

interface DocumentAuditTrailProps {
  document: DocumentItem;
  currentUser?: AppUserRole;
  onNavigateToTab?: (tab: 'movements' | 'remarks' | 'clearance') => void;
}

export const DocumentAuditTrail: React.FC<DocumentAuditTrailProps> = ({
  document,
  currentUser,
  onNavigateToTab,
}) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<'all' | 'movement' | 'remark' | 'clearance'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Compile all lifecycle events into unified chronological list
  const allEvents = useMemo<AuditTrailEvent[]>(() => {
    const events: AuditTrailEvent[] = [];

    // 1. Initial Inflow / Receipt Event
    const inflowTime = document.createdAt || `${document.dateReceived}T${document.timeReceived}:00Z`;
    events.push({
      id: 'event-inflow',
      type: 'inflow',
      timestamp: inflowTime,
      actorName: document.responsiblePerson || 'Records Custodian',
      actorRole: 'Receiving Staff / Inflow Officer',
      actionTitle: 'Incoming Document Logged & Registered',
      stageLabel: 'Stage 1: Inflow',
      fromDesk: document.originDepartment,
      toDesk: document.currentLocation || document.targetDivision,
      statusUpdate: 'Incoming Logged',
      notes: `Document classified as "${document.documentType}" (${document.communicationType} • ${document.reportType}) with ${document.priority} Priority from origin "${document.originDepartment}". Designated target division: ${document.targetDivision}.`,
    });

    // 2. All Internal Desk Movements
    (document.movements || []).forEach((m, idx) => {
      events.push({
        id: m.id || `event-mov-${idx}`,
        type: 'movement',
        timestamp: m.timestamp,
        actorName: m.personnelName,
        actorRole: m.personnelRole || 'Handling Staff',
        actionTitle: `Transferred: ${m.currentDesk} ➔ ${m.forwardToDesk}`,
        stageLabel: 'Internal Routing',
        fromDesk: m.currentDesk,
        toDesk: m.forwardToDesk,
        statusUpdate: m.statusUpdate,
        notes: m.notes,
      });
    });

    // 3. Supervisor Directives and Compliances
    (document.supervisorRemarks || []).forEach((r, idx) => {
      // 3A. Directive Issuance
      events.push({
        id: `${r.id || idx}-directive`,
        type: 'remark',
        timestamp: r.timestamp,
        actorName: r.supervisorName,
        actorRole: 'Supervisor / Division Head',
        actionTitle: 'Supervisor Directive Issued',
        stageLabel: 'Supervisory Action',
        statusUpdate: r.complianceRequired ? 'Compliance Required' : 'Informational Remark',
        notes: r.remarkText,
        complianceRequired: r.complianceRequired,
        complied: r.complied,
      });

      // 3B. Directive Compliance Fulfilled
      if (r.complied) {
        events.push({
          id: `${r.id || idx}-complied`,
          type: 'compliance',
          timestamp: r.compliedAt || r.timestamp,
          actorName: r.compliedBy || 'Action Staff',
          actorRole: 'Staff / Action Officer',
          actionTitle: 'Supervisor Directive Complied & Verified',
          stageLabel: 'Compliance Fulfilled',
          statusUpdate: 'Directive Complied',
          notes: r.complianceNotes || 'Action fulfilled according to supervisor instructions.',
        });
      }
    });

    // 4. Manager Clearance / Outgoing Dispatch
    if (document.managerClearance?.isCleared) {
      const clearance = document.managerClearance;
      const clearanceLabel =
        clearance.clearanceType === 'approved_for_dispatch'
          ? 'Approved for Outgoing Dispatch'
          : clearance.clearanceType === 'archived_completed'
          ? 'Completed & Archived'
          : 'Returned for Revision';

      events.push({
        id: 'event-clearance',
        type: 'clearance',
        timestamp: clearance.clearedAt || document.updatedAt,
        actorName: clearance.clearedBy || 'Division Manager',
        actorRole: 'Department Manager / Authorizing Official',
        actionTitle: `Manager Clearance: ${clearanceLabel}`,
        stageLabel: 'Terminal Clearance',
        fromDesk: document.currentLocation,
        toDesk: clearance.forwardedToExternal || 'External Recipient',
        statusUpdate: 'Cleared for Out',
        clearanceType: clearance.clearanceType,
        exitTrackingNumber: clearance.exitTrackingNumber,
        forwardedToExternal: clearance.forwardedToExternal,
        notes: clearance.clearanceRemarks || 'Final clearance granted for outgoing transmittal.',
      });
    }

    // Sort chronologically
    return events.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [document, sortOrder]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      // Type filter
      if (filterType === 'movement' && ev.type !== 'movement' && ev.type !== 'inflow') return false;
      if (filterType === 'remark' && ev.type !== 'remark' && ev.type !== 'compliance') return false;
      if (filterType === 'clearance' && ev.type !== 'clearance') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesActor = ev.actorName.toLowerCase().includes(query);
        const matchesAction = ev.actionTitle.toLowerCase().includes(query);
        const matchesNotes = ev.notes?.toLowerCase().includes(query);
        const matchesDesks =
          ev.fromDesk?.toLowerCase().includes(query) || ev.toDesk?.toLowerCase().includes(query);
        const matchesRole = ev.actorRole.toLowerCase().includes(query);
        return matchesActor || matchesAction || matchesNotes || matchesDesks || matchesRole;
      }

      return true;
    });
  }, [allEvents, filterType, searchQuery]);

  // Format timestamp nicely
  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  // Relative time from receipt
  const getElapsedString = (eventTime: string) => {
    try {
      const baseTime = new Date(document.createdAt || `${document.dateReceived}T${document.timeReceived}:00Z`).getTime();
      const curTime = new Date(eventTime).getTime();
      const diffMs = curTime - baseTime;
      if (diffMs <= 60000) return 'Inflow Entry';
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      if (hours === 0) return `+${mins}m after inflow`;
      if (hours < 24) return `+${hours}h ${mins}m after inflow`;
      const days = Math.floor(hours / 24);
      return `+${days}d ${hours % 24}h after inflow`;
    } catch {
      return '';
    }
  };

  // Copy full audit trail to clipboard
  const handleCopyAuditTrail = () => {
    const lines = [
      `========================================================================`,
      `GOVERNMENT OF THE PHILIPPINES - POSSD DOCUMENT TRACKING AUDIT TRAIL`,
      `Tracking Number : ${document.trackingNumber}`,
      `Title           : ${document.title}`,
      `Document Type   : ${document.documentType} (${document.communicationType} • ${document.reportType})`,
      `Origin Dept     : ${document.originDepartment}`,
      `Date Received   : ${document.dateReceived} at ${document.timeReceived}`,
      `Current Status  : ${document.currentStatus}`,
      `Current Custody : ${document.currentCustodian} (${document.currentLocation})`,
      `Audit Generated : ${new Date().toLocaleString()}`,
      `========================================================================`,
      ``,
      `CHRONOLOGICAL AUDIT STEPS (${allEvents.length} Lifecycle Events Recorded):`,
      `------------------------------------------------------------------------`,
    ];

    allEvents.forEach((ev, i) => {
      lines.push(`Step ${i + 1} [${formatTimestamp(ev.timestamp)}] - ${ev.actionTitle}`);
      lines.push(`  Actor     : ${ev.actorName} (${ev.actorRole})`);
      if (ev.fromDesk || ev.toDesk) {
        lines.push(`  Routing   : ${ev.fromDesk || 'N/A'} ➔ ${ev.toDesk || 'N/A'}`);
      }
      if (ev.statusUpdate) {
        lines.push(`  Status    : ${ev.statusUpdate}`);
      }
      if (ev.notes) {
        lines.push(`  Remarks   : "${ev.notes}"`);
      }
      lines.push(`------------------------------------------------------------------------`);
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Print audit trail slip
  const handlePrintAuditTrail = () => {
    window.print();
  };

  const getEventBadge = (type: AuditTrailEvent['type']) => {
    switch (type) {
      case 'inflow':
        return {
          icon: Inbox,
          bg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-800',
          dot: 'bg-sky-500 ring-sky-200 dark:ring-sky-900',
          label: 'Inflow Entry',
        };
      case 'movement':
        return {
          icon: MapPin,
          bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800',
          dot: 'bg-blue-600 ring-blue-200 dark:ring-blue-900',
          label: 'Desk Movement',
        };
      case 'remark':
        return {
          icon: MessageSquare,
          bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          dot: 'bg-amber-500 ring-amber-200 dark:ring-amber-900',
          label: 'Supervisor Directive',
        };
      case 'compliance':
        return {
          icon: CheckCircle,
          bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300 dark:border-teal-800',
          dot: 'bg-teal-500 ring-teal-200 dark:ring-teal-900',
          label: 'Compliance Verified',
        };
      case 'clearance':
        return {
          icon: ShieldCheck,
          bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-600 ring-emerald-200 dark:ring-emerald-900',
          label: 'Manager Clearance',
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-blue-700 text-white shadow-2xs font-bold'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
            }`}
          >
            All Events ({allEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('movement')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              filterType === 'movement'
                ? 'bg-blue-700 text-white shadow-2xs font-bold'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
            }`}
          >
            Desk Movements ({(document.movements || []).length + 1})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('remark')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              filterType === 'remark'
                ? 'bg-amber-600 text-white shadow-2xs font-bold'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
            }`}
          >
            Supervisor Directives ({(document.supervisorRemarks || []).length})
          </button>
          {document.managerClearance?.isCleared && (
            <button
              type="button"
              onClick={() => setFilterType('clearance')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterType === 'clearance'
                  ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
              }`}
            >
              Clearance (1)
            </button>
          )}
        </div>

        {/* Right side controls: Search, Sort toggle, and Copy Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actors, desks, remarks..."
              className="pl-8 pr-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 sm:w-56"
            />
          </div>

          {/* Sort order toggle */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
            title={sortOrder === 'asc' ? 'Oldest first (Inflow ➔ Present)' : 'Newest first (Recent at top)'}
          >
            <ArrowUpDown className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>{sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}</span>
          </button>

          {/* Copy Audit Trail */}
          <button
            type="button"
            onClick={handleCopyAuditTrail}
            className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Copy formatted audit trail for transmittal slip or report"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Trail</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Audit Summary Ribbon */}
      <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white">
              Official POSSD Chronological Audit Trail
            </div>
            <div className="text-slate-600 dark:text-slate-400 text-[11px]">
              {allEvents.length} recorded lifecycle steps • Current Desk: <span className="font-semibold text-blue-900 dark:text-blue-300">{document.currentLocation}</span> • Custodian: <span className="font-semibold text-slate-900 dark:text-white">{document.currentCustodian}</span>
            </div>
          </div>
        </div>

        {onNavigateToTab && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onNavigateToTab('movements')}
              className="text-[11px] text-blue-700 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              + Log New Movement
            </button>
            <span className="text-slate-400">•</span>
            <button
              type="button"
              onClick={() => onNavigateToTab('remarks')}
              className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
            >
              + Add Directive
            </button>
          </div>
        )}
      </div>

      {/* The Chronological Timeline List */}
      <div className="relative pl-6 sm:pl-8 space-y-6 pt-2 pb-4">
        {/* Continuous Vertical Timeline Line */}
        <div className="absolute left-3.5 sm:left-4.5 top-5 bottom-5 w-0.5 bg-slate-200 dark:bg-slate-700" />

        {filteredEvents.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="font-medium">No lifecycle events match your filter criteria.</p>
            <button
              type="button"
              onClick={() => {
                setFilterType('all');
                setSearchQuery('');
              }}
              className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredEvents.map((ev, index) => {
            const badge = getEventBadge(ev.type);
            const StepIcon = badge.icon;
            const displayStepNum = sortOrder === 'asc' ? index + 1 : allEvents.length - index;

            return (
              <div key={ev.id} className="relative group">
                {/* Stepper Dot */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-3 w-5 h-5 sm:w-6 sm:h-6 rounded-full ${badge.dot} text-white flex items-center justify-center shadow-xs ring-4 z-10 transition-transform group-hover:scale-110`}
                >
                  <StepIcon className="w-3 h-3" />
                </div>

                {/* Event Card */}
                <div className="bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs hover:shadow-md transition-shadow duration-150 overflow-hidden">
                  {/* Step Card Header */}
                  <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-100 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        Step {displayStepNum}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                      {ev.statusUpdate && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600">
                          {ev.statusUpdate}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                      <div className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatTimestamp(ev.timestamp)}</span>
                      </div>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="font-medium text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded text-[10px]">
                        {getElapsedString(ev.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Step Card Body */}
                  <div className="p-4 space-y-3">
                    {/* Action Title & Personnel */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {ev.actionTitle}
                        </h4>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {ev.actorName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {ev.actorName}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            {ev.actorRole}
                          </span>
                        </div>
                      </div>

                      {/* Route Pill if Desk Movement */}
                      {(ev.fromDesk || ev.toDesk) && (
                        <div className="bg-slate-100 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1 flex items-center gap-2 text-xs">
                          <div className="text-slate-600 dark:text-slate-300 font-medium">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">From</span>
                            <span className="font-semibold text-slate-800 dark:text-white">{ev.fromDesk || 'Origin'}</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-2" />
                          <div className="text-slate-600 dark:text-slate-300 font-medium">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">To</span>
                            <span className="font-semibold text-blue-800 dark:text-blue-300">{ev.toDesk || 'Next Desk'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Associated Remarks Box */}
                    {ev.notes && (
                      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-lg p-3 border-l-3 border-blue-600 dark:border-blue-500 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Associated Remarks / Notes:
                        </div>
                        <p className="italic leading-relaxed whitespace-pre-line font-serif">
                          "{ev.notes}"
                        </p>
                      </div>
                    )}

                    {/* Clearance specifics */}
                    {ev.type === 'clearance' && ev.exitTrackingNumber && (
                      <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-2.5 text-xs text-emerald-900 dark:text-emerald-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Exit Tracking Code: <strong className="font-mono font-bold text-emerald-950 dark:text-emerald-100">{ev.exitTrackingNumber}</strong></span>
                        </div>
                        {ev.forwardedToExternal && (
                          <span>External Destination: <strong>{ev.forwardedToExternal}</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
