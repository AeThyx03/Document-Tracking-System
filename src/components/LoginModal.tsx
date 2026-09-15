import React, { useState } from 'react';
import { Shield, Sparkles, LogIn, UserCheck, ChevronRight } from 'lucide-react';
import { AppUserRole } from '../types';
import { PossdLogo } from './PossdLogo';
import { googleSignIn } from '../lib/firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  staffList?: AppUserRole[];
  currentUser: AppUserRole | null;
  onLoginSuccess: (user: AppUserRole) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  staffList = [],
  currentUser,
  onLoginSuccess,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn({ staySignedIn: true });
      if (result) {
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  const handleStaffSelect = (staff: AppUserRole) => {
    onLoginSuccess(staff);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[460px] overflow-hidden flex flex-col relative max-h-[90vh]">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-500 z-10" />

        <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4 overflow-y-auto">
          <PossdLogo className="w-16 h-16 text-blue-600 dark:text-blue-500 mb-1" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Authenticate</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Official POSSD Provincial Document Tracking Portal
            </p>
          </div>

          {errorMessage && (
            <div className="w-full p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs sm:text-sm font-medium border border-rose-200 dark:border-rose-800 flex items-start gap-2 text-left">
              <Shield className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-tight">{errorMessage}</div>
            </div>
          )}

          {currentUser ? (
            <div className="w-full mt-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">Authenticated Session:</div>
              <div className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">{currentUser.name}</div>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 inline-block self-center border border-blue-100 dark:border-blue-800">
                {currentUser.role} &bull; {currentUser.division}
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 px-4 py-2 w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  Return to Dashboard
                </button>
              )}
            </div>
          ) : (
            <div className="w-full space-y-4 pt-1">
              <button
                type="button"
                id="btn-google-sign-in"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full relative group overflow-hidden bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3.5 rounded-2xl font-semibold text-sm sm:text-[15px] flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-2xl" />
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>

              {staffList && staffList.length > 0 && (
                <div className="w-full pt-2 border-t border-slate-200 dark:border-slate-800 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Enrolled Personnel Roster ({staffList.length})
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Quick Select</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {staffList.map((staff) => (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => handleStaffSelect(staff)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-center justify-between text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
                            {staff.avatarInitials || (staff.name ? staff.name.slice(0, 2).toUpperCase() : 'ST')}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {staff.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {staff.role} &bull; {staff.division}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500 justify-center pt-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Secure Multi-User Role Based Access Control</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
