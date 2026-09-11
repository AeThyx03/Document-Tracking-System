import React, { useState } from 'react';
import { Shield, Sparkles, LogIn } from 'lucide-react';
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

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn({ staySignedIn: true });
      if (result) {
        // initAuth handles the main state update, but we can also forcefully call onLoginSuccess if we can construct the user
        // Actually, we should just let initAuth handle it, but we can remove the loading state once complete
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[420px] overflow-hidden flex flex-col relative">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-500 z-10" />
        
        <div className="p-8 pt-10 flex flex-col items-center text-center space-y-4">
          <PossdLogo className="w-16 h-16 text-blue-600 dark:text-blue-500 mb-2" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Authenticate</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sign in with your Google account</p>
          </div>
          
          {errorMessage && (
            <div className="w-full mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-sm font-medium border border-rose-200 dark:border-rose-800 flex items-start gap-2">
              <Shield className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-left leading-tight">{errorMessage}</div>
            </div>
          )}

          {currentUser ? (
             <div className="w-full mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
               <div className="text-sm text-slate-600 dark:text-slate-300">Signed in as:</div>
               <div className="font-bold text-slate-900 dark:text-white text-lg">{currentUser.name}</div>
               <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 inline-block self-center border border-blue-100 dark:border-blue-800">{currentUser.role}</div>
               {onClose && (
                 <button onClick={onClose} className="mt-4 px-4 py-2 w-full rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-semibold text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Return to Dashboard</button>
               )}
             </div>
          ) : (
             <div className="w-full mt-6 space-y-4">
               <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full relative group overflow-hidden bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3.5 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
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
               <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500 justify-center pt-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Secure Multi-User Authorization</span>
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
