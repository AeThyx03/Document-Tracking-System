import React, { useState } from 'react';
import { SheetMetadata, createTrackingSheet, syncAllDocumentsToSheet } from '../lib/googleSheets';
import { DocumentItem, AppUserRole } from '../types';
import { FileSpreadsheet, ExternalLink, RefreshCw, CheckCircle2, AlertCircle, LogIn, LogOut, ShieldAlert, Users } from 'lucide-react';
import { googleSignIn, logoutGoogle } from '../lib/firebase';
import { User } from 'firebase/auth';
import { getStoredStaffMembers } from '../mockData';

interface GoogleSheetSyncProps {
  user: User | null;
  token: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  onSignOut: () => void;
  sheetConfig: SheetMetadata | null;
  onSaveSheetConfig: (config: SheetMetadata | null) => void;
  documents: DocumentItem[];
  staffList?: AppUserRole[];
  onNotify: (title: string, message: string, type: 'sync') => void;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncProps & { isOpen: boolean; onClose: () => void }> = ({
  user,
  token,
  onAuthSuccess,
  onSignOut,
  sheetConfig,
  onSaveSheetConfig,
  documents,
  staffList,
  onNotify,
  isOpen,
  onClose,
}) => {
  const effectiveStaffList = staffList || getStoredStaffMembers();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [customSheetId, setCustomSheetId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [confirmPrompt, setConfirmPrompt] = useState<{ open: boolean; action: () => Promise<void>; description: string } | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthSuccess(res.user, res.accessToken);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google authentication was cancelled or failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!token) {
      setErrorMessage('Please sign in with Google first.');
      return;
    }

    setConfirmPrompt({
      open: true,
      description: `Create a new Google Sheet named "POSSD Document Tracking & Personnel Registry" in your Google Drive, with "Master Tracking" and "Personnel Directory" tabs pre-formatted and synced with ${documents.length} document entries and ${effectiveStaffList.length} personnel profiles?`,
      action: async () => {
        setIsCreatingSheet(true);
        setErrorMessage(null);
        try {
          const newSheet = await createTrackingSheet(token);
          onSaveSheetConfig(newSheet);
          // Sync current documents and personnel immediately
          const res = await syncAllDocumentsToSheet(token, newSheet.spreadsheetId, documents, effectiveStaffList);
          setSyncStatus(`Created spreadsheet and synced ${res.rowsUpdated} document entries and ${res.personnelUpdated} personnel profiles successfully!`);
          onNotify(
            'Google Sheet Connected',
            `Created and linked registry with ${res.rowsUpdated} documents and ${res.personnelUpdated} personnel profiles.`,
            'sync'
          );
        } catch (err: any) {
          setErrorMessage(err.message || 'Failed to create Google Sheet. Please check permissions.');
        } finally {
          setIsCreatingSheet(false);
        }
      },
    });
  };

  const handleLinkExistingSheet = async () => {
    if (!token) {
      setErrorMessage('Please sign in with Google first.');
      return;
    }
    const cleanId = customSheetId.trim();
    if (!cleanId) {
      setErrorMessage('Please paste a valid Google Sheet ID or URL.');
      return;
    }

    // Extract ID if URL pasted
    let extractedId = cleanId;
    const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      extractedId = match[1];
    }

    setConfirmPrompt({
      open: true,
      description: `Connect Google Sheet ID "${extractedId}" and synchronize all ${documents.length} document tracking records plus ${effectiveStaffList.length} personnel roster entries into it?`,
      action: async () => {
        setIsSyncing(true);
        setErrorMessage(null);
        try {
          const config: SheetMetadata = {
            spreadsheetId: extractedId,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${extractedId}/edit`,
            sheetName: 'Master Tracking',
          };
          const res = await syncAllDocumentsToSheet(token, extractedId, documents, effectiveStaffList);
          onSaveSheetConfig(config);
          setSyncStatus(`Successfully connected & updated ${res.rowsUpdated} document entries and ${res.personnelUpdated} personnel records in Google Sheet.`);
          onNotify(
            'Google Sheet Synchronized',
            `Synchronized ${res.rowsUpdated} documents and ${res.personnelUpdated} personnel into spreadsheet (${extractedId}).`,
            'sync'
          );
        } catch (err: any) {
          setErrorMessage(err.message || 'Failed to connect sheet. Verify that your Google account has write access.');
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const handlePerformSync = async () => {
    if (!token || !sheetConfig) return;

    setConfirmPrompt({
      open: true,
      description: `Synchronize ${documents.length} document records and ${effectiveStaffList.length} personnel roster entries to your linked Google Sheet? This will update both "Master Tracking" and "Personnel Directory" tabs.`,
      action: async () => {
        setIsSyncing(true);
        setErrorMessage(null);
        try {
          const res = await syncAllDocumentsToSheet(token, sheetConfig.spreadsheetId, documents, effectiveStaffList);
          setSyncStatus(`Sync completed: ${res.rowsUpdated} document entries and ${res.personnelUpdated} personnel records refreshed at ${new Date().toLocaleTimeString()}.`);
          onNotify(
            'Google Sheet Updated',
            `All ${res.rowsUpdated} documents and ${res.personnelUpdated} personnel profiles synced to Google Sheet.`,
            'sync'
          );
        } catch (err: any) {
          setErrorMessage(err.message || 'Sync failed.');
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1b3d64] dark:border-slate-800 flex items-center justify-between bg-[#0c2340] dark:bg-[#071526] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Google Sheets Integration</h2>
              <p className="text-xs text-blue-200 dark:text-blue-300/80">
                Synchronize all incoming, outgoing, routing, compliance &amp; clearance records into a single Google Sheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 text-sm font-medium cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Auth State Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Google Account</span>
              {user ? (
                <div className="mt-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{user.displayName || 'Google User'}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{user.email}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Sign in to connect with Google Sheets and Google Drive
                </p>
              )}
            </div>

            {user && token ? (
              <button
                id="sign-out-google-btn"
                onClick={async () => {
                  await logoutGoogle();
                  onSignOut();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            ) : (
              <button
                id="sign-in-google-btn"
                onClick={handleGoogleLogin}
                disabled={isSigningIn}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                {isSigningIn ? 'Authenticating...' : 'Sign in with Google'}
              </button>
            )}
          </div>

          {/* Current Sheet Connection Status */}
          {sheetConfig ? (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/40 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Linked Google Sheet</h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono break-all">{sheetConfig.spreadsheetId}</p>
                  </div>
                </div>
                <a
                  href={sheetConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
                >
                  Open Sheet <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-800 dark:text-emerald-300">
                <span>Total records in queue: <strong>{documents.length}</strong></span>
                <button
                  id="sync-now-sheet-btn"
                  onClick={handlePerformSync}
                  disabled={isSyncing || !token}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Synchronizing...' : 'Sync Registry to Sheet'}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/40 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <p className="font-semibold">No Google Sheet currently connected.</p>
                  <p className="text-slate-600 dark:text-slate-400">You can automatically generate a formatted document tracking sheet in your Google Drive, or connect an existing Google Spreadsheet ID.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  id="create-new-sheet-btn"
                  onClick={handleCreateNewSheet}
                  disabled={isCreatingSheet || !token}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {isCreatingSheet ? 'Creating Sheet...' : 'Create New Tracking Sheet'}
                </button>

                <div className="flex gap-2">
                  <input
                    type="text"
                    id="existing-sheet-input"
                    value={customSheetId}
                    onChange={(e) => setCustomSheetId(e.target.value)}
                    placeholder="Paste Sheet ID or URL"
                    className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    id="link-sheet-btn"
                    onClick={handleLinkExistingSheet}
                    disabled={isSyncing || !token}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    Link
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feedback banners */}
          {syncStatus && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{syncStatus}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-medium text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Data fields note */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Incorporated Data Columns:</span>
            <p className="mt-1 leading-relaxed">
              Tracking Number, Document Title, Document Type, Originating Department, Date Received, Time Received (auto-recorded), Target Division, Responsible Person, Current Status, Current Desk/Room, Current Custodian, Full Internal Movements History, Supervisor Remarks &amp; Compliance, and Manager Clearance &amp; Outgoing Dispatch Details.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">Single consolidated Google Sheet integration</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Destructive/Mutating Workspace operations */}
      {confirmPrompt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Confirm Google Sheet Operation</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {confirmPrompt.description}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmPrompt(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const action = confirmPrompt.action;
                  setConfirmPrompt(null);
                  await action();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Proceed & Update Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
