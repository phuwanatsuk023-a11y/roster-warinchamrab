import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Info,
  Loader2,
  MapPin,
  Moon,
  Printer,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Sun,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { DutyPoint, Holiday, Personnel, SavedRosterScheduleRow } from './types';
import { formatThaiDate, THAI_MONTHS } from './rosterEngine';
import { apiService } from './apiService';
import { WarinEmblem } from './warinLogo';

interface PublicDutyCheckProps {
  personnel?: Personnel[];
  dutyPoints?: DutyPoint[];
  holidays?: Holiday[];
  onOpenLogin?: () => void;
  onOpenOfficerLogin?: () => void;
}

interface GroupedDutyAssignment {
  day: number;
  dateStr: string;
  dow: number;
  isInspector: boolean;
  roleName: string;
  timeSlot: string;
  gender: 'M' | 'F';
  // If regular duty: single point; if inspector: array of all duty points inspected that day
  dutyPoints: string[];
  partnerNames: string[];
  inspectorName?: string;
  pointsDetail?: {
    point: string;
    headName?: string;
    subName?: string;
    sub2Name?: string;
  }[];
}

export const PublicDutyCheck: React.FC<PublicDutyCheckProps> = ({
  personnel = [],
  dutyPoints = [],
  holidays = [],
  onOpenLogin,
  onOpenOfficerLogin,
}) => {
  const handleOpenLogin = onOpenLogin || onOpenOfficerLogin || (() => {});
  const safePersonnel = Array.isArray(personnel) ? personnel : [];
  const safeDutyPoints = Array.isArray(dutyPoints) ? dutyPoints : [];
  const safeHolidays = Array.isArray(holidays) ? holidays : [];

  const currentDate = new Date();
  const currentDay = currentDate.getDate();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'my-duty' | 'today-overview'>('my-duty');

  // Filter option: Show from today onwards or show entire month
  const [showFromTodayOnly, setShowFromTodayOnly] = useState<boolean>(true);

  // Schedule rows loaded directly from Google Sheet 'roster_schedules'
  const [scheduleRows, setScheduleRows] = useState<SavedRosterScheduleRow[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<string>('กำลังเชื่อมต่อ Google Apps Script...');
  const [showLoadingModal, setShowLoadingModal] = useState<boolean>(false);

  // Fetch schedule directly from Google Sheet with sleek progress bar modal
  const loadScheduleData = async (m: number, y: number, showModal = true) => {
    if (showModal) {
      setShowLoadingModal(true);
    }
    setIsLoadingSchedule(true);
    setProgressPercent(15);
    setProgressStage('กำลังเชื่อมต่อฐานข้อมูล Google Apps Script...');

    try {
      const step1Timer = setTimeout(() => {
        setProgressPercent(45);
        setProgressStage('กำลังอ่านข้อมูลจากแผ่นงาน roster_schedules...');
      }, 250);

      const step2Timer = setTimeout(() => {
        setProgressPercent(78);
        setProgressStage('กำลังประมวลผลและจัดกลุ่มข้อมูลตารางเวร...');
      }, 500);

      const rows = await apiService.getRosterSchedule(m + 1, y, 'ALL');

      clearTimeout(step1Timer);
      clearTimeout(step2Timer);

      setProgressPercent(100);
      setProgressStage('โหลดข้อมูลสำเร็จ เรียบร้อยแล้ว!');

      if (rows && rows.length > 0) {
        setScheduleRows(rows);
      } else {
        setScheduleRows([]);
      }

      setTimeout(() => {
        setIsLoadingSchedule(false);
        if (showModal) {
          setShowLoadingModal(false);
        }
      }, 500);
    } catch (err) {
      console.warn('Error fetching roster_schedules:', err);
      setProgressPercent(100);
      setProgressStage('โหลดข้อมูลจากหน่วยความจำชั่วคราว');
      setScheduleRows([]);
      setTimeout(() => {
        setIsLoadingSchedule(false);
        if (showModal) {
          setShowLoadingModal(false);
        }
      }, 600);
    }
  };

  // Initial load on component mount or month/year change: AUTO-TRIGGER Loading Modal on first start
  useEffect(() => {
    loadScheduleData(selectedMonth, selectedYear, true);
  }, [selectedMonth, selectedYear]);

  // Autocomplete candidate search
  const filteredPersonnelCandidates = useMemo(() => {
    if (!searchQuery.trim()) return safePersonnel.slice(0, 8);
    const q = searchQuery.toLowerCase().trim();
    return safePersonnel.filter(
      p =>
        p.fname.toLowerCase().includes(q) ||
        p.lname.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.dept.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q) ||
        (p.dutyPoint && p.dutyPoint.toLowerCase().includes(q))
    );
  }, [safePersonnel, searchQuery]);

  // Selected person details
  const selectedPerson = useMemo(() => {
    return safePersonnel.find(p => p.id === selectedPersonId);
  }, [safePersonnel, selectedPersonId]);

  // Check if viewing the current month and year
  const isCurrentMonthViewing = selectedMonth === currentMonth && selectedYear === currentYear;

  // Process and group employee assignments:
  // 1. Filter >= today if requested
  // 2. If inspector, combine all inspection points for the same date into a SINGLE item WITH staff details
  const employeeDutyAssignments = useMemo(() => {
    if (!selectedPersonId || !selectedPerson) return [];

    const personFname = selectedPerson.fname.trim();
    const dayMap = new Map<number, GroupedDutyAssignment>();

    scheduleRows.forEach(row => {
      // Check if selected person is in this row
      const isHead = row.head_id === selectedPersonId || (row.head_name && row.head_name.includes(personFname));
      const isSub1 = row.sub_id === selectedPersonId || (row.sub_name && row.sub_name.includes(personFname));
      const isSub2 = row.sub2_id === selectedPersonId || (row.sub2_name && row.sub2_name.includes(personFname));
      const isInspector =
        row.inspector_id === selectedPersonId || (row.inspector_name && row.inspector_name.includes(personFname));

      if (!isHead && !isSub1 && !isSub2 && !isInspector) return;

      const day = row.day;
      const dateStr =
        row.date_str ||
        `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(dateStr);
      const dow = isNaN(d.getDay()) ? 0 : d.getDay();
      const isNightDuty = row.gender === 'M';
      const timeSlot = isNightDuty
        ? '18.00 - 06.00 น. (กลางคืน)'
        : '08.30 - 16.30 น. (กลางวัน วันหยุด)';

      if (isInspector) {
        // GROUP INSPECTOR DUTIES FOR THE SAME DAY INTO ONE CARD
        if (dayMap.has(day)) {
          const existing = dayMap.get(day)!;
          if (!existing.dutyPoints.includes(row.point_name)) {
            existing.dutyPoints.push(row.point_name);
          }
          if (existing.pointsDetail) {
            existing.pointsDetail.push({
              point: row.point_name,
              headName: row.head_name || undefined,
              subName: row.sub_name || undefined,
              sub2Name: row.sub2_name || undefined,
            });
          }
        } else {
          dayMap.set(day, {
            day,
            dateStr,
            dow,
            isInspector: true,
            roleName: 'ผู้ตรวจเวรประจำวัน',
            timeSlot,
            gender: row.gender,
            dutyPoints: [row.point_name],
            partnerNames: [],
            pointsDetail: [
              {
                point: row.point_name,
                headName: row.head_name || undefined,
                subName: row.sub_name || undefined,
                sub2Name: row.sub2_name || undefined,
              },
            ],
          });
        }
      } else {
        // Regular duty officer (Head or Assistant)
        let role = 'เจ้าหน้าที่เวร';
        if (isHead) role = 'หัวหน้าเวร';
        else if (isSub1) role = 'ผู้ช่วยเวร (ลำดับ 1)';
        else if (isSub2) role = 'ผู้ช่วยเวร (ลำดับ 2)';

        const partners: string[] = [];
        if (row.head_name && row.head_id !== selectedPersonId && !row.head_name.includes(personFname)) {
          partners.push(`1. ${row.head_name} (หน.เวร)`);
        }
        if (row.sub_name && row.sub_id !== selectedPersonId && !row.sub_name.includes(personFname)) {
          partners.push(`2. ${row.sub_name} (ผช.เวร)`);
        }
        if (row.sub2_name && row.sub2_id !== selectedPersonId && !row.sub2_name.includes(personFname)) {
          partners.push(`3. ${row.sub2_name} (ผช.เวร)`);
        }

        dayMap.set(day, {
          day,
          dateStr,
          dow,
          isInspector: false,
          roleName: role,
          timeSlot,
          gender: row.gender,
          dutyPoints: [row.point_name],
          partnerNames: partners,
          inspectorName: row.inspector_name || 'ไม่มีผู้ตรวจเวร',
        });
      }
    });

    let list = Array.from(dayMap.values()).sort((a, b) => a.day - b.day);

    // Apply "From Today Onwards" filter if selected & viewing current month
    if (showFromTodayOnly && isCurrentMonthViewing) {
      list = list.filter(item => item.day >= currentDay);
    }

    return list;
  }, [
    scheduleRows,
    selectedPersonId,
    selectedPerson,
    selectedMonth,
    selectedYear,
    showFromTodayOnly,
    isCurrentMonthViewing,
    currentDay,
  ]);

  // Today's On-Duty Summary
  const todayRows = useMemo(() => {
    return scheduleRows.filter(r => r.day === currentDay);
  }, [scheduleRows, currentDay]);

  const todayMaleRows = useMemo(() => {
    return todayRows.filter(r => r.gender === 'M');
  }, [todayRows]);

  const todayFemaleRows = useMemo(() => {
    return todayRows.filter(r => r.gender === 'F');
  }, [todayRows]);

  const todayMaleInspector = todayMaleRows.find(r => r.inspector_name)?.inspector_name || null;
  const todayFemaleInspector = todayFemaleRows.find(r => r.inspector_name)?.inspector_name || null;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* 1. Header / Hero Card - Clean Modern Blue & White Palette (Mobile Optimized) */}
      <div className="bg-gradient-to-br from-sky-700 via-sky-600 to-blue-700 text-white rounded-3xl p-4 sm:p-7 shadow-lg shadow-sky-900/15 relative overflow-hidden border border-sky-400/30">
        {/* Soft background glow */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-sky-300/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          {/* Top Bar with Logo & Municipality Badge */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <WarinEmblem className="w-11 h-11 sm:w-12 sm:h-12 ring-2 ring-white/40 shadow-sm flex-shrink-0" />
              <div>
                <span className="text-[11px] sm:text-xs font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-white/20 text-sky-100 backdrop-blur-sm border border-white/20 inline-block">
                  เทศบาลเมืองวารินชำราบ
                </span>
                <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight mt-0.5">
                  ระบบตรวจสอบเวรยาม
                </h1>
              </div>
            </div>

            {/* Quick Refresh Button with Loading Modal */}
            <button
              onClick={() => loadScheduleData(selectedMonth, selectedYear, true)}
              disabled={isLoadingSchedule}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold backdrop-blur-md border border-white/20 transition-all shadow-sm"
              title="รีเฟรชข้อมูลจาก Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSchedule ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">รีเฟรช</span>
            </button>
          </div>

          <p className="text-xs sm:text-sm text-sky-100/90 font-normal leading-relaxed mb-4">
            ค้นหาตารางเวรส่วนบุคคล จุดปฏิบัติงาน รายชื่อผู้อยู่เวร และผู้ตรวจเวรประจำวัน
          </p>

          {/* Search Box & Month-Year Filters */}
          <div className="bg-white p-2 rounded-2xl shadow-md border border-sky-100 flex flex-col sm:flex-row gap-2">
            {/* Search Input with Touch-Friendly sizing */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-600" />
              <input
                id="public-search-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="พิมพ์ชื่อ, สกุล หรือรหัสพนักงาน..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-sky-50/50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Month & Year Selectors for Mobile */}
            <div className="grid grid-cols-2 sm:flex gap-2">
              <select
                id="public-month-select"
                value={selectedMonth}
                onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
                aria-label="เลือกเดือน"
                className="w-full sm:w-auto bg-sky-50 text-sky-950 font-bold border border-sky-200 text-xs sm:text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                {THAI_MONTHS.map((m, idx) => (
                  <option key={idx} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                id="public-year-select"
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                aria-label="เลือกปี พ.ศ."
                className="w-full sm:w-auto bg-sky-50 text-sky-950 font-bold border border-sky-200 text-xs sm:text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                {[2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>
                    {y + 543}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Autocomplete Candidate Chips */}
          {filteredPersonnelCandidates.length > 0 && searchQuery.trim() && (
            <div className="mt-2.5 bg-white rounded-2xl p-2.5 text-slate-800 shadow-xl border border-sky-100 max-h-56 overflow-y-auto">
              <p className="text-[11px] font-bold text-sky-700 px-2 py-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> เลือกรายชื่อเพื่อดูตารางเวร:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                {filteredPersonnelCandidates.map(p => (
                  <button
                    key={p.db_id}
                    onClick={() => {
                      setSelectedPersonId(p.id);
                      setSearchQuery(`${p.fname} ${p.lname}`);
                      setViewMode('my-duty');
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all ${
                      selectedPersonId === p.id
                        ? 'bg-sky-600 text-white font-bold shadow-sm'
                        : 'hover:bg-sky-50 bg-slate-50/70 text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm">
                        {p.fname} {p.lname}
                      </div>
                      <div
                        className={`text-[11px] ${selectedPersonId === p.id ? 'text-sky-100' : 'text-slate-500'}`}
                      >
                        {p.position} • {p.dept}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        p.gender === 'M' ? 'bg-sky-100 text-sky-800' : 'bg-pink-100 text-pink-800'
                      }`}
                    >
                      {p.gender === 'M' ? 'ชาย' : 'หญิง'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Essential Navigation Tabs (Mobile-First: Only 2 essential tabs) */}
      <div className="flex items-center justify-between gap-2 border-b border-sky-100 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {/* TAB 1: ตารางเวรของฉัน */}
          <button
            id="tab-my-duty"
            onClick={() => setViewMode('my-duty')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
              viewMode === 'my-duty'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-50 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <User className="w-4 h-4" />
            <span>ตารางเวรของฉัน</span>
          </button>

          {/* TAB 2: เวรวันนี้ */}
          <button
            id="tab-today-overview"
            onClick={() => setViewMode('today-overview')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
              viewMode === 'today-overview'
                ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-50 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>เวรวันนี้ ({currentDay} {THAI_MONTHS[currentMonth]})</span>
          </button>
        </div>

        {/* Admin Login Link */}
        <button
          onClick={handleOpenLogin}
          className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-slate-800 hover:bg-sky-100 border border-sky-200 dark:border-slate-700 transition-all"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>เจ้าหน้าที่ (Admin)</span>
        </button>
      </div>

      {/* 3. VIEW 1: ตารางเวรส่วนบุคคล (Personal Duty View) */}
      {viewMode === 'my-duty' && (
        <div className="space-y-4">
          {scheduleRows.length === 0 && !isLoadingSchedule ? (
            /* Empty State: No data in Google Sheet for selected month */
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 text-center border border-sky-100 dark:border-slate-700 shadow-sm space-y-3">
              <div className="w-14 h-14 bg-sky-50 dark:bg-sky-950/40 rounded-2xl flex items-center justify-center mx-auto text-sky-600 border border-sky-100">
                <CalendarIcon className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  ไม่มีข้อมูลตารางเวรประจำเดือน {THAI_MONTHS[selectedMonth]} {selectedYear + 543}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ระบบดึงข้อมูลจากชีต roster_schedules หากมีการจัดตารางเวรแล้ว สามารถกดปุ่มรีเฟรชเพื่ออัปเดตข้อมูลได้
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => loadScheduleData(selectedMonth, selectedYear, true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>รีเฟรชข้อมูลจาก Sheet</span>
                </button>
              </div>
            </div>
          ) : !selectedPersonId ? (
            /* Prompt to pick a person */
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 text-center border border-sky-100 dark:border-slate-700 shadow-sm">
              <div className="w-14 h-14 bg-sky-100 dark:bg-sky-900/40 rounded-2xl flex items-center justify-center mx-auto text-sky-600 mb-3">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
                กรุณาค้นหาหรือเลือกชื่อของคุณ
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
                พิมพ์ชื่อ-สกุล หรือแตะเลือกจากรายชื่อบุคลากรด้านล่าง เพื่อดูวันเข้าเวรและจุดประจำการ
              </p>

              <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                {safePersonnel.slice(0, 10).map(p => (
                  <button
                    key={p.db_id}
                    onClick={() => {
                      setSelectedPersonId(p.id);
                      setSearchQuery(`${p.fname} ${p.lname}`);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-sky-50 dark:bg-slate-700 text-sky-900 dark:text-sky-200 hover:bg-sky-600 hover:text-white border border-sky-200/70 dark:border-slate-600 transition-all shadow-2xs"
                  >
                    {p.fname} {p.lname} ({p.dept})
                  </button>
                ))}
              </div>
            </div>
          ) : selectedPerson ? (
            <div className="space-y-4">
              {/* Personnel Summary Card */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-6 border border-sky-100 dark:border-slate-700 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-md ${
                        selectedPerson.gender === 'M'
                          ? 'bg-gradient-to-tr from-sky-600 to-blue-600'
                          : 'bg-gradient-to-tr from-pink-500 to-rose-500'
                      }`}
                    >
                      {selectedPerson.gender === 'M' ? 'ช' : 'ญ'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                          {selectedPerson.fname} {selectedPerson.lname}
                        </h2>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200">
                          {selectedPerson.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {selectedPerson.position} • {selectedPerson.dept}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-slate-700 text-sky-700 dark:text-sky-300 font-medium">
                          {selectedPerson.isInspector ? 'กลุ่มผู้ตรวจเวร' : `คู่ที่ ${selectedPerson.pairNo || '-'}`}
                        </span>
                        {selectedPerson.dutyPoint && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-slate-700 text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {selectedPerson.dutyPoint}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Filter & Print Controls */}
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700">
                    {/* Toggle: From today onwards vs All days */}
                    {isCurrentMonthViewing && (
                      <button
                        onClick={() => setShowFromTodayOnly(!showFromTodayOnly)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          showFromTodayOnly
                            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        {showFromTodayOnly ? '📅 แสดงตั้งแต่วันนี้เป็นต้นไป' : '📆 แสดงทั้งหมดในเดือน'}
                      </button>
                    )}

                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all shadow-xs"
                      title="พิมพ์ใบนัดเวร"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">พิมพ์ใบนัด</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Duty Shift Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {employeeDutyAssignments.length === 0 ? (
                  <div className="col-span-full bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 text-center border border-sky-100 dark:border-slate-700 text-slate-500">
                    <Info className="w-8 h-8 text-sky-400 mx-auto mb-2" />
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                      ไม่มีตารางเข้าเวรที่ต้องปฏิบัติหน้าที่ {showFromTodayOnly && isCurrentMonthViewing ? '(ตั้งแต่วันนี้เป็นต้นไป)' : ''}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {showFromTodayOnly && isCurrentMonthViewing ? (
                        <button
                          onClick={() => setShowFromTodayOnly(false)}
                          className="text-sky-600 underline font-semibold hover:text-sky-700 mt-1 inline-block"
                        >
                          แตะที่นี่เพื่อดูเวรย้อนหลังที่ผ่านมาในเดือนนี้
                        </button>
                      ) : (
                        'บุคลากรหญิงจะเข้าเวรเฉพาะวันเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์ หรือท่านอาจอยู่ในสถานะงดเวร'
                      )}
                    </p>
                  </div>
                ) : (
                  employeeDutyAssignments.map((assignment, idx) => {
                    const isToday = assignment.day === currentDay && isCurrentMonthViewing;
                    const isWeekend = assignment.dow === 0 || assignment.dow === 6;

                    return (
                      <div
                        key={idx}
                        className={`rounded-2xl p-4 sm:p-5 border transition-all bg-white dark:bg-slate-800 shadow-sm hover:shadow-md ${
                          isToday
                            ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/20 dark:bg-sky-950/20'
                            : 'border-sky-100 dark:border-slate-700'
                        }`}
                      >
                        {/* Header of Shift Card */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide">
                              ผลัดที่ {idx + 1}
                            </span>
                            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
                              {formatThaiDate(assignment.dateStr, false, true)}
                            </h4>
                          </div>

                          {isToday ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-sky-600 text-white shadow-xs animate-pulse flex-shrink-0">
                              ปฏิบัติหน้าที่วันนี้
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex-shrink-0 ${
                                isWeekend
                                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][assignment.dow]}
                            </span>
                          )}
                        </div>

                        {/* Details Content */}
                        <div className="space-y-2.5 text-xs">
                          {/* Role and Time */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="bg-sky-50/80 dark:bg-slate-700/50 p-2.5 rounded-xl border border-sky-100/50">
                              <span className="text-slate-400 block text-[10px] font-medium flex items-center gap-1">
                                <Shield className="w-3 h-3 text-sky-600" /> บทบาทในเวร:
                              </span>
                              <span className="font-bold text-sky-900 dark:text-sky-300 truncate block mt-0.5">
                                {assignment.roleName}
                              </span>
                            </div>

                            <div className="bg-sky-50/80 dark:bg-slate-700/50 p-2.5 rounded-xl border border-sky-100/50">
                              <span className="text-slate-400 block text-[10px] font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3 text-sky-600" /> เวลาปฏิบัติงาน:
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                                {assignment.timeSlot.split(' ')[0]} น.
                              </span>
                            </div>
                          </div>

                          {/* If INSPECTOR: Show all combined inspection points for that day WITH Staff Names & Points */}
                          {assignment.isInspector ? (
                            <div className="bg-gradient-to-br from-sky-50 to-blue-50/60 dark:from-slate-700/60 dark:to-slate-700/40 p-3 rounded-xl border border-sky-200/70 dark:border-slate-600 space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-bold text-sky-900 dark:text-sky-200">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-sky-600" /> จุดตรวจ & ผู้อยู่เวรที่รับผิดชอบ ({assignment.dutyPoints.length} จุด):
                                </span>
                              </div>

                              <div className="space-y-2">
                                {assignment.pointsDetail && assignment.pointsDetail.length > 0 ? (
                                  assignment.pointsDetail.map((detail, pIdx) => (
                                    <div
                                      key={pIdx}
                                      className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-sky-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs shadow-2xs space-y-1"
                                    >
                                      {/* Duty Point Name */}
                                      <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-300">
                                        <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                          {pIdx + 1}
                                        </span>
                                        <span className="truncate">{detail.point}</span>
                                      </div>

                                      {/* Staff on Duty in this point */}
                                      <div className="pl-5 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                                        {detail.headName && (
                                          <div className="flex items-center justify-between">
                                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                                              1. {detail.headName}
                                            </span>
                                            <span className="text-[10px] text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-1 py-0.2 rounded font-bold">
                                              หน.เวร
                                            </span>
                                          </div>
                                        )}
                                        {detail.subName && (
                                          <div className="flex items-center justify-between">
                                            <span>2. {detail.subName}</span>
                                            <span className="text-[10px] text-slate-400">ผช.เวร</span>
                                          </div>
                                        )}
                                        {detail.sub2Name && (
                                          <div className="flex items-center justify-between">
                                            <span>3. {detail.sub2Name}</span>
                                            <span className="text-[10px] text-slate-400">ผช.เวร</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  assignment.dutyPoints.map((ptName, pIdx) => (
                                    <div
                                      key={pIdx}
                                      className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-sky-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs flex items-center gap-1.5 shadow-2xs"
                                    >
                                      <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                        {pIdx + 1}
                                      </span>
                                      <span className="truncate">{ptName}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ) : (
                            /* Regular Officer Stationed Point */
                            <div className="bg-sky-50/80 dark:bg-slate-700/50 p-2.5 rounded-xl border border-sky-100/50 flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <span className="text-slate-400 block text-[10px]">จุดปฏิบัติหน้าที่:</span>
                                <span className="font-bold text-slate-900 dark:text-white truncate block">
                                  {assignment.dutyPoints[0]}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Shift Partners */}
                          {!assignment.isInspector && assignment.partnerNames.length > 0 && (
                            <div className="bg-sky-50/80 dark:bg-slate-700/50 p-2.5 rounded-xl border border-sky-100/50">
                              <span className="text-slate-400 block text-[10px] font-medium flex items-center gap-1">
                                <Users className="w-3 h-3 text-sky-600" /> สมาชิกร่วมผลัด:
                              </span>
                              <div className="font-medium text-slate-800 dark:text-slate-200 mt-1 space-y-1">
                                {assignment.partnerNames.map((partner, pIdx) => (
                                  <div key={pIdx} className="flex items-center gap-1.5 text-[11px]">
                                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0"></div>
                                    <span className="truncate">{partner}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Inspector on duty (for regular shift) */}
                          {!assignment.isInspector && (
                            <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700">
                              <span>ผู้ตรวจเวร:</span>
                              <span className="font-bold text-sky-800 dark:text-sky-300 truncate max-w-[180px] text-right">
                                {assignment.inspectorName}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 4. VIEW 2: เวรประจำวันนี้ (Today On-Duty Overview) */}
      {viewMode === 'today-overview' && (
        <div className="space-y-4">
          {scheduleRows.length === 0 && !isLoadingSchedule ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 text-center border border-sky-100 dark:border-slate-700 shadow-sm space-y-3">
              <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto text-sky-600 border border-sky-100">
                <Clock className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  ไม่มีข้อมูลเวรประจำวันสำหรับเดือนนี้
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ไม่พบข้อมูลตารางเวรใน Google Sheet สามารถกดปุ่มรีเฟรชเพื่ออัปเดตข้อมูลล่าสุดได้
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => loadScheduleData(selectedMonth, selectedYear, true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>รีเฟรชข้อมูล</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-6 border border-sky-100 dark:border-slate-700 shadow-sm space-y-6">
              {/* Header Title */}
              <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200">
                  เวรประจำวันนี้
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                  รายชื่อผู้ปฏิบัติหน้าที่เวรยามประจำวัน
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  วันที่ {currentDay} {THAI_MONTHS[currentMonth]} {currentYear + 543}
                </p>
              </div>

              {/* Section 1: Male Night Duty (เวรชาย 18.00 - 06.00 น.) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-700 text-white flex items-center justify-center font-bold shadow-xs">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      เวรชาย (กลางคืน 18.00 - 06.00 น.)
                    </h3>
                    <p className="text-xs text-slate-500">
                      ผู้ตรวจเวรประจำวัน:{' '}
                      <span className="font-bold text-sky-700 dark:text-sky-400">
                        {todayMaleInspector || 'ไม่มีผู้ตรวจเวร'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {safeDutyPoints
                    .filter(p => p.gender === 'M')
                    .map(pt => {
                      const pointRows = todayMaleRows.filter(r => r.point_name === pt.name);
                      return (
                        <div
                          key={pt.id}
                          className="bg-sky-50/60 dark:bg-slate-700/50 rounded-2xl p-3.5 border border-sky-100 dark:border-slate-600"
                        >
                          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900 dark:text-sky-200 mb-2">
                            <MapPin className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                            <span className="truncate" title={pt.name}>
                              {pt.name}
                            </span>
                          </div>

                          {pointRows.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">ไม่มีข้อมูลเวรในจุดนี้</p>
                          ) : (
                            <div className="space-y-1.5 text-xs">
                              {pointRows.map((row, uIdx) => (
                                <div
                                  key={uIdx}
                                  className="space-y-1 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-sky-100 dark:border-slate-700 shadow-2xs"
                                >
                                  {row.head_name && (
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        1. {row.head_name}
                                      </span>
                                      <span className="text-[10px] text-sky-700 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-950 px-1.5 py-0.5 rounded">
                                        หน.เวร
                                      </span>
                                    </div>
                                  )}
                                  {row.sub_name && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-700 dark:text-slate-300">
                                        2. {row.sub_name}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-medium">
                                        ผช.เวร
                                      </span>
                                    </div>
                                  )}
                                  {row.sub2_name && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-700 dark:text-slate-300">
                                        3. {row.sub2_name}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-medium">
                                        ผช.เวร
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Section 2: Female Day Duty (เวรหญิง 08.30 - 16.30 น. วันหยุด) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-pink-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      เวรหญิง (กลางวัน 08.30 - 16.30 น. เสาร์-อาทิตย์ และวันหยุด)
                    </h3>
                    <p className="text-xs text-slate-500">
                      {todayFemaleRows.length > 0 ? (
                        <>
                          ผู้ตรวจเวรประจำวัน:{' '}
                          <span className="font-bold text-pink-700 dark:text-pink-400">
                            {todayFemaleInspector || 'ไม่มีผู้ตรวจเวร'}
                          </span>
                        </>
                      ) : (
                        <span className="text-sky-700 dark:text-sky-400 font-medium">
                          วันนี้เป็นวันทำการปกติ (ไม่มีเวรหญิงกลางวัน)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {todayFemaleRows.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {safeDutyPoints
                      .filter(p => p.gender === 'F')
                      .map(pt => {
                        const pointRows = todayFemaleRows.filter(r => r.point_name === pt.name);
                        return (
                          <div
                            key={pt.id}
                            className="bg-pink-50/50 dark:bg-slate-700/50 rounded-2xl p-3.5 border border-pink-100 dark:border-slate-600"
                          >
                            <div className="flex items-center gap-1.5 text-xs font-bold text-pink-900 dark:text-pink-200 mb-2">
                              <MapPin className="w-3.5 h-3.5 text-pink-600 flex-shrink-0" />
                              <span className="truncate" title={pt.name}>
                                {pt.name}
                              </span>
                            </div>

                            {pointRows.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-2">ไม่มีข้อมูลเวรในจุดนี้</p>
                            ) : (
                              <div className="space-y-1.5 text-xs">
                                {pointRows.map((row, uIdx) => (
                                  <div
                                    key={uIdx}
                                    className="space-y-1 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-pink-100 dark:border-slate-700 shadow-2xs"
                                  >
                                    {row.head_name && (
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-900 dark:text-white">
                                          1. {row.head_name}
                                        </span>
                                        <span className="text-[10px] text-pink-700 dark:text-pink-400 font-bold bg-pink-50 dark:bg-pink-950 px-1.5 py-0.5 rounded">
                                          หน.เวร
                                        </span>
                                      </div>
                                    )}
                                    {row.sub_name && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-700 dark:text-slate-300">
                                          2. {row.sub_name}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-medium">
                                          ผช.เวร
                                        </span>
                                      </div>
                                    )}
                                    {row.sub2_name && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-700 dark:text-slate-300">
                                          3. {row.sub2_name}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-medium">
                                          ผช.เวร
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. LOADING PROGRESS BAR MODAL (Modern Blue & White Modal) */}
      {showLoadingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-sky-100 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-600 dark:text-sky-400 flex-shrink-0">
                <WarinEmblem className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  กำลังโหลดข้อมูลตารางเวร
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  เทศบาลเมืองวารินชำราบ • Google Sheets
                </p>
              </div>
            </div>

            {/* Stage Text & Percentage */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                  {progressStage}
                </span>
                <span className="text-slate-600 dark:text-slate-400 font-bold">{progressPercent}%</span>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden p-0.5 border border-sky-100 dark:border-slate-600">
                <div
                  className="bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Sub-steps checklist */}
            <div className="bg-sky-50/70 dark:bg-slate-700/40 rounded-2xl p-3 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 border border-sky-100/70">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    progressPercent >= 30 ? 'text-sky-600' : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
                <span>ตรวจสอบการเชื่อมต่อ Google Apps Script API</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    progressPercent >= 60 ? 'text-sky-600' : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
                <span>ดึงข้อมูลตารางเวรจากชีต roster_schedules</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    progressPercent >= 100 ? 'text-sky-600' : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
                <span>ประมวลผลและจัดกลุ่มตารางเวรตามวันที่</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
