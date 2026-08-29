import React, { useEffect, useState } from 'react';
import { KeyRound, Lock, Shield, User, X, Check, AlertCircle, Loader2, Database, RefreshCw } from 'lucide-react';
import { UserAccount } from './types';
import { WarinEmblem } from './warinLogo';
import { apiService } from './apiService';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: (user: UserAccount) => void;
  onSuccess?: (user?: UserAccount) => void;
  users?: UserAccount[];
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onSuccess,
  users = [],
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [sheetUsers, setSheetUsers] = useState<UserAccount[]>(users);
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch users directly from Google Sheet 'users' sheet whenever modal opens
  const loadUsersFromGoogleSheet = async () => {
    setIsLoadingSheet(true);
    setErrorMsg('');
    try {
      const fetched = await apiService.getUsers();
      if (Array.isArray(fetched) && fetched.length > 0) {
        setSheetUsers(fetched);
      }
    } catch (err: any) {
      console.warn('Failed to fetch users from Google Sheet:', err);
      // Keep existing users state
    } finally {
      setIsLoadingSheet(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsersFromGoogleSheet();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccountLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้งาน (Username)');
      return;
    }
    if (!cleanPassword) {
      setErrorMsg('กรุณากรอกรหัสผ่าน (Password)');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    try {
      // Direct live verification from Google Sheet
      let currentUsersList = sheetUsers;
      try {
        const liveUsers = await apiService.getUsers();
        if (Array.isArray(liveUsers) && liveUsers.length > 0) {
          currentUsersList = liveUsers;
          setSheetUsers(liveUsers);
        }
      } catch (e) {
        // use loaded sheetUsers
      }

      // Check ONLY in users from Google Sheet
      const matched = currentUsersList.find(
        u =>
          (u.username && u.username.trim().toLowerCase() === cleanUsername.toLowerCase()) ||
          (u.name && u.name.trim().toLowerCase() === cleanUsername.toLowerCase())
      );

      if (!matched) {
        setErrorMsg('ไม่พบบัญชีผู้ใช้นี้ในระบบ Google Sheet (กรุณาตรวจสอบชื่อผู้ใช้)');
        setIsVerifying(false);
        return;
      }

      if (matched.status === 'inactive') {
        setErrorMsg('บัญชีนี้ถูกระงับการใช้งานใน Google Sheet กรุณาติดต่อผู้ดูแลระบบ');
        setIsVerifying(false);
        return;
      }

      // STRICT password verification from Google Sheet
      const sheetPassword = matched.password ? matched.password.trim() : '';
      if (sheetPassword && sheetPassword !== cleanPassword) {
        setErrorMsg('รหัสผ่านไม่ถูกต้องตามที่บันทึกไว้ใน Google Sheet');
        setIsVerifying(false);
        return;
      }

      if (!sheetPassword && cleanPassword !== 'password123') {
        setErrorMsg('รหัสผ่านเริ่มต้นไม่ถูกต้อง');
        setIsVerifying(false);
        return;
      }

      // SUCCESS LOGIN
      setErrorMsg('');
      setUsername('');
      setPassword('');
      if (onLogin) onLogin(matched);
      if (onSuccess) onSuccess(matched);
      onClose();
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์กับ Google Sheet: ' + (err.message || err));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-sky-100 dark:border-slate-800 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="ปิดหน้าต่าง"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 shadow-inner border border-sky-100 dark:border-slate-700">
            <WarinEmblem className="w-12 h-12" />
          </div>
          <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wide bg-sky-50 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-200/60 inline-block mb-1">
            เทศบาลเมืองวารินชำราบ
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            เข้าสู่ระบบเจ้าหน้าที่ (Officer / Admin)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-1">
            <Database className="w-3.5 h-3.5 text-sky-600" />
            <span>ยืนยันตัวตนผ่านฐานข้อมูล Google Sheet (แผ่นงาน users)</span>
          </p>
        </div>

        {/* Google Sheet Sync Status Bar */}
        <div className="mb-4 px-3 py-2 bg-sky-50/80 dark:bg-slate-800/80 rounded-2xl border border-sky-100 dark:border-slate-700 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-sky-900 dark:text-sky-200 font-medium">
            {isLoadingSheet ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin" />
                <span>กำลังดึงบัญชีผู้ใช้จาก Google Sheet...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                <span>
                  เชื่อมต่อ Google Sheet แล้ว ({sheetUsers.length} บัญชี)
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={loadUsersFromGoogleSheet}
            disabled={isLoadingSheet}
            className="text-sky-700 dark:text-sky-400 hover:text-sky-900 p-1 rounded-lg hover:bg-sky-100 dark:hover:bg-slate-700 transition-colors"
            title="รีเฟรชข้อมูลผู้ใช้จาก Google Sheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSheet ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-2xl font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAccountLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" htmlFor="login-username">
              ชื่อผู้ใช้งานใน Google Sheet (Username)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="กรอกชื่อผู้ใช้ที่ระบุในชีต users"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sky-200 dark:border-slate-700 bg-sky-50/40 dark:bg-slate-800 focus:bg-white text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium transition-all"
                autoFocus
                disabled={isVerifying}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" htmlFor="login-password">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="กรอกรหัสผ่านที่ระบุในชีต users"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sky-200 dark:border-slate-700 bg-sky-50/40 dark:bg-slate-800 focus:bg-white text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium transition-all"
                disabled={isVerifying}
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="flex-1 px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-md shadow-sky-900/20 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-70"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังตรวจสอบกับชีต...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>เข้าสู่ระบบ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
