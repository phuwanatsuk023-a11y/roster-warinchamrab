import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  FileText,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Upload,
  Users,
} from 'lucide-react';
import { AdminDashboard } from './AdminDashboard';
import { AdminLoginModal } from './AdminLoginModal';
import { apiService } from './apiService';
import { DutyPointsManagement } from './DutyPointsManagement';
import { GoogleSheetSettingsModal } from './GoogleSheetSettingsModal';
import { Header } from './Header';
import { HolidaysManagement } from './HolidaysManagement';
import {
  DEFAULT_SETTINGS,
  INITIAL_DUTY_POINTS,
  INITIAL_HOLIDAYS,
  INITIAL_PERSONNEL,
  INITIAL_USERS,
} from './mockData';
import { PersonnelImportExportModal } from './PersonnelImportExportModal';
import { PersonnelManagement } from './PersonnelManagement';
import { PublicDutyCheck } from './PublicDutyCheck';
import { RosterGenerator } from './RosterGenerator';
import { DutyPoint, Holiday, Personnel, SavedRosterScheduleRow, Settings, UserAccount } from './types';
import { UserManagement } from './UserManagement';

export default function App() {
  // Theme & Tab state
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [currentTab, setCurrentTab] = useState<string>('public-check');

  // Auth state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('is_admin') === 'true';
  });
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Core Data state
  const [personnel, setPersonnel] = useState<Personnel[]>(() => {
    return apiService.getLocalPersonnel();
  });
  const [dutyPoints, setDutyPoints] = useState<DutyPoint[]>(() => {
    return apiService.getLocalDutyPoints();
  });
  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    return apiService.getLocalHolidays();
  });
  const [users, setUsers] = useState<UserAccount[]>(() => {
    return apiService.getLocalUsers();
  });
  const [settings, setSettings] = useState<Settings>(() => {
    return apiService.getAppConfig();
  });

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSheetSettingsOpen, setIsSheetSettingsOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Sync and Status state
  const [isSheetConnected, setIsSheetConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isRosterSyncing, setIsRosterSyncing] = useState<boolean>(false);
  const [savedRosterCount, setSavedRosterCount] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Refresh local saved roster count
  const refreshSavedRosterCount = () => {
    const saved = apiService.getAllLocalSavedRosters();
    setSavedRosterCount(saved.length);
  };

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Check Sheet connection on load
  useEffect(() => {
    if (settings.appsScriptUrl) {
      apiService
        .testConnection(settings.appsScriptUrl)
        .then(connected => setIsSheetConnected(connected))
        .catch(() => setIsSheetConnected(false));
    }
    refreshSavedRosterCount();
  }, [settings.appsScriptUrl]);

  // Handle Theme Toggle
  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    if (nextTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Auth Handlers
  const handleLogin = (user: UserAccount) => {
    setIsAdmin(true);
    setCurrentUser(user);
    localStorage.setItem('is_admin', 'true');
    localStorage.setItem('current_user', JSON.stringify(user));
    setIsLoginModalOpen(false);
    showToast(`ยินดีต้อนรับคุณ ${user.name} (${user.role})`);
    if (currentTab === 'public-check') {
      setCurrentTab('admin-dashboard');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setCurrentUser(null);
    localStorage.removeItem('is_admin');
    localStorage.removeItem('current_user');
    setCurrentTab('public-check');
    showToast('ออกจากระบบเรียบร้อยแล้ว');
  };

  // Settings Save Handler
  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    apiService.saveAppConfig(newSettings);
    showToast('บันทึกการตั้งค่า Google Sheets เรียบร้อยแล้ว');
    if (newSettings.appsScriptUrl) {
      apiService.testConnection(newSettings.appsScriptUrl).then(setIsSheetConnected);
    }
  };

  // Data Updates Handlers
  const handleUpdatePersonnel = (updated: Personnel[]) => {
    setPersonnel(updated);
    apiService.savePersonnel(updated);
  };

  const handleUpdateDutyPoints = (updated: DutyPoint[]) => {
    setDutyPoints(updated);
    apiService.saveDutyPoints(updated);
  };

  const handleUpdateHolidays = (updated: Holiday[]) => {
    setHolidays(updated);
    apiService.saveHolidays(updated);
  };

  const handleUpdateUsers = (updated: UserAccount[]) => {
    setUsers(updated);
    apiService.saveUsers(updated);
  };

  // ----------------------------------------------------
  // ROSTER SCHEDULE SYNC HANDLERS (Google Sheets API)
  // ----------------------------------------------------

  /**
   * บันทึกตารางเวรเฉพาะชุดลง Google Sheets API
   */
  const handleSaveRosterScheduleToSheet = async (
    month: number,
    year: number,
    gender: 'M' | 'F' | 'ALL',
    items: SavedRosterScheduleRow[]
  ): Promise<{ count: number; message: string }> => {
    setIsRosterSyncing(true);
    try {
      const res = await apiService.saveRosterSchedule(month, year, gender, items);
      refreshSavedRosterCount();
      showToast(res.message || `บันทึกตารางเวร ${items.length} รายการลง Google Sheet สำเร็จ!`);
      return res;
    } catch (err: any) {
      const msg = err.message || 'บันทึกตารางเวรลง Google Sheet ไม่สำเร็จ';
      showToast(`ผิดพลาด: ${msg}`);
      throw err;
    } finally {
      setIsRosterSyncing(false);
    }
  };

  /**
   * ส่งข้อมูลตารางเวรทั้งหมดที่บันทึกไว้ในเครื่องไปยัง Google Sheets API
   */
  const handleSyncAllSavedRostersToSheet = async () => {
    setIsRosterSyncing(true);
    try {
      const res = await apiService.syncAllSavedRostersToSheet();
      refreshSavedRosterCount();
      showToast(res.message);
    } catch (err: any) {
      const msg = err.message || 'เกิดข้อผิดพลาดในการส่งข้อมูลตารางเวร';
      showToast(`ผิดพลาด: ${msg}`);
      throw err;
    } finally {
      setIsRosterSyncing(false);
    }
  };

  /**
   * ซิงก์ข้อมูลหลักและตารางเวรทั้งหมดขึ้น Google Sheets (Master Sync Push)
   */
  const handleSyncPushToSheet = async () => {
    setIsSyncing(true);
    try {
      // 1. ส่งข้อมูลบุคลากร
      await apiService.savePersonnel(personnel);
      // 2. ส่งข้อมูลผู้ใช้งาน
      await apiService.saveUsers(users);
      // 3. ส่งข้อมูลวันหยุด
      await apiService.saveHolidays(holidays);

      // 4. ส่งข้อมูลตารางเวรที่บันทึกไว้ทั้งหมด (ถ้ามี)
      const savedRosters = apiService.getAllLocalSavedRosters();
      if (savedRosters.length > 0) {
        await apiService.syncAllSavedRostersToSheet();
      }

      refreshSavedRosterCount();
      showToast('ส่งข้อมูลบุคลากร ผู้ใช้ วันหยุด และตารางเวรทั้งหมดขึ้น Google Sheet สำเร็จเรียบร้อย!');
    } catch (err: any) {
      console.error('Push error:', err);
      showToast(`เกิดข้อผิดพลาดในการส่งข้อมูล: ${err.message || err}`);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * ดึงข้อมูลล่าสุดทั้งหมดจาก Google Sheets (Master Sync Pull)
   */
  const handleSyncPullFromSheet = async () => {
    setIsSyncing(true);
    try {
      const remotePersonnel = await apiService.getPersonnel();
      setPersonnel(remotePersonnel);

      const remoteUsers = await apiService.getUsers();
      setUsers(remoteUsers);

      const remoteHolidays = await apiService.getHolidays();
      setHolidays(remoteHolidays);

      refreshSavedRosterCount();
      showToast('ดึงข้อมูลล่าสุดจาก Google Sheet สำเร็จเรียบร้อย!');
    } catch (err: any) {
      console.error('Pull error:', err);
      showToast(`เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message || err}`);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      {/* Toast Notification Bar */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 animate-bounce max-w-md bg-emerald-800 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-600 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main App Navigation Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isAdmin={isAdmin}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenSheetSettings={() => setIsSheetSettingsOpen(true)}
        isDark={isDark}
        toggleTheme={toggleTheme}
        isSheetConnected={isSheetConnected}
      />

      {/* Roster & Sync Quick Actions Bar for Admins */}
      {isAdmin && (
        <div className="bg-sky-950/90 border-b border-sky-800/80 text-sky-100 px-4 py-2 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-800 text-sky-200 font-bold text-[11px]">
                <Database className="w-3 h-3 text-sky-300" />
                <span>Google Sheets API: {isSheetConnected ? 'พร้อมใช้งาน (Connected)' : 'ออฟไลน์ (Local Mode)'}</span>
              </span>
              <span className="hidden md:inline text-sky-400">•</span>
              <span className="hidden md:inline text-sky-300">
                ตารางเวรที่บันทึกไว้ในระบบ: <strong className="text-white">{savedRosterCount}</strong> ชุด
              </span>
            </div>

            <div className="flex items-center gap-2">
              {savedRosterCount > 0 && (
                <button
                  id="btn-quick-sync-rosters"
                  onClick={handleSyncAllSavedRostersToSheet}
                  disabled={isRosterSyncing}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                  title="ส่งข้อมูลตารางเวรที่บันทึกไว้ทั้งหมดไปยัง Google Sheets API"
                >
                  {isRosterSyncing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  )}
                  <span>ส่งตารางเวร ({savedRosterCount} ชุด) ไป Google Sheet</span>
                </button>
              )}

              <button
                id="btn-quick-sync-all"
                onClick={handleSyncPushToSheet}
                disabled={isSyncing}
                className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                title="ซิงก์ข้อมูลหลักทั้งหมดขึ้น Google Sheet"
              >
                {isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>ซิงก์ข้อมูลทั้งหมด (Push All)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* PUBLIC CHECK TAB - Accessible to all without login */}
        {currentTab === 'public-check' && (
          <PublicDutyCheck
            personnel={personnel}
            dutyPoints={dutyPoints}
            holidays={holidays}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {/* ADMIN DASHBOARD */}
        {isAdmin && currentTab === 'admin-dashboard' && (
          <AdminDashboard
            personnel={personnel}
            dutyPoints={dutyPoints}
            holidays={holidays}
            userCount={users.length}
            onNavigate={setCurrentTab}
            onOpenAddPersonnel={() => setCurrentTab('admin-personnel')}
            onOpenAddHoliday={() => setCurrentTab('admin-holidays')}
          />
        )}

        {/* ADMIN PERSONNEL MANAGEMENT */}
        {isAdmin && currentTab === 'admin-personnel' && (
          <PersonnelManagement
            personnel={personnel}
            dutyPoints={dutyPoints}
            onUpdatePersonnel={handleUpdatePersonnel}
            onOpenImportExport={() => setIsImportModalOpen(true)}
            showToast={showToast}
          />
        )}

        {/* ADMIN USER MANAGEMENT */}
        {isAdmin && currentTab === 'admin-users' && (
          <UserManagement
            users={users}
            onUpdateUsers={handleUpdateUsers}
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {/* ADMIN DUTY POINTS MANAGEMENT */}
        {isAdmin && currentTab === 'admin-duty-points' && (
          <DutyPointsManagement
            dutyPoints={dutyPoints}
            personnel={personnel}
            onUpdateDutyPoints={handleUpdateDutyPoints}
            showToast={showToast}
          />
        )}

        {/* ADMIN HOLIDAYS MANAGEMENT */}
        {isAdmin && currentTab === 'admin-holidays' && (
          <HolidaysManagement
            holidays={holidays}
            onUpdateHolidays={handleUpdateHolidays}
            showToast={showToast}
          />
        )}

        {/* ADMIN ROSTER GENERATOR & PUBLISHER */}
        {isAdmin && currentTab === 'admin-roster' && (
          <RosterGenerator
            personnel={personnel}
            dutyPoints={dutyPoints}
            holidays={holidays}
            onUpdatePersonnel={handleUpdatePersonnel}
            onSaveRosterToSheet={handleSaveRosterScheduleToSheet}
            onRosterSaved={refreshSavedRosterCount}
            showToast={showToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-200 dark:bg-slate-950 border-t border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs py-4 px-4 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>
            ระบบจัดเวรยามสำนักงาน © 2026 เทศบาลเมืองวารินชำราบ • พัฒนาด้วย React & Google Sheets API (Apps Script)
          </span>
          <div className="flex items-center gap-3">
            <span>ตารางเวรในเครื่อง: {savedRosterCount} ชุด</span>
            <span>•</span>
            <button
              onClick={() => setIsSheetSettingsOpen(true)}
              className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
            >
              ตั้งค่า Google Sheet API
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
        users={users}
      />

      <GoogleSheetSettingsModal
        isOpen={isSheetSettingsOpen}
        onClose={() => setIsSheetSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onTestConnection={url => apiService.testConnection(url)}
        onSyncPushToSheet={handleSyncPushToSheet}
        onSyncPullFromSheet={handleSyncPullFromSheet}
        onSyncRostersPush={handleSyncAllSavedRostersToSheet}
        savedRosterCount={savedRosterCount}
      />

      <PersonnelImportExportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        personnel={personnel}
        onImportPersonnel={handleUpdatePersonnel}
        showToast={showToast}
      />
    </div>
  );
}
