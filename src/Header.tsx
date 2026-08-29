import React from 'react';
import {
  Calendar,
  Database,
  FileText,
  Lock,
  LogOut,
  Moon,
  Search,
  Shield,
  Sun,
  Users,
} from 'lucide-react';
import { WarinEmblem } from './warinLogo';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isAdmin: boolean;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenSheetSettings: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  isSheetConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  isAdmin,
  onOpenLogin,
  onLogout,
  onOpenSheetSettings,
  isDark,
  toggleTheme,
  isSheetConnected,
}) => {
  return (
    <header className="bg-sky-900 text-white shadow-md sticky top-0 z-40 border-b border-sky-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('public-check')}>
            <WarinEmblem className="w-10 h-10 ring-2 ring-white/30" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-white">
                  ระบบจัดเวรยาม
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-sky-800 text-sky-200 border border-sky-700">
                  เทศบาลเมืองวารินชำราบ
                </span>
              </div>
              <p className="text-xs text-sky-200 font-normal hidden md:block">
                ตรวจสอบการปฏิบัติหน้าที่เวรยาม & บันทึก Google Sheets Real-time
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {/* Public Tab - Always accessible without login */}
            <button
              id="nav-public-check"
              onClick={() => setCurrentTab('public-check')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                currentTab === 'public-check'
                  ? 'bg-white text-sky-950 shadow-md ring-1 ring-sky-200'
                  : 'text-sky-100 hover:text-white hover:bg-sky-800/80'
              }`}
            >
              <Search className="w-4 h-4 text-sky-600" />
              <span>ตรวจเวรพนักงาน (ไม่ต้อง Login)</span>
            </button>

            {/* Admin Tabs - Visible when logged in */}
            {isAdmin && (
              <>
                <button
                  id="nav-admin-dashboard"
                  onClick={() => setCurrentTab('admin-dashboard')}
                  className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    currentTab === 'admin-dashboard'
                      ? 'bg-white text-sky-950 shadow-md'
                      : 'text-sky-100 hover:text-white hover:bg-sky-800'
                  }`}
                >
                  <span>แดชบอร์ด</span>
                </button>

                <button
                  id="nav-admin-personnel"
                  onClick={() => setCurrentTab('admin-personnel')}
                  className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    currentTab === 'admin-personnel'
                      ? 'bg-white text-sky-950 shadow-md'
                      : 'text-sky-100 hover:text-white hover:bg-sky-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>จัดการบุคลากร</span>
                </button>

                <button
                  id="nav-admin-users"
                  onClick={() => setCurrentTab('admin-users')}
                  className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    currentTab === 'admin-users'
                      ? 'bg-white text-sky-950 shadow-md'
                      : 'text-sky-100 hover:text-white hover:bg-sky-800'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>จัดการผู้ใช้</span>
                </button>

                <button
                  id="nav-admin-roster"
                  onClick={() => setCurrentTab('admin-roster')}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    currentTab === 'admin-roster'
                      ? 'bg-white text-sky-950 shadow-md'
                      : 'text-sky-100 hover:text-white hover:bg-sky-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>สร้างตารางเวร</span>
                </button>

                {/* Google Sheets Sync Status & Trigger - ONLY visible when logged in */}
                <button
                  id="btn-sheet-settings"
                  onClick={onOpenSheetSettings}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    isSheetConnected
                      ? 'border-sky-400 bg-sky-800 text-white hover:bg-sky-700'
                      : 'border-sky-700 bg-sky-950/60 text-sky-200 hover:bg-sky-800 hover:border-sky-500'
                  }`}
                  title="ตั้งค่าเชื่อมต่อ Google Sheets API"
                >
                  <Database className={`w-3.5 h-3.5 ${isSheetConnected ? 'text-sky-300' : 'text-sky-400'}`} />
                  <span className="hidden sm:inline">{isSheetConnected ? 'Sheet API เชื่อมต่อแล้ว' : 'ตั้งค่า Sheet API'}</span>
                </button>
              </>
            )}

            {/* Theme Toggle */}
            <button
              id="btn-theme-toggle"
              onClick={toggleTheme}
              className="p-2 text-sky-200 hover:text-white hover:bg-sky-800 rounded-xl transition-colors"
              title="สลับโหมดสี"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Officer / Admin Auth button */}
            {isAdmin ? (
              <div className="flex items-center gap-1.5 pl-2 border-l border-sky-800">
                <span className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-sky-800 text-sky-100 border border-sky-700">
                  <Shield className="w-3 h-3 text-sky-300" /> เจ้าหน้าที่ (Admin)
                </span>
                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-sm"
                  title="ออกจากระบบเจ้าหน้าที่"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">ออกจากระบบ</span>
                </button>
              </div>
            ) : (
              <button
                id="btn-officer-login"
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-white text-sky-950 hover:bg-sky-50 shadow-md transition-all"
              >
                <Lock className="w-3.5 h-3.5 text-sky-700" />
                <span>เข้าสู่ระบบเจ้าหน้าที่</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
