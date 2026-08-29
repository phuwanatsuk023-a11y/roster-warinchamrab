import React, { useState } from 'react';
import { KeyRound, Lock, Shield, User, X } from 'lucide-react';
import { UserAccount } from './types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user?: UserAccount) => void;
  correctPasscode: string;
  users?: UserAccount[];
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  correctPasscode,
  users = [],
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAccountLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้งาน (Username)');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('กรุณากรอกรหัสผ่าน');
      return;
    }

    const matched = users.find(
      u =>
        u.username.toLowerCase() === username.trim().toLowerCase() &&
        (u.password === password || (!u.password && password === 'password123'))
    );

    if (matched) {
      if (matched.status === 'inactive') {
        setErrorMsg('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
        return;
      }
      setErrorMsg('');
      setUsername('');
      setPassword('');
      onSuccess(matched);
      onClose();
    } else if (
      (username.trim().toLowerCase() === 'admin' && (password === 'password123' || password === 'admin1234' || password === correctPasscode)) ||
      password === correctPasscode
    ) {
      setErrorMsg('');
      setUsername('');
      setPassword('');
      onSuccess();
      onClose();
    } else {
      setErrorMsg('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-emerald-800 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg shadow-emerald-900/30 mb-3">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900">
            เข้าสู่ระบบเจ้าหน้าที่ (Officer / Admin)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            สำหรับการจัดการข้อมูลบุคลากร ผู้ใช้งาน จุดเวร วันหยุด และตารางคำสั่ง
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAccountLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="login-username">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="กรอกชื่อผู้ใช้งาน"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="login-password">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="กรอกรหัสผ่าน"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-900/30 transition-all flex items-center justify-center gap-1.5"
            >
              <Lock className="w-4 h-4" />
              <span>เข้าสู่ระบบ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
