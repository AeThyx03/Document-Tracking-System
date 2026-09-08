import React, { useState, useEffect } from 'react';
import { DocumentItem, TimeInDeskConfig } from '../types';
import { PossdLogo } from './PossdLogo';
import { PlusCircle, Clock, Hash, Building2, User, Send, FileText, AlertTriangle, Timer, Link2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { getDivisionThreshold, DEFAULT_TIME_IN_DESK_CONFIG } from '../lib/timeInDesk';

interface IncomingDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newDoc: DocumentItem) => void;
  currentUser: { name: string; role: string; division: string };
  availableDivisions?: string[];
  timeInDeskConfig?: TimeInDeskConfig;
}

const DOCUMENT_TYPES = [
  'Memorandum',
  'Endorsement',
  'Request / Voucher',
  'Official Letter',
  'Project Proposal',
  'Billing / Invoice',
  'Resolution / Order',
  'Others',
] as const;

const DIVISIONS = [
  'Executive Office of the Manager',
  'Administrative & General Services',
  'Finance & Budget Division',
  'Accounting Section',
  'Planning & Quality Assurance',
  'Operations & Emergency Management',
  'Information Technology Division',
  'Legal & Compliance Bureau',
  'Human Resource Management',
];

export const IncomingDocumentModal: React.FC<IncomingDocumentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUser,
  availableDivisions,
  timeInDeskConfig,
}) => {
  const divisionList = availableDivisions && availableDivisions.length > 0 ? availableDivisions : DIVISIONS;

  // Generate tracking number automatically based on timestamp
  const [trackingNumber, setTrackingNumber] = useState('');
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<DocumentItem['documentType']>('Memorandum');
  const [originDepartment, setOriginDepartment] = useState('');
  const [dateReceived, setDateReceived] = useState('');
  const [timeReceived, setTimeReceived] = useState('');
  const [targetDivision, setTargetDivision] = useState(divisionList[0] || 'Administration');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [priority, setPriority] = useState<DocumentItem['priority']>('Routine');
  const [initialDesk, setInitialDesk] = useState('Central Records & Receiving Desk');
  const [fileLink, setFileLink] = useState('');
  const [notes, setNotes] = useState('');

  // Clock tick to automatically show current date and time upon opening
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');

      setDateReceived(`${yyyy}-${mm}-${dd}`);
      setTimeReceived(`${hh}:${min}:${ss}`);

      // Auto tracking number: TRK-YYYY-RANDOM
      const rand = Math.floor(1000 + Math.random() * 9000);
      setTrackingNumber(`TRK-${yyyy}-${rand}`);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim() || !title.trim() || !originDepartment.trim() || !responsiblePerson.trim()) {
      return;
    }

    const nowIso = new Date().toISOString();
    const newDoc: DocumentItem = {
      id: trackingNumber.trim(),
      trackingNumber: trackingNumber.trim(),
      title: title.trim(),
      documentType,
      originDepartment: originDepartment.trim(),
      dateReceived,
      timeReceived,
      targetDivision,
      responsiblePerson: responsiblePerson.trim(),
      priority,
      currentStatus: 'Incoming Logged',
      currentLocation: initialDesk,
      currentCustodian: currentUser.name || 'Receiving Clerk',
      fileLink: fileLink.trim() || undefined,
      movements: [
        {
          id: `mov-${Date.now()}`,
          timestamp: nowIso,
          personnelName: currentUser.name || 'Receiving Clerk',
          personnelRole: currentUser.role,
          currentDesk: initialDesk,
          forwardToDesk: targetDivision,
          statusUpdate: 'received',
          notes: notes.trim() || 'Incoming document received and logged in official office registry.',
        },
      ],
      supervisorRemarks: [],
      managerClearance: {
        isCleared: false,
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    onSubmit(newDoc);
    onClose();
    // Reset form
    setTitle('');
    setOriginDepartment('');
    setResponsiblePerson('');
    setFileLink('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header - Navy & Gold/White Institutional Theme */}
        <div className="px-6 py-5 border-b border-[#1b3d64] dark:border-slate-800 flex items-center justify-between bg-[#0c2340] dark:bg-[#071526] text-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-amber-400/50">
              <PossdLogo className="w-8 h-8" variant="black" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Log Incoming Document</h2>
              <p className="text-xs text-blue-200 dark:text-blue-300/80">
                Register document tracking number, origin, target division, and automatic receipt timestamp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 text-sm font-medium transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto bg-white dark:bg-slate-900">
          
          {/* Tracking Number & Document Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Tracking Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="tracking-number-input"
                required
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. TRK-2026-0892"
                className="w-full font-mono text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Document Type <span className="text-rose-500">*</span>
              </label>
              <select
                id="doc-type-select"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as any)}
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title / Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Document Title / Subject Matter <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="doc-title-input"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. FY2027 Strategic Equipment Modernization Request"
              className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          {/* Originating Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Department It Came From (Sender / Office) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="doc-origin-input"
              required
              value={originDepartment}
              onChange={(e) => setOriginDepartment(e.target.value)}
              placeholder="e.g. Department of Budget & Management / Regional Planning Office"
              className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          {/* Auto-filled Date & Time Received */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/50 dark:bg-blue-950/40 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/60">
            <div>
              <label className="block text-xs font-semibold text-blue-950 dark:text-blue-200 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Date Received (Auto-Input)
              </label>
              <input
                type="date"
                id="date-received-input"
                required
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className="w-full text-sm rounded-lg border border-blue-200 dark:border-blue-800 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-950 dark:text-blue-200 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Time Received (Auto-Input)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="time-received-input"
                  required
                  value={timeReceived}
                  onChange={(e) => setTimeReceived(e.target.value)}
                  placeholder="HH:mm:ss"
                  className="flex-1 font-mono text-sm rounded-lg border border-blue-200 dark:border-blue-800 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    setTimeReceived(
                      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
                    );
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/60 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                >
                  Now
                </button>
              </div>
            </div>
          </div>

          {/* Division forwarded to next & Responsible Person */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Division to Forward to Next <span className="text-rose-500">*</span>
              </label>
              <select
                id="target-division-select"
                value={targetDivision}
                onChange={(e) => setTargetDivision(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              >
                {divisionList.map((div) => (
                  <option key={div} value={div} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    {div}
                  </option>
                ))}
              </select>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                <Timer className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Configured Division Threshold:{' '}
                  <strong className="text-slate-900 dark:text-white font-mono">
                    {getDivisionThreshold(targetDivision, timeInDeskConfig || DEFAULT_TIME_IN_DESK_CONFIG)} hrs
                  </strong>{' '}
                  stay allowance
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Person Responsible for Document <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="responsible-person-input"
                required
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                placeholder="e.g. Engr. Sarah Jenkins / Section Head"
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Priority & Current Desk */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Routing Priority Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Routine', 'Urgent', 'Rush'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      priority === p
                        ? p === 'Rush'
                          ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 border-rose-400 dark:border-rose-800 ring-2 ring-rose-200 dark:ring-rose-900 font-bold'
                          : p === 'Urgent'
                          ? 'bg-amber-100/70 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-amber-400 dark:border-amber-800 ring-2 ring-amber-300 dark:ring-amber-900 font-bold'
                          : 'bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800 ring-2 ring-blue-200 dark:ring-blue-900 font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Desk / Holding Location
              </label>
              <input
                type="text"
                id="initial-desk-input"
                value={initialDesk}
                onChange={(e) => setInitialDesk(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Attached File Link / Cloud Document URL */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Attached File / Cloud Document Link <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Google Drive, OneDrive, PDF or intranet link</span>
            </div>
            <div className="relative">
              <input
                type="url"
                id="file-link-input"
                value={fileLink}
                onChange={(e) => setFileLink(e.target.value)}
                placeholder="Paste link here (e.g., https://drive.google.com/file/d/... or https://...)"
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 pl-9 pr-24 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              {fileLink.trim() && (
                <a
                  href={fileLink.trim()}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute right-2 top-1.5 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-md flex items-center gap-1 transition-colors border border-blue-200 dark:border-blue-800"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            {fileLink.trim() ? (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                Cloud document linked. Will be accessible to officers and synced to Google Sheet.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Paste an external file link to allow personnel to view digital copies directly from the registry.
              </p>
            )}
          </div>

          {/* Initial Remarks / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Receiving Notes / Envelope Contents
            </label>
            <textarea
              id="receiving-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Contains 3 original copies, supporting receipts, and executive brief."
              className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-incoming-doc-btn"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Log & Forward Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
