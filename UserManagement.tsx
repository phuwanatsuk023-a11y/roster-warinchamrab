import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CloudDownload,
  CloudUpload,
  Code2,
  Copy,
  Database,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  HelpCircle,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { UserAccount } from './types';
import { APPS_SCRIPT_CODE_TEMPLATE } from './apiService';

interface UserManagementProps {
  users: UserAccount[];
  onAddUser: (user: Omit<UserAccount, 'id'>) => Promise<void>;
  onUpdateUser: (user: UserAccount) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onSyncWithSheet: () => Promise<void>;
  onFetchFromSheet: () => Promise<void>;
  isSyncing: boolean;
  appsScriptUrl?: string;
  onOpenSheetSettings?: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onSyncWithSheet,
  onFetchFromSheet,
  isSyncing,
  appsScriptUrl = '',
  onOpenSheetSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'superadmin' | 'admin' | 'officer'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [formData, setFormData] = useState<{
    username: string;
    password: string;
    name: string;
    role: 'superadmin' | 'admin' | 'officer';
    status: 'active' | 'inactive';
  }>({
    username: '',
    password: '',
    name: '',
    role: 'officer',
    status: 'active',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showNotice = (type: 'success' | 'error' | 'info', text: string) => {
    setActionNotice({ type, text });
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      u.username.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchQuery && matchRole && matchStatus;
  });

  // Summary Metrics
  const totalCount = users.length;
  const adminCount = users.filter(u => u.role === 'superadmin' || u.role === 'admin').length;
  const officerCount = users.filter(u => u.role === 'officer').length;
  const activeCount = users.filter(u => u.status === 'active').length;

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      name: '',
      role: 'officer',
      status: 'active',
    });
    setFormError('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: UserAccount) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      password: u.password || '',
      name: u.name,
      role: u.role,
      status: u.status,
    });
    setFormError('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = formData.username.trim();
    const trimmedName = formData.name.trim();

    if (!trimmedUsername) {
      setFormError('กรุณาระบุชื่อผู้ใช้งาน (Username)');
      return;
    }
    if (!trimmedName) {
      setFormError('กรุณาระบุชื่อ-นามสกุลของผู้ใช้งาน');
      return;
    }
    if (!editingUser && !formData.password.trim()) {
      setFormError('กรุณาระบุรหัสผ่านสำหรับการสร้างผู้ใช้ใหม่');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingUser) {
        await onUpdateUser({
          ...editingUser,
          username: trimmedUsername,
          name: trimmedName,
          role: formData.role,
          status: formData.status,
          password: formData.password ? formData.password.trim() : editingUser.password,
        });
        showNotice('success', `อัปเดตข้อมูลผู้ใช้ "${trimmedUsername}" และบันทึกลง Google Sheet สำเร็จ`);
      } else {
        await onAddUser({
          username: trimmedUsername,
          name: trimmedName,
          role: formData.role,
          status: formData.status,
          password: formData.password.trim(),
          lastLogin: '-',
        });
        showNotice('success', `เพิ่มผู้ใช้งานใหม่ "${trimmedUsername}" และบันทึกลง Google Sheet สำเร็จ`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'เกิดข้อผิดพลาดในการบันทึกลง Google Sheet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteUser(id);
      setDeleteConfirmId(null);
      showNotice('success', 'ลบผู้ใช้งานและอัปเดต Google Sheet เรียบร้อยแล้ว');
    } catch (err: any) {
      showNotice('error', err.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน');
    }
  };

  const handleToggleStatus = async (user: UserAccount) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await onUpdateUser({ ...user, status: nextStatus });
      showNotice('success', `เปลี่ยนสถานะ "${user.username}" เป็น ${nextStatus === 'active' ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'} สำเร็จ`);
    } catch (err: any) {
      showNotice('error', err.message || 'ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  const isConfigured = Boolean(appsScriptUrl && appsScriptUrl.trim().length > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Notice Alert */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-sm border transition-all ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : actionNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : actionNotice.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <span className="text-sm font-semibold">{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Google Sheet Connection Status Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        isConfigured 
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
          : 'bg-amber-50 border-amber-200 text-amber-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
            isConfigured ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
          }`}>
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
              <span>{isConfigured ? 'เชื่อมต่อ Google Sheets API พร้อมใช้งาน' : 'ยังไม่ได้เชื่อมต่อ Google Apps Script Web App URL'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                isConfigured ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
              }`}>
                {isConfigured ? 'Online' : 'Local Storage Only'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {isConfigured 
                ? 'ข้อมูลบัญชีผู้ใช้งานจะถูกบันทึกลงตาราง "users" บน Google Sheet แบบเรียลไทม์' 
                : 'หากต้องการให้ข้อมูลผู้ใช้บันทึกลง Google Sheet อย่างถาวร กรุณากดปุ่มตั้งค่าเพื่อใส่ Apps Script URL'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScriptModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            title="ดูโค้ด Apps Script และวิธีการติดตั้งตาราง users"
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>ดูโค้ด Apps Script</span>
          </button>

          {onOpenSheetSettings && (
            <button
              onClick={onOpenSheetSettings}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>ตั้งค่า Google Sheet</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 rounded-2xl shadow-lg border border-emerald-700/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>การจัดการสิทธิ์และผู้ใช้งานระบบ (User Accounts & Google Sheet)</span>
            </div>
            <h1 className="text-2xl font-black text-white">จัดการบัญชีผู้ใช้งานระบบ</h1>
            <p className="text-sm text-emerald-200 mt-1 max-w-2xl">
              กำหนดสิทธิ์เจ้าหน้าที่ (Super Admin, Admin, Officer) พร้อมระบบซิงก์ข้อมูลลง Google Sheet แบบเรียลไทม์
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={async () => {
                try {
                  await onSyncWithSheet();
                  showNotice('success', 'ซิงก์ข้อมูลผู้ใช้ทั้งหมดขึ้น Google Sheet สำเร็จเรียบร้อย');
                } catch (e: any) {
                  showNotice('error', e.message || 'ซิงก์ไม่สำเร็จ กรุณาตรวจสอบ Apps Script URL');
                }
              }}
              disabled={isSyncing}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 border border-emerald-500/50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              title="ส่งข้อมูลผู้ใช้ทั้งหมดขึ้น Google Sheet"
            >
              <CloudUpload className="w-4 h-4 text-emerald-200" />
              <span>{isSyncing ? 'กำลังซิงก์...' : 'ซิงก์ขึ้น Google Sheet'}</span>
            </button>

            <button
              onClick={async () => {
                try {
                  await onFetchFromSheet();
                  showNotice('success', 'ดึงข้อมูลผู้ใช้ล่าสุดจาก Google Sheet สำเร็จ');
                } catch (e: any) {
                  showNotice('error', e.message || 'ดึงข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ');
                }
              }}
              disabled={isSyncing}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
              title="ดึงข้อมูลล่าสุดจาก Google Sheet"
            >
              <CloudDownload className="w-4 h-4 text-emerald-200" />
              <span>ดึงจาก Google Sheet</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-black flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-900" />
              <span>เพิ่มผู้ใช้งานใหม่</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-blue-950">{totalCount}</div>
            <div className="text-xs font-medium text-slate-500">ผู้ใช้ทั้งหมด</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-indigo-950">{adminCount}</div>
            <div className="text-xs font-medium text-slate-500">ผู้ดูแลระบบ (Admin)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-sky-950">{officerCount}</div>
            <div className="text-xs font-medium text-slate-500">เจ้าหน้าที่ (Officer)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-950">{activeCount}</div>
            <div className="text-xs font-medium text-slate-500">เปิดใช้งานอยู่</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ, Username, หรือรหัส..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>สิทธิ์:</span>
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">ทั้งหมด ทุกสิทธิ์</option>
            <option value="superadmin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="officer">Officer</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold ml-2">
            <span>สถานะ:</span>
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">ทั้งหมด</option>
            <option value="active">เปิดใช้งาน (Active)</option>
            <option value="inactive">ระงับ (Inactive)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-blue-50/70 border-b border-slate-200 text-blue-950 font-bold">
              <tr>
                <th className="p-3.5 pl-5 w-20">ลำดับ</th>
                <th className="p-3.5">ชื่อผู้ใช้งาน (Username)</th>
                <th className="p-3.5">ชื่อ-นามสกุล</th>
                <th className="p-3.5">ระดับสิทธิ์ (Role)</th>
                <th className="p-3.5">สถานะ</th>
                <th className="p-3.5">วันที่สร้าง</th>
                <th className="p-3.5 text-right pr-5">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <UserX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    ไม่พบข้อมูลผู้ใช้งานที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-5 font-semibold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.username}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-medium text-slate-800">
                        {u.name}
                      </td>
                      <td className="p-3.5">
                        {u.role === 'superadmin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 font-bold text-[11px] border border-purple-200">
                            <ShieldAlert className="w-3 h-3 text-purple-600" /> Super Admin
                          </span>
                        ) : u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 font-bold text-[11px] border border-blue-200">
                            <Shield className="w-3 h-3 text-blue-600" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
                            <User className="w-3 h-3 text-slate-500" /> Officer
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                          }`}
                          title="คลิกเพื่อเปลี่ยนสถานะ"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          ></span>
                          <span>{u.status === 'active' ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}</span>
                        </button>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {u.createdAt || '-'}
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="แก้ไขข้อมูลผู้ใช้"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {deleteConfirmId === u.id ? (
                            <div className="inline-flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                              <span className="text-[10px] text-rose-700 font-bold px-1">ยืนยัน?</span>
                              <button
                                onClick={() => handleDelete(u.id)}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold"
                              >
                                ลบ
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(u.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="ลบผู้ใช้งาน"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                {editingUser ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingUser ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
                </h2>
                <p className="text-xs text-slate-500">
                  ข้อมูลจะถูกบันทึกลงระบบและซิงก์เข้า Google Sheet ตาราง "users" โดยอัตโนมัติ
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold">เกิดข้อผิดพลาดในการบันทึก</div>
                  <div>{formError}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อผู้ใช้งาน (Username) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  placeholder="เช่น admin, officer_somchai"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น นายสมชาย ใจดี"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editingUser ? 'รหัสผ่านใหม่ (เว้นว่างหากไม่ต้องการเปลี่ยน)' : 'รหัสผ่าน (Password) *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? 'กรอกรหัสผ่านใหม่...' : 'กำหนดรหัสผ่าน...'}
                    className="w-full px-3.5 py-2 pr-10 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ระดับสิทธิ์ (Role)
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-900"
                  >
                    <option value="officer">Officer (เจ้าหน้าที่)</option>
                    <option value="admin">Admin (ผู้ดูแล)</option>
                    <option value="superadmin">Super Admin (สูงสุด)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    สถานะการใช้งาน
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-900"
                  >
                    <option value="active">เปิดใช้งาน (Active)</option>
                    <option value="inactive">ระงับ (Inactive)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-800/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'กำลังบันทึกลง Sheet...' : editingUser ? 'บันทึกการแก้ไข' : 'ยืนยันเพิ่มผู้ใช้'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Script Code Modal */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    โค้ด Google Apps Script (Code.gs)
                  </h2>
                  <p className="text-xs text-slate-500">
                    คัดลอกโค้ดนี้ไปวางใน Apps Script ของ Google Sheet เพื่อให้รองรับตาราง "users"
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsScriptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1 space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  <span>วิธีอัปเดตโค้ดใน Google Sheet:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-emerald-900">
                  <li>เปิดไฟล์ Google Sheet ของคุณ ไปที่เมนู <strong>ส่วนขยาย (Extensions) &gt; Apps Script</strong></li>
                  <li>ลบโค้ดเดิมทั้งหมดในไฟล์ <strong>Code.gs</strong> แล้ววางโค้ดด้านล่างนี้แทนที่</li>
                  <li>กดปุ่ม <strong>บันทึก (Save)</strong> แล้วกด <strong>ทำให้ใช้งานได้ (Deploy) &gt; การปรับใช้ใหม่ (New deployment)</strong></li>
                  <li>เลือกประเภท <strong>เว็บแอป (Web app)</strong> และตั้งค่า <strong>ผู้มีสิทธิ์เข้าถึง (Who has access)</strong> เป็น <strong>ทุกคน (Anyone)</strong></li>
                </ol>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between bg-slate-800 text-slate-200 px-4 py-2 rounded-t-xl text-xs">
                  <span className="font-mono">Code.gs (Apps Script API)</span>
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-bold transition-all"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'คัดลอกเรียบร้อย!' : 'คัดลอกโค้ดทั้งหมด'}</span>
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-b-xl overflow-x-auto max-h-64 select-all leading-relaxed">
                  {APPS_SCRIPT_CODE_TEMPLATE}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsScriptModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

