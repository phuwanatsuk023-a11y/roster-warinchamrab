import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Database,
  Download,
  ExternalLink,
  HelpCircle,
  Key,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { APPS_SCRIPT_CODE_TEMPLATE } from './apiService';
import { Settings } from './types';

interface GoogleSheetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSaveSettings: (newSettings: Settings) => void;
  onTestConnection: (url: string) => Promise<boolean>;
  onSyncPushToSheet: () => Promise<void>;
  onSyncPullFromSheet: () => Promise<void>;
}

export const GoogleSheetSettingsModal: React.FC<GoogleSheetSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onTestConnection,
  onSyncPushToSheet,
  onSyncPullFromSheet,
}) => {
  const [appsScriptUrl, setAppsScriptUrl] = useState(settings.appsScriptUrl || '');
  const [adminPasscode, setAdminPasscode] = useState(settings.adminPasscode || 'admin1234');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'failed'>('idle');
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'url-config' | 'code-script' | 'instructions'>('url-config');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleTest = async () => {
    if (!appsScriptUrl.trim()) return;
    setIsTesting(true);
    setTestResult('idle');
    try {
      const ok = await onTestConnection(appsScriptUrl.trim());
      setTestResult(ok ? 'success' : 'failed');
    } catch {
      setTestResult('failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      appsScriptUrl: appsScriptUrl.trim(),
      adminPasscode: adminPasscode.trim() || 'admin1234',
    });
    onClose();
  };

  const handlePush = async () => {
    setIsSyncing(true);
    setSyncStatus('กำลังส่งข้อมูลขึ้น Google Sheet...');
    try {
      await onSyncPushToSheet();
      setSyncStatus('ส่งข้อมูลขึ้น Google Sheet สำเร็จเรียบร้อย!');
    } catch (e: any) {
      setSyncStatus(`เกิดข้อผิดพลาด: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePull = async () => {
    setIsSyncing(true);
    setSyncStatus('กำลังดึงข้อมูลจาก Google Sheet...');
    try {
      await onSyncPullFromSheet();
      setSyncStatus('ดึงข้อมูลจาก Google Sheet สำเร็จเรียบร้อย!');
    } catch (e: any) {
      setSyncStatus(`เกิดข้อผิดพลาด: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 dark:border-slate-700 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                ตั้งค่าเชื่อมต่อ Google Sheets API (Apps Script)
              </h2>
              <p className="text-xs text-slate-500">
                จัดการฐานข้อมูล Google Sheets ผ่าน Apps Script Web App Real-time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 mt-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('url-config')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'url-config'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Web App URL & ความปลอดภัย
          </button>
          <button
            onClick={() => setActiveTab('code-script')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'code-script'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            โค้ด Google Apps Script (Code.gs)
          </button>
          <button
            onClick={() => setActiveTab('instructions')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'instructions'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            ขั้นตอนการติดตั้ง (Step-by-Step)
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="py-4 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm">
          {activeTab === 'url-config' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Google Apps Script Web App URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={appsScriptUrl}
                    onChange={e => {
                      setAppsScriptUrl(e.target.value);
                      setTestResult('idle');
                    }}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={isTesting || !appsScriptUrl.trim()}
                    className="px-3 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isTesting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>ทดสอบ</span>
                  </button>
                </div>

                {testResult === 'success' && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> เชื่อมต่อกับ Google Apps Script สำเร็จ! ข้อมูลพร้อมซิงค์
                  </p>
                )}

                {testResult === 'failed' && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1 font-semibold">
                    <X className="w-4 h-4" /> ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบว่าตั้งค่า Web App เป็น Anyone (ทุกคน) หรือยัง
                  </p>
                )}
              </div>

              {/* Data Synchronizer Buttons */}
              {appsScriptUrl.trim() && (
                <div className="bg-slate-50 dark:bg-slate-700/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-600 space-y-2">
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-200 block">
                    ตัวจัดการข้อมูล (Sync Actions):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handlePush}
                      disabled={isSyncing}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>ส่งข้อมูลทั้งหมดไปบันทึกบน Google Sheet</span>
                    </button>
                    <button
                      onClick={handlePull}
                      disabled={isSyncing}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ดึงข้อมูลล่าสุดจาก Google Sheet มาใช้งาน</span>
                    </button>
                  </div>
                  {syncStatus && (
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">
                      {syncStatus}
                    </p>
                  )}
                </div>
              )}

              {/* Security: Admin Passcode Config */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> เปลี่ยนรหัสผ่านเจ้าหน้าที่ (Admin Passcode)
                </label>
                <input
                  type="text"
                  value={adminPasscode}
                  onChange={e => setAdminPasscode(e.target.value)}
                  placeholder="admin1234"
                  className="w-full sm:w-64 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'code-script' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  คัดลอกโค้ดนี้ไปวางใน Google Apps Script (Code.gs)
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ดทั้งหมด'}</span>
                </button>
              </div>

              <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] max-h-72 overflow-y-auto leading-relaxed border border-slate-800 shadow-inner select-all">
                <pre>{APPS_SCRIPT_CODE_TEMPLATE}</pre>
              </div>
            </div>
          )}

          {activeTab === 'instructions' && (
            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <p className="font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                  📌 วิธีตั้งค่า Google Sheet ให้ทำงานแบบ Real-time:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-emerald-950 dark:text-emerald-200">
                  <li>เปิด Google Spreadsheet ของท่าน (สร้างชีตใหม่ว่างๆ ได้เลย)</li>
                  <li>ไปที่เมนู <strong>Extensions (ส่วนขยาย)</strong> &gt; <strong>Apps Script</strong></li>
                  <li>ลบโค้ดเดิม แล้ววางโค้ดจากแท็บ <strong>"โค้ด Google Apps Script"</strong> ลงไป</li>
                  <li>กดปุ่ม <strong>Save (บันทึก)</strong> 💾</li>
                  <li>
                    กดปุ่มสีเขียว/น้ำเงินมุมขวาบน <strong>Deploy (ทำให้ใช้งานได้)</strong> &gt; <strong>New deployment (การทำให้ใช้งานได้ใหม่)</strong>
                  </li>
                  <li>เลือกประเภทฟันเฟือง ⚙️ เป็น <strong>Web app</strong></li>
                  <li>ตั้งค่า <strong>Execute as (ดำเนินการในฐานะ)</strong>: <code className="bg-white/60 px-1 py-0.5 rounded">Me (ฉัน)</code></li>
                  <li>ตั้งค่า <strong>Who has access (ใครที่มีสิทธิ์เข้าถึง)</strong>: <code className="bg-white/60 px-1 py-0.5 rounded font-bold text-rose-600">Anyone (ทุกคน)</code></li>
                  <li>กดปุ่ม <strong>Deploy</strong> แล้วคัดลอก <strong>Web app URL</strong> มาวางในระบบนี้</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
          <span className="text-[11px] text-slate-400">
            *ระบบจะบันทึกข้อมูลสำรองใน Local Storage อัตโนมัติแม้ไม่มีเน็ต
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              ปิด
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white shadow-md shadow-emerald-700/30"
            >
              บันทึกการตั้งค่า
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
