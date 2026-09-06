import React, { useState, useEffect } from 'react';
import { DocumentItem, TimeInDeskConfig } from '../types';
import { PlusCircle, Clock, Hash, Building2, User, Send, FileText, AlertTriangle, Timer } from 'lucide-react';
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
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-sky-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-700 text-white flex items-center justify-center shadow-xs">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Log Incoming Document</h2>
              <p className="text-xs text-slate-500">
                Register document tracking number, origin, target division, and automatic receipt timestamp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 text-sm font-medium"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Tracking Number & Document Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-500" />
                Tracking Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="tracking-number-input"
                required
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. TRK-2026-0892"
                className="w-full font-mono text-sm font-semibold rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Document Type <span className="text-rose-500">*</span>
              </label>
              <select
                id="doc-type-select"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as any)}
                className="w-full text-sm rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title / Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document Title / Subject Matter <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="doc-title-input"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. FY2027 Strategic Equipment Modernization Request"
              className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Originating Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              Department It Came From (Sender / Office) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="doc-origin-input"
              required
              value={originDepartment}
              onChange={(e) => setOriginDepartment(e.target.value)}
              placeholder="e.g. Department of Budget & Management / Regional Planning Office"
              className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Auto-filled Date & Time Received */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                Date Received (Auto-Input)
              </label>
              <input
                type="date"
                id="date-received-input"
                required
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
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
                  className="flex-1 font-mono text-sm rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    setTimeReceived(
                      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
                    );
                  }}
                  className="px-2 py-1 text-xs font-medium text-sky-700 bg-sky-100 rounded-lg hover:bg-sky-200"
                >
                  Now
                </button>
              </div>
            </div>
          </div>

          {/* Division forwarded to next & Responsible Person */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-slate-500" />
                Division to Forward to Next <span className="text-rose-500">*</span>
              </label>
              <select
                id="target-division-select"
                value={targetDivision}
                onChange={(e) => setTargetDivision(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {divisionList.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                <Timer className="w-3 h-3 text-indigo-600 shrink-0" />
                <span>
                  Configured Division Threshold:{' '}
                  <strong className="text-slate-800 font-mono">
                    {getDivisionThreshold(targetDivision, timeInDeskConfig || DEFAULT_TIME_IN_DESK_CONFIG)} hrs
                  </strong>{' '}
                  stay allowance
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Person Responsible for Document <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="responsible-person-input"
                required
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                placeholder="e.g. Engr. Sarah Jenkins / Section Head"
                className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Priority & Current Desk */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Routing Priority Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Routine', 'Urgent', 'Rush'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      priority === p
                        ? p === 'Rush'
                          ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-200'
                          : p === 'Urgent'
                          ? 'bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-200'
                          : 'bg-sky-50 text-sky-700 border-sky-300 ring-2 ring-sky-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Desk / Holding Location
              </label>
              <input
                type="text"
                id="initial-desk-input"
                value={initialDesk}
                onChange={(e) => setInitialDesk(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Initial Remarks / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Receiving Notes / Envelope Contents
            </label>
            <textarea
              id="receiving-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Contains 3 original copies, supporting receipts, and executive brief."
              className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-incoming-doc-btn"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
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
