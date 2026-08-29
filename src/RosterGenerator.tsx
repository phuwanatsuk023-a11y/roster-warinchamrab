import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Cloud,
  CloudUpload,
  Code2,
  Columns,
  Copy,
  Database,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  MapPin,
  Maximize2,
  Minus,
  Moon,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  Sun,
  Type,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { DutyPoint, Holiday, Personnel, RosterDay, SavedRosterScheduleRow } from './types';
import {
  formatThaiDate,
  generateMonthlyRoster,
  getDutyUnitsForPoint,
  THAI_MONTHS,
  THAI_SHORT_MONTHS,
  toThaiNumeral,
} from './rosterEngine';
import { apiService, APPS_SCRIPT_CODE_TEMPLATE } from './apiService';

interface RosterGeneratorProps {
  personnel: Personnel[];
  dutyPoints: DutyPoint[];
  holidays: Holiday[];
  appsScriptUrl?: string;
  onOpenSheetSettings?: () => void;
  onUpdatePersonnel?: (updated: Personnel[]) => void;
  onSaveRosterToSheet?: (
    month: number,
    year: number,
    gender: 'M' | 'F' | 'ALL',
    items: SavedRosterScheduleRow[]
  ) => Promise<{ count: number; message: string }>;
  onRosterSaved?: () => void;
  showToast?: (msg: string) => void;
}

export const RosterGenerator: React.FC<RosterGeneratorProps> = ({
  personnel = [],
  dutyPoints = [],
  holidays = [],
  appsScriptUrl,
  onOpenSheetSettings,
  onUpdatePersonnel,
  onSaveRosterToSheet,
  onRosterSaved,
  showToast,
}) => {
  const safePersonnel = Array.isArray(personnel) ? personnel : [];
  const safeDutyPoints = Array.isArray(dutyPoints) ? dutyPoints : [];
  const safeHolidays = Array.isArray(holidays) ? holidays : [];

  const currentDate = new Date();
  const [month, setMonth] = useState<number>(currentDate.getMonth());
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [gender, setGender] = useState<'M' | 'F'>('M');

  // Custom starting pairs per point and starting inspector index
  const [startingPairs, setStartingPairs] = useState<Record<string, number>>({});
  const [startingInspectorIdx, setStartingInspectorIdx] = useState<number>(0);

  // Status whether current roster has been saved
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isShowScriptModal, setIsShowScriptModal] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // Font Size Settings (Customizable per point and per section)
  const [isFontSettingsOpen, setIsFontSettingsOpen] = useState<boolean>(false);
  const [globalFontSize, setGlobalFontSize] = useState<number>(9.5);
  const [titleFontSize, setTitleFontSize] = useState<number>(12);
  const [headerFontSize, setHeaderFontSize] = useState<number>(9.5);
  const [dateColFontSize, setDateColFontSize] = useState<number>(9.5);
  const [inspectorColFontSize, setInspectorColFontSize] = useState<number>(9.5);
  const [pointFontSizes, setPointFontSizes] = useState<Record<string, number>>({});

  const thaiYear = year + 543;

  const activePoints = useMemo(() => {
    return safeDutyPoints.filter(p => p.gender === gender);
  }, [safeDutyPoints, gender]);

  const inspectors = useMemo(() => {
    return safePersonnel.filter(p => p.gender === gender && p.isInspector && p.status === 'active');
  }, [safePersonnel, gender]);

  // Reactive Calculation: whenever month, year, gender, personnel, dutyPoints, holidays,
  // startingPairs or startingInspectorIdx changes, recalculate instantly
  const activeRoster = useMemo(() => {
    return generateMonthlyRoster(
      month,
      year,
      gender,
      safePersonnel,
      safeDutyPoints,
      safeHolidays,
      startingPairs,
      startingInspectorIdx
    );
  }, [month, year, gender, safePersonnel, safeDutyPoints, safeHolidays, startingPairs, startingInspectorIdx]);

  // Track whether the current generated roster for this view has been saved to Sheet in this session or historically
  const [hasSavedCurrentRoster, setHasSavedCurrentRoster] = useState<boolean>(false);

  // Check last saved timestamp whenever month, year, or gender changes
  useEffect(() => {
    const savedTime = apiService.getLastSavedRosterTime(month + 1, year, gender);
    setLastSavedTime(savedTime);
    setHasSavedCurrentRoster(Boolean(savedTime));
    setSaveSuccessMsg(null);
    setSaveError(null);
  }, [month, year, gender]);

  // When active parameters change (recalculated roster), require re-saving before print
  useEffect(() => {
    // If user changes custom starting pairs, reset saved status
    setHasSavedCurrentRoster(false);
  }, [startingPairs, startingInspectorIdx]);

  // Handle setting individual point font size
  const handlePointFontSizeChange = (pointName: string, val: number) => {
    const clamped = Math.max(6, Math.min(28, val));
    setPointFontSizes(prev => ({ ...prev, [pointName]: clamped }));
  };

  const handleApplyGlobalToAll = (val: number) => {
    const clamped = Math.max(6, Math.min(28, val));
    setGlobalFontSize(clamped);
    setHeaderFontSize(clamped);
    setDateColFontSize(clamped);
    setInspectorColFontSize(clamped);
    const newPointSizes: Record<string, number> = {};
    activePoints.forEach(pt => {
      newPointSizes[pt.name] = clamped;
    });
    setPointFontSizes(newPointSizes);
  };

  // Convert RosterDay array to tabular rows for Google Sheet storage
  const buildScheduleRows = (
    rosterDays: RosterDay[],
    targetGender: 'M' | 'F'
  ): SavedRosterScheduleRow[] => {
    const DOW_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const pts = dutyPoints.filter(p => p.gender === targetGender);
    const rows: SavedRosterScheduleRow[] = [];

    const filteredDays = rosterDays.filter(r => (targetGender === 'F' ? r.isOff : true));

    filteredDays.forEach(dayItem => {
      const inspectorPerson = personnel.find(p => p.id === dayItem.inspector);
      const inspectorName = inspectorPerson ? `${inspectorPerson.fname} ${inspectorPerson.lname}`.trim() : '';

      pts.forEach(pt => {
        const units = dayItem.unitsByPoint[pt.name] || [];
        units.forEach((u, uIdx) => {
          const headPerson = personnel.find(p => p.id === u.head);
          const subPerson = personnel.find(p => p.id === u.sub);
          const sub2Person = personnel.find(p => p.id === u.sub2);

          if (headPerson || subPerson || sub2Person) {
            rows.push({
              schedule_id: `SCH-${year}-${month + 1}-${targetGender}-${dayItem.day}-${pt.id}-${uIdx + 1}`,
              year,
              year_th: year + 543,
              month: month + 1,
              month_name: THAI_MONTHS[month],
              gender: targetGender,
              date_str: dayItem.dateStr,
              day: dayItem.day,
              day_of_week: DOW_NAMES[dayItem.dow] || '',
              is_holiday: dayItem.isOff,
              point_name: pt.name,
              head_id: headPerson?.id || '',
              head_name: headPerson ? `${headPerson.fname} ${headPerson.lname}`.trim() : '',
              head_position: headPerson?.position || '',
              sub_id: subPerson?.id || '',
              sub_name: subPerson ? `${subPerson.fname} ${subPerson.lname}`.trim() : '',
              sub_position: subPerson?.position || '',
              sub2_id: sub2Person?.id || '',
              sub2_name: sub2Person ? `${sub2Person.fname} ${sub2Person.lname}`.trim() : '',
              sub2_position: sub2Person?.position || '',
              inspector_id: inspectorPerson?.id || '',
              inspector_name: inspectorName,
              inspector_position: inspectorPerson?.position || '',
            });
          }
        });
      });
    });

    return rows;
  };

  // Handle saving current active roster to Google Sheet
  const handleSaveToSheet = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccessMsg(null);

    try {
      const rows = buildScheduleRows(activeRoster, gender);
      const groupLabel = gender === 'M' ? 'เวรชาย (กลางคืน)' : 'เวรหญิง (กลางวัน)';
      let res: { count: number; message: string };
      if (onSaveRosterToSheet) {
        res = await onSaveRosterToSheet(month + 1, year, gender, rows);
      } else {
        res = await apiService.saveRosterSchedule(month + 1, year, gender, rows);
      }
      const msg = res?.message || `บันทึกตาราง${groupLabel} ประจำเดือน ${THAI_MONTHS[month]} ${thaiYear} จำนวน ${rows.length} รายการ ลง Google Sheet เรียบร้อยแล้ว`;
      setSaveSuccessMsg(msg);
      setLastSavedTime(new Date().toISOString());
      setHasSavedCurrentRoster(true);
      if (onRosterSaved) onRosterSaved();
      if (showToast) showToast(msg);
    } catch (err: any) {
      console.error('Save roster error:', err);
      const errMsg = err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลตารางเวรลง Google Sheet';
      setSaveError(errMsg);
      if (showToast) showToast(`ผิดพลาด: ${errMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const displayRoster = useMemo(() => {
    return activeRoster.filter(r => (gender === 'F' ? r.isOff : true));
  }, [activeRoster, gender]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Dynamic Font & Print Styling for A4 Landscape with 1cm margin, auto column width, no text truncation, transparent/white background */}
      <style>
        {`
          @media print {
            @page {
              size: A4 landscape;
              margin: 1cm !important;
            }
            *,
            *::before,
            *::after {
              background: transparent !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              box-shadow: none !important;
              text-shadow: none !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body, #root, main {
              background: transparent !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              font-family: "TH Sarabun IT9", "TH Sarabun IT๙", "TH Sarabun New", "TH Sarabun PSK", "Sarabun", "Noto Sans Thai", sans-serif !important;
            }
            #print-roster-area {
              background: transparent !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              overflow: visible !important;
              font-family: "TH Sarabun IT9", "TH Sarabun IT๙", "TH Sarabun New", "TH Sarabun PSK", "Sarabun", "Noto Sans Thai", sans-serif !important;
            }
            #roster-pdf-table {
              width: 100% !important;
              max-width: 100% !important;
              table-layout: auto !important;
              border-collapse: collapse !important;
              background: transparent !important;
              background-color: transparent !important;
              font-family: "TH Sarabun IT9", "TH Sarabun IT๙", "TH Sarabun New", "TH Sarabun PSK", "Sarabun", "Noto Sans Thai", sans-serif !important;
            }
            #roster-pdf-table th, 
            #roster-pdf-table td,
            #roster-pdf-table tr,
            #roster-pdf-table thead,
            #roster-pdf-table tbody {
              background: transparent !important;
              background-color: transparent !important;
              border: 1px solid #000000 !important;
              color: #000000 !important;
              font-family: "TH Sarabun IT9", "TH Sarabun IT๙", "TH Sarabun New", "TH Sarabun PSK", "Sarabun", "Noto Sans Thai", sans-serif !important;
              white-space: nowrap !important;
              overflow: visible !important;
              text-overflow: clip !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      {/* Control Card */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 no-print">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" /> ระบบสร้างตารางเวร & พิมพ์เอกสารคำสั่งแนบท้าย
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              จัดลำดับเวรเวียนตามคู่และจุดอัตโนมัติ พร้อมบันทึกลง Google Sheet และพิมพ์เอกสารคำสั่ง A4 เต็มหน้า (TH Sarabun IT๙, ขอบข้างละ 0.5 ซม., จัดคอลัมน์อัตโนมัติไม่ตัดคำ)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Toggle Font Size Settings */}
            <button
              onClick={() => setIsFontSettingsOpen(!isFontSettingsOpen)}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                isFontSettingsOpen
                  ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
              title="ปรับแต่งขนาดตัวอักษรของแต่ละจุดในตาราง"
            >
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>ปรับขนาดตัวอักษร</span>
              {isFontSettingsOpen ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            {/* Save Roster to Google Sheet Button */}
            <button
              onClick={handleSaveToSheet}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-700/30 transition-all active:scale-95"
              title="บันทึกตารางเวรกลุ่มปัจจุบันลง Google Sheet (ตาราง roster_schedules)"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4 text-amber-300" />
              )}
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกตารางเวรลง Sheet'}</span>
            </button>

            {/* Print Button (Hidden if not saved to sheet yet) */}
            {hasSavedCurrentRoster && (
              <button
                onClick={handlePrint}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all active:scale-95 animate-fadeIn"
                title="พิมพ์ตารางเวรขนาด A4 แนวนอน"
              >
                <Printer className="w-4 h-4 text-emerald-100" />
                <span>พิมพ์ตารางเวร (A4)</span>
              </button>
            )}
          </div>
        </div>

        {/* Google Sheet Sync Info & Status Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  appsScriptUrl ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              ></span>
              <span className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Google Sheet API:
              </span>
            </div>

            {appsScriptUrl ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-100/70 dark:bg-emerald-950 px-2 py-0.5 rounded text-[11px] border border-emerald-200 dark:border-emerald-800">
                เชื่อมต่อแล้ว (แผ่นงาน roster_schedules)
              </span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400 font-semibold bg-amber-100/70 dark:bg-amber-950 px-2 py-0.5 rounded text-[11px] border border-amber-200 dark:border-amber-800">
                ยังไม่ได้เชื่อมต่อ Google Sheet (บันทึกในเครื่อง)
              </span>
            )}

            {lastSavedTime ? (
              <span className="text-emerald-700 dark:text-emerald-400 text-[11px] flex items-center gap-1 ml-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                บันทึกล่าสุด: {new Date(lastSavedTime).toLocaleString('th-TH')}
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 text-[11px] flex items-center gap-1 ml-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                ยังไม่พบบันทึกในระบบสำหรับกลุ่มนี้
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setIsShowScriptModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Code2 className="w-3 h-3 text-blue-600" />
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

        {/* Save Success Alert */}
        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-xl flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{saveSuccessMsg}</span>
            </div>
            <button
              onClick={() => setSaveSuccessMsg(null)}
              className="text-emerald-600 hover:text-emerald-800 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Save Error Alert */}
        {saveError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{saveError}</span>
            </div>
            <button
              onClick={() => setSaveError(null)}
              className="text-rose-600 hover:text-rose-800 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filters Bar: Month, Year, Group */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              เดือน
            </label>
            <select
              value={month}
              onChange={e => setMonth(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-xs font-medium"
            >
              {THAI_MONTHS.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              ปี พ.ศ.
            </label>
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-xs font-medium"
            >
              {[2025, 2026, 2027, 2028, 2029].map(y => (
                <option key={y} value={y}>
                  {y + 543}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              ประเภทกลุ่มเวร
            </label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold text-blue-600 dark:text-blue-400"
            >
              <option value="M">เวรชาย (กลางคืน 18.00 - 06.00 น.)</option>
              <option value="F">เวรหญิง (กลางวัน 08.30 - 16.30 น.)</option>
            </select>
          </div>
        </div>

        {/* FONT SIZE CUSTOMIZATION PANEL */}
        {isFontSettingsOpen && (
          <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-blue-200 dark:border-blue-800 space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-600">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Type className="w-4 h-4 text-blue-600" />
                <span>กำหนดขนาดตัวอักษรเป็นตัวเลข (pt) - ฟอนต์ TH Sarabun IT๙ ทุกจุด</span>
              </div>

              {/* Quick Set All Stepper */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] text-slate-500">ปรับทุกจุดเท่ากัน:</span>
                <button
                  type="button"
                  onClick={() => handleApplyGlobalToAll(globalFontSize - 0.5)}
                  className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  title="ลดทุกจุด (-0.5 pt)"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min="6"
                  max="28"
                  step="0.5"
                  value={globalFontSize}
                  onChange={e => handleApplyGlobalToAll(parseFloat(e.target.value) || 9.5)}
                  className="w-14 text-center font-bold text-xs py-1 px-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => handleApplyGlobalToAll(globalFontSize + 0.5)}
                  className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  title="เพิ่มทุกจุด (+0.5 pt)"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* General Sections Font Size */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Doc Title */}
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  หัวเรื่อง / เอกสาร
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="8"
                    max="28"
                    step="0.5"
                    value={titleFontSize}
                    onChange={e => setTitleFontSize(parseFloat(e.target.value) || 12)}
                    className="w-full text-center font-bold text-xs py-1 px-1 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400">pt</span>
                </div>
              </div>

              {/* Table Header Row */}
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  หัวตาราง (แถวบนสุด)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="6"
                    max="28"
                    step="0.5"
                    value={headerFontSize}
                    onChange={e => setHeaderFontSize(parseFloat(e.target.value) || 9.5)}
                    className="w-full text-center font-bold text-xs py-1 px-1 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400">pt</span>
                </div>
              </div>

              {/* Date Column */}
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  คอลัมน์วัน/เดือน/ปี
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="6"
                    max="28"
                    step="0.5"
                    value={dateColFontSize}
                    onChange={e => setDateColFontSize(parseFloat(e.target.value) || 9.5)}
                    className="w-full text-center font-bold text-xs py-1 px-1 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400">pt</span>
                </div>
              </div>

              {/* Inspector Column */}
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  คอลัมน์ผู้ตรวจเวร
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="6"
                    max="28"
                    step="0.5"
                    value={inspectorColFontSize}
                    onChange={e => setInspectorColFontSize(parseFloat(e.target.value) || 9.5)}
                    className="w-full text-center font-bold text-xs py-1 px-1 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400">pt</span>
                </div>
              </div>
            </div>

            {/* Individual Duty Points Font Size Inputs */}
            <div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>ขนาดตัวอักษรแยกเฉพาะแต่ละจุดเวร:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {activePoints.map(pt => {
                  const ptSize = pointFontSizes[pt.name] !== undefined ? pointFontSizes[pt.name] : globalFontSize;
                  return (
                    <div key={pt.id} className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600">
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 truncate" title={pt.name}>
                        {pt.name}
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handlePointFontSizeChange(pt.name, ptSize - 0.5)}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="6"
                          max="28"
                          step="0.5"
                          value={ptSize}
                          onChange={e => handlePointFontSizeChange(pt.name, parseFloat(e.target.value) || globalFontSize)}
                          className="w-full text-center font-bold text-xs py-1 px-1 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handlePointFontSizeChange(pt.name, ptSize + 0.5)}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] text-slate-400 shrink-0">pt</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Starting Pair / Inspector Selector Bar (Auto-updates table on change) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600 space-y-3">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span>กำหนดคู่เวรเริ่มต้นของวันแรก (วันที่ 1 ของเดือน)</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              ตารางด้านล่างอัปเดตอัตโนมัติทันทีเมื่อเลือก
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {activePoints.map(pt => {
              const units = getDutyUnitsForPoint(pt.name, gender, personnel);
              return (
                <div key={pt.id} className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 truncate" title={pt.name}>
                    {pt.name}
                  </label>
                  <select
                    value={startingPairs[pt.name] || 0}
                    onChange={e => {
                      setStartingPairs({ ...startingPairs, [pt.name]: parseInt(e.target.value, 10) });
                    }}
                    className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    {units.length === 0 ? (
                      <option value={0}>ไม่มีบุคลากรในจุดนี้</option>
                    ) : (
                      units.map((u, uIdx) => (
                        <option key={u.id} value={uIdx}>
                          {u.label} ({u.members.map(m => m.fname).join(', ')})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              );
            })}
          </div>

          {/* Inspector selector */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-purple-600" /> ผู้ตรวจเวรเริ่มต้นของวันแรก
              </label>
              <select
                value={startingInspectorIdx}
                onChange={e => {
                  setStartingInspectorIdx(parseInt(e.target.value, 10));
                }}
                className="w-full sm:w-80 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                {inspectors.length === 0 ? (
                  <option value={0}>ไม่มีผู้ตรวจเวรในกลุ่มนี้</option>
                ) : (
                  inspectors.map((insp, idx) => (
                    <option key={insp.db_id} value={idx}>
                      {insp.fname} {insp.lname} ({insp.position})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="text-[11px] text-slate-400 self-end">
              คำนวณทั้งหมด <span className="font-bold text-slate-700 dark:text-slate-300">{displayRoster.length}</span> วัน
            </div>
          </div>
        </div>
      </div>

      {/* Roster Sheet Preview & Print Container (Pure white background, clean border without colored wrapper, no scrollbars) */}
      <div className="w-full">
        <div id="print-roster-area" className="bg-white text-black p-5 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 mx-auto w-full max-w-full print:shadow-none print:p-0 print:m-0 print:border-none font-sarabun">
          {/* Header Description (Official Thai Order Text) */}
          <div className="mb-4 font-sarabun text-black leading-relaxed" style={{ fontSize: `${titleFontSize}pt` }}>
            {gender === 'F' ? (
              <>
                <div id="roster-heading-title" className="text-center font-bold mb-1" style={{ fontSize: `${titleFontSize * 1.15}pt` }}>
                  เวรประจำสำนักงานเทศบาลเมืองวารินชำราบ สำนักงานโครงการปรับปรุงคุณภาพน้ำ ศูนย์บริการสาธารณสุขฯ แห่งที่ 2 และแห่งที่ 3
                </div>
                <div className="text-center text-xs mb-1" style={{ fontSize: `${titleFontSize * 0.9}pt` }}>
                  แนบท้ายคำสั่งเทศบาลเมืองวารินชำราบ ที่ ............... /................. ลงวันที่..........................................
                </div>
                <div className="text-center font-bold mb-2" style={{ fontSize: `${titleFontSize}pt` }}>
                  ประจำเดือน {THAI_MONTHS[month]} พ.ศ. {thaiYear}
                </div>
                <div className="text-justify indent-8 leading-snug" style={{ fontSize: `${titleFontSize * 0.92}pt` }}>
                  ข้อ 1 เจ้าหน้าที่อยู่เวรและตรวจเวร ประจำสำนักงานเทศบาลเมืองวารินชำราบ ศูนย์บริการสาธารณสุขฯ แห่งที่ 2 และ แห่งที่ 3 (กลางวัน) ในวันเสาร์ - อาทิตย์ และวันหยุดนักขัตฤกษ์ ซึ่งเริ่มปฏิบัติหน้าที่ตั้งแต่เวลา 08.30 - 16.30 น. ประกอบด้วยบุคคลดังต่อไปนี้
                </div>
              </>
            ) : (
              <div className="text-justify indent-8 leading-snug" style={{ fontSize: `${titleFontSize * 0.92}pt` }}>
                ข้อ 2 เจ้าหน้าที่อยู่เวร-ยามและผู้ตรวจเวร ประจำสำนักงานเทศบาลเมืองวารินชำราบ สำนักงานโครงการปรับปรุงคุณภาพน้ำ ศูนย์บริการสาธารณสุข แห่งที่ 2 และแห่งที่ 3 (กลางคืน) ซึ่งเริ่มปฏิบัติหน้าที่ ตั้งแต่เวลา 18.00 - 06.00 น. ของวันรุ่งขึ้น ไม่เว้นวันหยุดราชการ ประกอบด้วยบุคคลดังต่อไปนี้
              </div>
            )}
          </div>

          {/* Table (Full A4 Width with auto layout, no background color, no text truncation) */}
          <table className="w-full border-collapse border border-black font-sarabun text-black bg-white" id="roster-pdf-table" style={{ tableLayout: 'auto' }}>
            <thead>
              <tr className="bg-white print:bg-transparent" style={{ fontSize: `${headerFontSize}pt` }}>
                <th className="border border-black p-1.5 text-center font-bold bg-white print:bg-transparent whitespace-nowrap">
                  วัน/เดือน/ปี
                </th>
                {activePoints.map(pt => (
                  <th
                    key={pt.id}
                    className="border border-black p-1.5 text-center font-bold bg-white print:bg-transparent whitespace-nowrap"
                  >
                    {pt.name}
                  </th>
                ))}
                <th className="border border-black p-1.5 text-center font-bold bg-white print:bg-transparent whitespace-nowrap">
                  ผู้ตรวจเวร
                </th>
              </tr>
            </thead>
            <tbody>
              {displayRoster.map(r => {
                const inspectorPerson = personnel.find(p => p.id === r.inspector);
                const dateThaiStr = `${r.day} ${THAI_SHORT_MONTHS[month]} ${thaiYear}`;

                return (
                  <tr key={r.day} className="border-b border-black page-break-inside-avoid">
                    {/* Date Column */}
                    <td
                      className="border border-black p-1 text-center align-top font-bold whitespace-nowrap"
                      style={{ fontSize: `${dateColFontSize}pt` }}
                    >
                      {dateThaiStr}
                    </td>

                    {/* Points Columns (Auto size based on text, no text truncation) */}
                    {activePoints.map(pt => {
                      const units = r.unitsByPoint[pt.name] || [];
                      const ptFontSize = pointFontSizes[pt.name] !== undefined ? pointFontSizes[pt.name] : globalFontSize;

                      return (
                        <td
                          key={pt.id}
                          className="border border-black p-1 align-top whitespace-nowrap"
                          style={{ fontSize: `${ptFontSize}pt` }}
                        >
                          {units.map((u, uIdx) => {
                            const head = personnel.find(p => p.id === u.head);
                            const sub = personnel.find(p => p.id === u.sub);
                            const sub2 = personnel.find(p => p.id === u.sub2);

                            return (
                              <div key={uIdx} className="space-y-0.5 leading-tight">
                                {head && (
                                  <div className="flex justify-between items-center gap-2 whitespace-nowrap">
                                    <span className="font-normal">
                                      1. {head.fname} {head.lname}
                                      {head.pairNo && (
                                        <span className="text-[10px] text-rose-600 print:hidden ml-1 font-semibold">
                                          (คู่ {head.pairNo})
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-[10px] font-bold shrink-0 ml-2">หน.เวร</span>
                                  </div>
                                )}
                                {sub && (
                                  <div className="flex justify-between items-center gap-2 whitespace-nowrap">
                                    <span className="font-normal">
                                      2. {sub.fname} {sub.lname}
                                    </span>
                                    <span className="text-[10px] font-normal shrink-0 ml-2">ผช.เวร</span>
                                  </div>
                                )}
                                {sub2 && (
                                  <div className="flex justify-between items-center gap-2 whitespace-nowrap">
                                    <span className="font-normal">
                                      3. {sub2.fname} {sub2.lname}
                                    </span>
                                    <span className="text-[10px] font-normal shrink-0 ml-2">ผช.เวร</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}

                    {/* Inspector Column */}
                    <td
                      className="border border-black p-1 text-center align-top font-medium whitespace-nowrap"
                      style={{ fontSize: `${inspectorColFontSize}pt` }}
                    >
                      {inspectorPerson ? `${inspectorPerson.fname} ${inspectorPerson.lname}` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 flex items-center justify-center">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Google Apps Script (Code.gs) พร้อมตาราง Roster Schedules
                </h2>
                <p className="text-xs text-slate-500">
                  คัดลอกโค้ดนี้ไปวางใน Apps Script ของคุณเพื่อรองรับการบันทึกตารางเวร
                </p>
              </div>
            </div>

            <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-y-auto flex-1 relative mb-4">
              <button
                onClick={handleCopyScript}
                className="sticky top-0 float-right px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md transition-colors"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ดทั้งหมด'}</span>
              </button>
              <pre className="whitespace-pre-wrap">{APPS_SCRIPT_CODE_TEMPLATE}</pre>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setIsShowScriptModal(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
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
