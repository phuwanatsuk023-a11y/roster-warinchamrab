import React, { useEffect, useState } from 'react';
import {
  CalendarOff,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  MapPin,
  Search,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react';
import { AdminDashboard } from './AdminDashboard';
import { AdminLoginModal } from './AdminLoginModal';
import { DutyPointsManagement } from './DutyPointsManagement';
import { GoogleSheetSettingsModal } from './GoogleSheetSettingsModal';
import { Header } from './Header';
import { HolidaysManagement } from './HolidaysManagement';
import { PersonnelManagement } from './PersonnelManagement';
import { PublicDutyCheck } from './PublicDutyCheck';
import { RosterGenerator } from './RosterGenerator';
import { UserManagement } from './UserManagement';
import { apiService } from './apiService';
import { DutyPoint, EmployeeDirectoryItem, Holiday, Personnel, Settings, UserAccount } from './types';

export default function App() {
  // Navigation & Auth state
  const [currentTab, setCurrentTab] = useState<string>('public-check');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isSheetSettingsOpen, setIsSheetSettingsOpen] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isSyncingUsers, setIsSyncingUsers] = useState<boolean>(false);
  const [isSyncingHolidays, setIsSyncingHolidays] = useState<boolean>(false);

  // App Data state
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [dutyPoints, setDutyPoints] = useState<DutyPoint[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [settings, setSettings] = useState<Settings>(apiService.getAppConfig());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initial Load
  useEffect(() => {
    const initData = async () => {
      const p = await apiService.getPersonnel();
      const dp = await apiService.getDutyPoints();
      const h = await apiService.getHolidays();
      const u = await apiService.getUsers();
      setPersonnel(p);
      setDutyPoints(dp);
      setHolidays(h);
      setUsers(u);

      const cfg = apiService.getAppConfig();
      setSettings(cfg);
      // หากใช้งานครั้งแรกยังไม่ได้บันทึก Web App URL ให้เด้ง modal ขึ้นมาทันที
      if (!cfg.appsScriptUrl || !cfg.appsScriptUrl.trim()) {
        setIsSheetSettingsOpen(true);
      }
    };
    initData();
  }, []);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Toggle Theme
  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // User Management Handlers
  const handleAddUser = async (user: Omit<UserAccount, 'id'>) => {
    const created = await apiService.addUser(user);
    const updated = await apiService.getUsers();
    setUsers(updated);
    showToast(`เพิ่มผู้ใช้งาน "${created.username}" เรียบร้อยแล้ว`);
  };

  const handleUpdateUser = async (user: UserAccount) => {
    await apiService.updateUser(user);
    const updated = await apiService.getUsers();
    setUsers(updated);
    showToast(`อัปเดตข้อมูลผู้ใช้งาน "${user.username}" เรียบร้อย`);
  };

  const handleDeleteUser = async (id: string) => {
    await apiService.deleteUser(id);
    const updated = await apiService.getUsers();
    setUsers(updated);
    showToast('ลบผู้ใช้งานเรียบร้อยแล้ว');
  };

  const handleSyncUsersPush = async () => {
    setIsSyncingUsers(true);
    try {
      await apiService.saveUsers(users);
      showToast('ซิงก์ข้อมูลผู้ใช้ทั้งหมดขึ้น Google Sheet สำเร็จแล้ว');
    } finally {
      setIsSyncingUsers(false);
    }
  };

  const handleSyncUsersPull = async () => {
    setIsSyncingUsers(true);
    try {
      const u = await apiService.getUsers();
      setUsers(u);
      showToast('ดึงข้อมูลผู้ใช้ล่าสุดจาก Google Sheet เรียบร้อยแล้ว');
    } finally {
      setIsSyncingUsers(false);
    }
  };

  // Personnel handlers
  const handleAddPersonnel = async (person: Omit<Personnel, 'db_id'>) => {
    const added = await apiService.addPersonnel(person);
    const updated = await apiService.getPersonnel();
    setPersonnel(updated);
    showToast(`เพิ่มบุคลากร "${added.fname} ${added.lname}" เรียบร้อยแล้ว`);
  };

  const handleUpdatePersonnel = async (person: Personnel) => {
    await apiService.updatePersonnel(person);
    const updated = await apiService.getPersonnel();
    setPersonnel(updated);
    showToast(`แก้ไขข้อมูล "${person.fname} ${person.lname}" เรียบร้อยแล้ว`);
  };

  const handleDeletePersonnel = async (db_id: number) => {
    await apiService.deletePersonnel(db_id);
    const updated = await apiService.getPersonnel();
    setPersonnel(updated);
    showToast('ลบบุคลากรเรียบร้อยแล้ว');
  };

  const handleReorderPersonnel = async (reordered: Personnel[]) => {
    setPersonnel(reordered);
    await apiService.savePersonnel(reordered);
    showToast('สลับตำแหน่งและบันทึกลำดับใหม่แล้ว');
  };

  const handleBatchImportPersonnel = async (imported: Personnel[], replace: boolean) => {
    let finalList: Personnel[];
    if (replace) {
      finalList = imported.map((p, idx) => ({ ...p, db_id: idx + 1, orderIndex: idx + 1 }));
    } else {
      const maxDbId = personnel.length > 0 ? Math.max(...personnel.map(p => p.db_id)) : 0;
      const maxOrder = personnel.length > 0 ? Math.max(...personnel.map(p => p.orderIndex || 0)) : 0;
      const formattedImported = imported.map((p, idx) => ({
        ...p,
        db_id: maxDbId + idx + 1,
        orderIndex: maxOrder + idx + 1,
      }));
      finalList = [...personnel, ...formattedImported];
    }
    setPersonnel(finalList);
    await apiService.savePersonnel(finalList);
    showToast(replace ? `แทนที่ข้อมูลบุคลากรสำเร็จ (${finalList.length} รายการ)` : `เพิ่มข้อมูลบุคลากรใหม่ ${imported.length} รายการ`);
  };

  const handleSearchEmployee = async (q: string): Promise<EmployeeDirectoryItem[]> => {
    return await apiService.searchEmployee(q);
  };

  // Duty points handlers
  const handleAddDutyPoint = async (name: string, gender: 'M' | 'F') => {
    const added = await apiService.addDutyPoint(name, gender);
    const updated = await apiService.getDutyPoints();
    setDutyPoints(updated);
    showToast(`เพิ่มจุดเวร "${added.name}" สำเร็จ`);
  };

  const handleDeleteDutyPoint = async (id: number) => {
    await apiService.deleteDutyPoint(id);
    const updated = await apiService.getDutyPoints();
    setDutyPoints(updated);
    showToast('ลบจุดเวรสำเร็จ');
  };

  // Holidays handlers
  const handleAddHoliday = async (date: string, name: string, type: 'official' | 'special') => {
    await apiService.addHoliday(date, name, type);
    const updated = await apiService.getHolidays();
    setHolidays(updated);
    showToast(`เพิ่มวันหยุด "${name}" สำเร็จ`);
  };

  const handleDeleteHoliday = async (id: number) => {
    await apiService.deleteHoliday(id);
    const updated = await apiService.getHolidays();
    setHolidays(updated);
    showToast('ลบวันหยุดสำเร็จ');
  };

  const handleSyncHolidaysPush = async () => {
    setIsSyncingHolidays(true);
    try {
      const res = await apiService.saveHolidays(holidays);
      showToast(res.message || `ซิงก์ข้อมูลวันหยุด ${holidays.length} รายการขึ้น Google Sheet สำเร็จแล้ว`);
    } catch (err: any) {
      showToast(`เกิดข้อผิดพลาด: ${err.message || err}`);
    } finally {
      setIsSyncingHolidays(false);
    }
  };

  const handleSyncHolidaysPull = async () => {
    setIsSyncingHolidays(true);
    try {
      const h = await apiService.getHolidays();
      setHolidays(h);
      showToast(`ดึงข้อมูลวันหยุดล่าสุด ${h.length} รายการจาก Google Sheet เรียบร้อยแล้ว`);
    } catch (err: any) {
      showToast(`เกิดข้อผิดพลาด: ${err.message || err}`);
    } finally {
      setIsSyncingHolidays(false);
    }
  };

  // Google Sheet Sync Handlers
  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    apiService.saveAppConfig(newSettings);
    showToast('บันทึกการตั้งค่า Google Sheets API สำเร็จ');
  };

  const handleTestConnection = async (url: string): Promise<boolean> => {
    try {
      const res = await fetch(`${url}?action=get_duty_points`);
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleSyncPushToSheet = async () => {
    await apiService.savePersonnel(personnel);
    await apiService.saveUsers(users);
    await apiService.saveHolidays(holidays);
    showToast('ส่งข้อมูลทั้งหมดขึ้น Google Sheet สำเร็จแล้ว');
  };

  const handleSyncPullFromSheet = async () => {
    const p = await apiService.getPersonnel();
    const dp = await apiService.getDutyPoints();
    const h = await apiService.getHolidays();
    const u = await apiService.getUsers();
    setPersonnel(p);
    setDutyPoints(dp);
    setHolidays(h);
    setUsers(u);
    showToast('ดึงข้อมูลล่าสุดจาก Google Sheet เรียบร้อยแล้ว');
  };

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors flex flex-col`}>
      {/* Global Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isAdmin={isAdmin}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={() => {
          setIsAdmin(false);
          setCurrentUser(null);
          setCurrentTab('public-check');
          showToast('ออกจากระบบเจ้าหน้าที่เรียบร้อยแล้ว');
        }}
        onOpenSheetSettings={() => setIsSheetSettingsOpen(true)}
        isDark={isDark}
        toggleTheme={toggleTheme}
        isSheetConnected={Boolean(settings.appsScriptUrl)}
      />

      {/* Officer Navigation Sub-bar when logged in */}
      {isAdmin && (
        <div className="bg-emerald-950 text-white px-4 py-2 border-b border-emerald-900 shadow-inner no-print">
          <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-emerald-200 font-bold px-2.5 py-1 bg-emerald-900/80 rounded-lg flex items-center gap-1 border border-emerald-700">
                <Shield className="w-3.5 h-3.5 text-emerald-300" />
                <span>เมนูเจ้าหน้าที่:</span>
              </span>

              <button
                onClick={() => setCurrentTab('admin-dashboard')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                  currentTab === 'admin-dashboard'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>แดชบอร์ด</span>
              </button>

              <button
                onClick={() => setCurrentTab('admin-personnel')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                  currentTab === 'admin-personnel'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>บุคลากร ({personnel.length})</span>
              </button>

              <button
                onClick={() => setCurrentTab('admin-users')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                  currentTab === 'admin-users'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>จัดการผู้ใช้ ({users.length})</span>
              </button>

              <button
                onClick={() => setCurrentTab('admin-duty-points')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                  currentTab === 'admin-duty-points'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>จุดประจำเวร ({dutyPoints.length})</span>
              </button>

              <button
                onClick={() => setCurrentTab('admin-holidays')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                  currentTab === 'admin-holidays'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-900'
                }`}
              >
                <CalendarOff className="w-3.5 h-3.5" />
                <span>วันหยุด ({holidays.length})</span>
              </button>

              <button
                onClick={() => setCurrentTab('admin-roster')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                  currentTab === 'admin-roster'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>สร้างตารางเวร & พิมพ์คำสั่ง</span>
              </button>
            </div>

            <button
              onClick={() => setCurrentTab('public-check')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 ${
                currentTab === 'public-check'
                  ? 'border-emerald-400 bg-emerald-800 text-white'
                  : 'border-emerald-800 text-emerald-200 hover:text-white hover:bg-emerald-900'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-emerald-400" />
              <span>ดูหน้าตรวจสอบเวรของพนักงาน</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* PUBLIC DUTY CHECK VIEW (No login needed) */}
        {currentTab === 'public-check' && (
          <PublicDutyCheck
            personnel={personnel}
            dutyPoints={dutyPoints}
            holidays={holidays}
            onOpenOfficerLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {/* OFFICER / ADMIN VIEWS (Protected or accessible via admin tabs) */}
        {currentTab === 'admin-dashboard' && (
          <AdminDashboard
            personnel={personnel}
            dutyPoints={dutyPoints}
            holidays={holidays}
            userCount={users.length}
            onNavigate={tab => setCurrentTab(tab)}
            onOpenAddPersonnel={() => setCurrentTab('admin-personnel')}
            onOpenAddHoliday={() => setCurrentTab('admin-holidays')}
          />
        )}

        {currentTab === 'admin-personnel' && (
          <PersonnelManagement
            personnel={personnel}
            dutyPoints={dutyPoints}
            onAddPersonnel={handleAddPersonnel}
            onUpdatePersonnel={handleUpdatePersonnel}
            onDeletePersonnel={handleDeletePersonnel}
            onSearchEmployeeDirectory={handleSearchEmployee}
            onReorderPersonnel={handleReorderPersonnel}
            onBatchImportPersonnel={handleBatchImportPersonnel}
            showToast={showToast}
          />
        )}

        {currentTab === 'admin-users' && (
          <UserManagement
            users={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onSyncWithSheet={handleSyncUsersPush}
            onFetchFromSheet={handleSyncUsersPull}
            isSyncing={isSyncingUsers}
            appsScriptUrl={settings.appsScriptUrl}
            onOpenSheetSettings={() => setIsSheetSettingsOpen(true)}
          />
        )}

        {currentTab === 'admin-duty-points' && (
          <DutyPointsManagement
            dutyPoints={dutyPoints}
            onAddDutyPoint={handleAddDutyPoint}
            onDeleteDutyPoint={handleDeleteDutyPoint}
          />
        )}

        {currentTab === 'admin-holidays' && (
          <HolidaysManagement
            holidays={holidays}
            onAddHoliday={handleAddHoliday}
            onDeleteHoliday={handleDeleteHoliday}
            onSyncWithSheet={handleSyncHolidaysPush}
            onFetchFromSheet={handleSyncHolidaysPull}
            isSyncing={isSyncingHolidays}
            appsScriptUrl={settings.appsScriptUrl}
            onOpenSheetSettings={() => setIsSheetSettingsOpen(true)}
            showToast={showToast}
          />
        )}

        {currentTab === 'admin-roster' && (
          <RosterGenerator
            personnel={personnel}
            dutyPoints={dutyPoints}
            holidays={holidays}
            appsScriptUrl={settings.appsScriptUrl}
            onOpenSheetSettings={() => setIsSheetSettingsOpen(true)}
            showToast={showToast}
          />
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade-in no-print">
          <div className="bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border border-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Officer Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={user => {
          setIsAdmin(true);
          setCurrentUser(user || null);
          setCurrentTab('admin-dashboard');
          showToast(`เข้าสู่ระบบเจ้าหน้าที่สำเร็จ ${user ? `(ยินดีต้อนรับ ${user.name})` : ''}`);
        }}
        correctPasscode={settings.adminPasscode}
        users={users}
      />

      {/* Google Sheets Settings Modal */}
      <GoogleSheetSettingsModal
        isOpen={isSheetSettingsOpen}
        onClose={() => setIsSheetSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onTestConnection={handleTestConnection}
        onSyncPushToSheet={handleSyncPushToSheet}
        onSyncPullFromSheet={handleSyncPullFromSheet}
      />
    </div>
  );
}

