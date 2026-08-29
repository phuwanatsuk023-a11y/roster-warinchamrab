import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CalendarOff,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  CloudDownload,
  CloudUpload,
  Code2,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Holiday } from './types';
import { formatThaiDate, toThaiNumeral } from './rosterEngine';
import { APPS_SCRIPT_CODE_TEMPLATE } from './apiService';

interface HolidaysManagementProps {
  holidays: Holiday[];
  onAddHoliday: (date: string, name: string, type: 'official' | 'special') => Promise<void>;
  onDeleteHoliday: (id: number) => Promise<void>;
  onSyncWithSheet?: () => Promise<void>;
  onFetchFromSheet?: () => Promise<void>;
  isSyncing?: boolean;
  appsScriptUrl?: string;
  onOpenSheetSettings?: () => void;
  showToast?: (msg: string) => void;
}

export const HolidaysManagement: React.FC<HolidaysManagementProps> = ({
  holidays,
  onAddHoliday,
  onDeleteHoliday,
  onSyncWithSheet,
  onFetchFromSheet,
  isSyncing = false,
  appsScriptUrl,
  onOpenSheetSettings,
  showToast,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [dateVal, setDateVal] = useState('');
  const [nameVal, setNameVal] = useState('');
  const [typeVal, setTypeVal] = useState<'official' | 'special'>('official');
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'official' | 'special'>('all');

  // Script Modal state
  const [isShowScriptModal, setIsShowScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [localSyncing, setLocalSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Extract unique years from holidays
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    holidays.forEach(h => {
      if (h.holiday_date) {
        const y = parseInt(h.holiday_date.split('-')[0], 10);
        if (!isNaN(y)) years.add(y);
      }
    });
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    years.add(currentYear + 1);
    return Array.from(years).sort((a, b) => b - a);
  }, [holidays]);

  // Filtered Holidays
  const filteredHolidays = useMemo(() => {
    return holidays.filter(h => {
      // Search
      const matchSearch =
        !searchTerm ||
        h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.holiday_date.includes(searchTerm);

      // Year filter
      let matchYear = true;
      if (selectedYear !== 'all') {
        const hYear = h.holiday_date.split('-')[0];
        matchYear = hYear === selectedYear;
      }

      // Type filter
      let matchType = true;
      if (selectedType !== 'all') {
        matchType = h.type === selectedType;
      }

      return matchSearch && matchYear && matchType;
    });
  }, [holidays, searchTerm, selectedYear, selectedType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateVal || !nameVal.trim()) return;
    try {
      await onAddHoliday(dateVal, nameVal.trim(), typeVal);
      setDateVal('');
      setNameVal('');
      setIsAddOpen(false);
      setStatusMessage({
        type: 'success',
        text: `เพิ่มวันหยุด "${nameVal.trim()}" เรียบร้อยแล้ว`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `เกิดข้อผิดพลาด: ${err.message || err}`,
      });
    }
  };

  const handleManualSyncPush = async () => {
    if (!onSyncWithSheet) return;
    setLocalSyncing(true);
    setStatusMessage(null);
    try {
      await onSyncWithSheet();
      setStatusMessage({
        type: 'success',
        text: `ซิงก์ข้อมูลวันหยุด ${holidays.length} รายการขึ้น Google Sheet เรียบร้อยแล้ว!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `ซิงก์ขึ้น Google Sheet ไม่สำเร็จ: ${err.message || err}`,
      });
    } finally {
      setLocalSyncing(false);
    }
  };

  const handleManualSyncPull = async () => {
    if (!onFetchFromSheet) return;
    setLocalSyncing(true);
    setStatusMessage(null);
    try {
      await onFetchFromSheet();
      setStatusMessage({
        type: 'success',
        text: 'ดึงข้อมูลวันหยุดล่าสุดจาก Google Sheet เรียบร้อยแล้ว!',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `ดึงข้อมูลไม่สำเร็จ: ${err.message || err}`,
      });
    } finally {
      setLocalSyncing(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  // Quick preset holidays for fast insertion
  const quickHolidayPresets = [
    { name: 'วันขึ้นปีใหม่', month: '01', day: '01', type: 'official' as const },
    { name: 'วันมาฆบูชา', month: '02', day: '24', type: 'official' as const },
    { name: 'วันจักรี', month: '04', day: '06', type: 'official' as const },
    { name: 'วันสงกรานต์', month: '04', day: '13', type: 'official' as const },
    { name: 'วันสงกรานต์', month: '04', day: '14', type: 'official' as const },
    { name: 'วันสงกรานต์', month: '04', day: '15', type: 'official' as const },
    { name: 'วันแรงงานแห่งชาติ', month: '05', day: '01', type: 'official' as const },
    { name: 'วันวิสาขบูชา', month: '05', day: '22', type: 'official' as const },
    { name: 'วันเฉลิมพระชนมพรรษา ร.10', month: '07', day: '28', type: 'official' as const },
    { name: 'วันแม่แห่งชาติ', month: '08', day: '12', type: 'official' as const },
    { name: 'วันนวมินทรมหาราช', month: '10', day: '13', type: 'official' as const },
    { name: 'วันปิยมหาราช', month: '10', day: '23', type: 'official' as const },
    { name: 'วันพ่อแห่งชาติ', month: '12', day: '05', type: 'official' as const },
    { name: 'วันรัฐธรรมนูญ', month: '12', day: '10', type: 'official' as const },
    { name: 'วันสิ้นปี', month: '12', day: '31', type: 'official' as const },
  ];

  const applyPreset = (preset: typeof quickHolidayPresets[0]) => {
    const curYear = new Date().getFullYear();
    setDateVal(`${curYear}-${preset.month}-${preset.day}`);
    setNameVal(preset.name);
    setTypeVal(preset.type);
  };

  const isBusy = isSyncing || localSyncing;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-amber-500" /> จัดการวันหยุดราชการ & วันหยุดพิเศษ
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            วันหยุดเหล่านี้จะถูกนำไปคำนวณการเข้าเวรกลางวันของบุคลากรหญิงโดยอัตโนมัติ และสามารถซิงก์กับ Google Sheet ได้
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sync Up to Google Sheet Button */}
          {onSyncWithSheet && (
            <button
              onClick={handleManualSyncPush}
              disabled={isBusy}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-700/30 transition-all"
              title="ซิงก์ข้อมูลวันหยุดทั้งหมดขึ้น Google Sheet (แผ่นงาน holidays)"
            >
              {isBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4 text-emerald-200" />
              )}
              <span>{isBusy ? 'กำลังซิงก์...' : 'ซิงก์ขึ้น Google Sheet'}</span>
            </button>
          )}

          {/* Pull from Google Sheet Button */}
          {onFetchFromSheet && (
            <button
              onClick={handleManualSyncPull}
              disabled={isBusy}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 transition-all shadow-sm"
              title="ดึงข้อมูลวันหยุดล่าสุดจาก Google Sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isBusy ? 'animate-spin' : ''}`} />
              <span>ดึงข้อมูลล่าสุด</span>
            </button>
          )}

          {/* Add Holiday Button */}
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มวันหยุด</span>
          </button>
        </div>
      </div>

      {/* Google Sheet Connection Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                appsScriptUrl ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            ></span>
            <span className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Google Sheet API (แผ่นงาน holidays):
            </span>
          </div>

          {appsScriptUrl ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-100/70 dark:bg-emerald-950 px-2 py-0.5 rounded text-[11px] border border-emerald-200 dark:border-emerald-800">
              เชื่อมต่อแล้ว (พร้อมซิงก์ข้อมูลอัตโนมัติ)
            </span>
          ) : (
            <span className="text-amber-700 dark:text-amber-400 font-semibold bg-amber-100/70 dark:bg-amber-950 px-2 py-0.5 rounded text-[11px] border border-amber-200 dark:border-amber-800">
              ยังไม่ได้เชื่อมต่อ Google Sheet (บันทึกในเครื่อง)
            </span>
          )}

          <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-1">
            (จำนวนวันหยุดทั้งหมด: <strong>{holidays.length}</strong> วัน)
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setIsShowScriptModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            <Code2 className="w-3 h-3 text-emerald-600" />
            <span>ดูโค้ด Apps Script</span>
          </button>

          {onOpenSheetSettings && (
            <button
              onClick={onOpenSheetSettings}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Settings className="w-3 h-3" />
              <span>ตั้งค่า Google Sheet</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Status Banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl flex items-center justify-between gap-2 text-xs animate-fade-in border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อวันหยุด หรือ วันที่ (เช่น สงกรานต์, 2026-04)..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">ปี:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทุกปี</option>
              {availableYears.map(y => (
                <option key={y} value={String(y)}>
                  พ.ศ. {y + 543} ({y})
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedType === 'all'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({holidays.length})
            </button>
            <button
              onClick={() => setSelectedType('official')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedType === 'official'
                  ? 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              ราชการ ({holidays.filter(h => h.type === 'official').length})
            </button>
            <button
              onClick={() => setSelectedType('special')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedType === 'special'
                  ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              พิเศษ ({holidays.filter(h => h.type === 'special').length})
            </button>
          </div>
        </div>
      </div>

      {/* Holidays Table Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            รายการวันหยุด (แสดง {filteredHolidays.length} จากทั้งหมด {holidays.length} วัน)
          </span>
          {(searchTerm || selectedYear !== 'all' || selectedType !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedYear('all');
                setSelectedType('all');
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-semibold"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5 w-14 text-center">ลำดับ</th>
                <th className="p-3.5 w-48">วันที่</th>
                <th className="p-3.5">ชื่อวันหยุด</th>
                <th className="p-3.5 text-center w-36">ประเภท</th>
                <th className="p-3.5 text-center w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredHolidays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400">
                    <CalendarOff className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      {searchTerm || selectedYear !== 'all' || selectedType !== 'all'
                        ? 'ไม่พบข้อมูลวันหยุดที่ตรงกับเงื่อนไขการค้นหา'
                        : 'ยังไม่มีข้อมูลวันหยุดในระบบ'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      สามารถกดปุ่ม "เพิ่มวันหยุด" เพื่อเพิ่มรายการใหม่ หรือ "ดึงข้อมูลล่าสุด" จาก Google Sheet
                    </p>
                  </td>
                </tr>
              ) : (
                filteredHolidays.map((h, idx) => (
                  <tr
                    key={h.id}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-700/40 transition-colors group"
                  >
                    <td className="p-3.5 text-center text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {formatThaiDate(h.holiday_date)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {h.holiday_date}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-800 dark:text-slate-200 font-medium">
                      <span className="text-sm font-semibold">{h.name}</span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] border ${
                          h.type === 'official'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            h.type === 'official' ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                        ></span>
                        {h.type === 'official' ? 'วันหยุดราชการ' : 'วันหยุดพิเศษ'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setDeletingHoliday(h)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                        title="ลบวันหยุดนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Holiday Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" /> เพิ่มวันหยุดราชการ / วันหยุดพิเศษ
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Holiday Selection Chips */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> เลือกด่วนจากวันหยุดประจำปี (คลิกเพื่อกรอกอัตโนมัติ):
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                {quickHolidayPresets.map(preset => (
                  <button
                    key={`${preset.name}-${preset.day}`}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-medium transition-colors"
                  >
                    {preset.name} ({preset.day}/{preset.month})
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  วันที่ (ค.ศ. เช่น 2026-04-13)
                </label>
                <input
                  type="date"
                  required
                  value={dateVal}
                  onChange={e => setDateVal(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  ชื่อวันหยุด
                </label>
                <input
                  type="text"
                  required
                  value={nameVal}
                  onChange={e => setNameVal(e.target.value)}
                  placeholder="เช่น วันสงกรานต์, วันขึ้นปีใหม่, วันหยุดชดเชย..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  ประเภทวันหยุด
                </label>
                <select
                  value={typeVal}
                  onChange={e => setTypeVal(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="official">วันหยุดราชการ (Official Holiday)</option>
                  <option value="special">วันหยุดพิเศษ / วันหยุดกรณีพิเศษ (Special Holiday)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md shadow-emerald-700/30 transition-all"
                >
                  บันทึกวันหยุด
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingHoliday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700 text-center">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
              ยืนยันการลบวันหยุด
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              คุณต้องการลบ <strong>{deletingHoliday.name}</strong> ({formatThaiDate(deletingHoliday.holiday_date)}) ใช่หรือไม่?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingHoliday(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  await onDeleteHoliday(deletingHoliday.id);
                  setDeletingHoliday(null);
                  setStatusMessage({
                    type: 'success',
                    text: `ลบวันหยุด "${deletingHoliday.name}" เรียบร้อยแล้ว`,
                  });
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apps Script Code Modal */}
      {isShowScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-700 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setIsShowScriptModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 flex items-center justify-center">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Google Apps Script (Code.gs) พร้อมตาราง Holidays
                </h2>
                <p className="text-xs text-slate-500">
                  รองรับการซิงก์ข้อมูลวันหยุดราชการและวันหยุดพิเศษลงในแผ่นงาน <code className="font-mono text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">holidays</code>
                </p>
              </div>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] overflow-auto flex-1 border border-slate-800 space-y-2 mb-4">
              <pre className="whitespace-pre">{APPS_SCRIPT_CODE_TEMPLATE}</pre>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
              <p className="text-[11px] text-slate-500">
                คัดลอกไปวางที่ Google Sheets &gt; Extensions &gt; Apps Script แล้วกด Deploy as Web App
              </p>
              <button
                onClick={handleCopyScript}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-800/30 transition-all"
              >
                {copiedScript ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedScript ? 'คัดลอกโค้ดแล้ว!' : 'คัดลอกโค้ดทั้งหมด'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
