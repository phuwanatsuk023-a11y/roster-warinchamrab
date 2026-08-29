import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Database,
  Download,
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
} from 'lucide-react';
import { DutyPoint, Holiday, Personnel, RosterDay, SavedRosterScheduleRow } from './types';
import {
  formatThaiDate,
  generateMonthlyRoster,
  THAI_MONTHS,
  THAI_SHORT_MONTHS,
  toThaiNumeral,
} from './rosterEngine';
import { apiService } from './apiService';

interface PublicDutyCheckProps {
  personnel: Personnel[];
  dutyPoints: DutyPoint[];
  holidays: Holiday[];
  onOpenOfficerLogin: () => void;
}

export const PublicDutyCheck: React.FC<PublicDutyCheckProps> = ({
  personnel,
  dutyPoints,
  holidays,
  onOpenOfficerLogin,
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'my-duty' | 'today-overview'>('my-duty');

  // Schedule rows loaded directly from Google Sheet 'roster_schedules'
  const [scheduleRows, setScheduleRows] = useState<SavedRosterScheduleRow[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(false);
  const [isFromSheet, setIsFromSheet] = useState<boolean>(false);
  const [lastFetchedTime, setLastFetchedTime] = useState<string | null>(null);

  // Fetch schedule directly from Google Sheet 'roster_schedules' (no fallback generation if month has no data)
  const loadScheduleData = async (m: number, y: number) => {
    setIsLoadingSchedule(true);
    try {
      const rows = await apiService.getRosterSchedule(m + 1, y, 'ALL');
      if (rows && rows.length > 0) {
        setScheduleRows(rows);
        setIsFromSheet(true);
      } else {
        // หากเดือนไหนไม่มีข้อมูลในชีต ไม่ต้องแสดงข้อมูล
        setScheduleRows([]);
        setIsFromSheet(false);
      }
      setLastFetchedTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn('Error fetching roster_schedules from sheet:', err);
      setScheduleRows([]);
      setIsFromSheet(false);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  // Trigger data load when month, year change
  useEffect(() => {
    loadScheduleData(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  // Search autocomplete candidates
  const filteredPersonnelCandidates = useMemo(() => {
    if (!searchQuery.trim()) return personnel.slice(0, 8);
    const q = searchQuery.toLowerCase().trim();
    return personnel.filter(
      p =>
        p.fname.toLowerCase().includes(q) ||
        p.lname.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.dept.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q) ||
        (p.dutyPoint && p.dutyPoint.toLowerCase().includes(q))
    );
  }, [personnel, searchQuery]);

  // Selected person details
  const selectedPerson = useMemo(() => {
    return personnel.find(p => p.id === selectedPersonId);
  }, [personnel, selectedPersonId]);

  // Compute selected employee duty details directly from 'roster_schedules' rows
  const employeeDutyAssignments = useMemo(() => {
    if (!selectedPersonId || !selectedPerson) return [];

    const personName = `${selectedPerson.fname} ${selectedPerson.lname}`.trim();
    const matchedAssignments: {
      day: number;
      dateStr: string;
      dow: number;
      dutyPoint: string;
      roleName: string;
      timeSlot: string;
      partnerNames: string[];
      inspectorName: string;
      gender: 'M' | 'F';
    }[] = [];

    // Filter rows where selected employee is head, sub, sub2, or inspector
    scheduleRows.forEach(row => {
      let isAssigned = false;
      let role = '';

      if (row.head_id === selectedPersonId || (row.head_name && row.head_name.includes(selectedPerson.fname))) {
        isAssigned = true;
        role = 'หัวหน้าเวร';
      } else if (row.sub_id === selectedPersonId || (row.sub_name && row.sub_name.includes(selectedPerson.fname))) {
        isAssigned = true;
        role = 'ผู้ช่วยเวร (ลำดับ 1)';
      } else if (row.sub2_id === selectedPersonId || (row.sub2_name && row.sub2_name.includes(selectedPerson.fname))) {
        isAssigned = true;
        role = 'ผู้ช่วยเวร (ลำดับ 2)';
      } else if (
        row.inspector_id === selectedPersonId ||
        (row.inspector_name && row.inspector_name.includes(selectedPerson.fname))
      ) {
        isAssigned = true;
        role = 'ผู้ตรวจเวรประจำวัน';
      }

      if (isAssigned) {
        // Collect shift partners on this point
        const partners: string[] = [];
        if (row.head_name && row.head_id !== selectedPersonId) {
          partners.push(`1. ${row.head_name} (หน.เวร)`);
        }
        if (row.sub_name && row.sub_id !== selectedPersonId) {
          partners.push(`2. ${row.sub_name} (ผช.เวร)`);
        }
        if (row.sub2_name && row.sub2_id !== selectedPersonId) {
          partners.push(`3. ${row.sub2_name} (ผช.เวร)`);
        }

        const d = new Date(row.date_str || `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`);
        const dow = isNaN(d.getDay()) ? 0 : d.getDay();

        const isNightDuty = row.gender === 'M';
        const timeSlot = isNightDuty
          ? '18.00 - 06.00 น. (กลางคืน)'
          : '08.30 - 16.30 น. (กลางวัน วันหยุด)';

        matchedAssignments.push({
          day: row.day,
          dateStr: row.date_str || `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`,
          dow,
          dutyPoint: row.point_name,
          roleName: role,
          timeSlot,
          partnerNames: partners,
          inspectorName: row.inspector_name || 'ไม่มีผู้ตรวจเวร',
          gender: row.gender,
        });
      }
    });

    // Remove duplicates if same day/point and sort by day
    const uniqueAssignments = matchedAssignments.filter(
      (item, index, self) =>
        index === self.findIndex(t => t.day === item.day && t.dutyPoint === item.dutyPoint && t.roleName === item.roleName)
    );

    return uniqueAssignments.sort((a, b) => a.day - b.day);
  }, [scheduleRows, selectedPersonId, selectedPerson, selectedMonth, selectedYear]);

  // Today's On-Duty Summary from 'roster_schedules'
  const todayDay = currentDate.getDate();
  const isCurrentMonthYear =
    currentDate.getMonth() === selectedMonth && currentDate.getFullYear() === selectedYear;

  // Filter today's rows
  const todayRows = useMemo(() => {
    return scheduleRows.filter(r => r.day === todayDay);
  }, [scheduleRows, todayDay]);

  const todayMaleRows = useMemo(() => {
    return todayRows.filter(r => r.gender === 'M');
  }, [todayRows]);

  const todayFemaleRows = useMemo(() => {
    return todayRows.filter(r => r.gender === 'F');
  }, [todayRows]);

  // Today inspectors
  const todayMaleInspector = todayMaleRows.find(r => r.inspector_name)?.inspector_name || null;
  const todayFemaleInspector = todayFemaleRows.find(r => r.inspector_name)?.inspector_name || null;

  // Print Employee Duty Card Slip
  const handlePrintDutySlip = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hero Search & Notice Banner with Emerald Green Theme */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-emerald-700/40">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>บริการตรวจสอบข้อมูลการเข้าเวรสำหรับพนักงาน • เทศบาลเมืองวารินชำราบ</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            ตรวจสอบเวรยาม & ตารางปฏิบัติหน้าที่
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 mb-6 font-light">
            ค้นหาด้วยชื่อ-สกุล หรือ รหัสพนักงาน เพื่อดูวันเข้าเวร จุดประจำการ คู่เวรปฏิบัติงาน และผู้ตรวจเวรประจำเดือน
          </p>

          {/* Quick Search Box */}
          <div className="relative bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20 shadow-inner flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-200" />
              <input
                id="public-search-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="พิมพ์ชื่อ, สกุล, รหัสพนักงาน หรือ สังกัด..."
                className="w-full pl-11 pr-4 py-2.5 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
              />
            </div>

            {/* Month & Year Selectors */}
            <div className="flex gap-2">
              <select
                id="public-month-select"
                value={selectedMonth}
                onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
                aria-label="เลือกเดือนสำหรับตรวจสอบเวร"
                className="bg-emerald-950/80 text-white border border-emerald-600/50 text-xs sm:text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
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
                aria-label="เลือกปี พ.ศ. สำหรับตรวจสอบเวร"
                className="bg-emerald-950/80 text-white border border-emerald-600/50 text-xs sm:text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
              >
                {[2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>
                    {y + 543}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Selection Pills */}
          {filteredPersonnelCandidates.length > 0 && searchQuery.trim() && (
            <div className="mt-3 bg-white/95 rounded-xl p-2 text-slate-800 shadow-xl border border-slate-200 max-h-56 overflow-y-auto">
              <p className="text-[11px] font-semibold text-slate-500 uppercase px-2 py-1">
                คลิกเลือกรายชื่อเพื่อดูตารางเวร:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredPersonnelCandidates.map(p => (
                  <button
                    key={p.db_id}
                    onClick={() => {
                      setSelectedPersonId(p.id);
                      setSearchQuery(`${p.fname} ${p.lname}`);
                      setViewMode('my-duty');
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                      selectedPersonId === p.id
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : 'hover:bg-emerald-50 text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">
                        {p.fname} {p.lname}{' '}
                        <span className="text-[10px] opacity-80">({p.id})</span>
                      </div>
                      <div className={`text-[11px] ${selectedPersonId === p.id ? 'text-emerald-100' : 'text-slate-500'}`}>
                        {p.position} • {p.dept}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        p.gender === 'M' ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-100 text-teal-800'
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

      {/* Google Sheet Live Source & Refresh Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-3.5 rounded-2xl">
        <div className="flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
          <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>
            แหล่งข้อมูลตารางเวร:{' '}
            <strong className="font-bold text-emerald-800 dark:text-emerald-300">
              Google Sheet (sheet: roster_schedules)
            </strong>
          </span>
          {scheduleRows.length > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              ดึงข้อมูลจากชีตแล้ว ({scheduleRows.length} รายการ)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
              <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              ไม่มีข้อมูลตารางเวรในเดือนนี้ ({THAI_MONTHS[selectedMonth]} {selectedYear + 543})
            </span>
          )}
          {lastFetchedTime && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:inline">
              (อัปเดตล่าสุด: {lastFetchedTime} น.)
            </span>
          )}
        </div>

        <button
          onClick={() => loadScheduleData(selectedMonth, selectedYear)}
          disabled={isLoadingSchedule}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-slate-700 border border-emerald-300 dark:border-emerald-700 transition-all shadow-sm"
        >
          {isLoadingSchedule ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span>กำลังดึงข้อมูลชีต...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
              <span>รีเฟรชข้อมูลจาก Sheet</span>
            </>
          )}
        </button>
      </div>

      {/* Navigation Sub-Tabs (2 Menus Only: My Duty & Today Overview) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {/* MENU 1: ตารางเวรส่วนบุคคล */}
          <button
            id="tab-my-duty"
            onClick={() => setViewMode('my-duty')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              viewMode === 'my-duty'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <User className="w-4 h-4" />
            <span>ตารางเวรส่วนบุคคล</span>
          </button>

          {/* MENU 2: เวรประจำวันนี้ */}
          <button
            id="tab-today-overview"
            onClick={() => setViewMode('today-overview')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              viewMode === 'today-overview'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>
              เวรประจำวันนี้ ({todayDay} {THAI_MONTHS[selectedMonth]})
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            สำหรับเจ้าหน้าที่จัดเวร:
          </span>
          <button
            id="btn-switch-admin"
            onClick={onOpenOfficerLogin}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>เข้าสู่ระบบจัดการข้อมูล (Admin)</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: MY DUTY SCHEDULE (Data from Google Sheet 'roster_schedules') */}
      {viewMode === 'my-duty' && (
        <div>
          {scheduleRows.length === 0 ? (
            /* Empty State: No data in Google Sheet for selected month */
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <CalendarIcon className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  ไม่มีข้อมูลตารางเวรประจำเดือน {THAI_MONTHS[selectedMonth]} {selectedYear + 543}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  ระบบดึงข้อมูลตรงจากแผ่นงาน <span className="font-semibold text-emerald-700 dark:text-emerald-400">roster_schedules</span> ใน Google Sheet หากเดือนนี้ยังไม่มีการจัดตารางเวรหรือยังไม่ได้บันทึกข้อมูล ระบบจะไม่แสดงข้อมูลตารางเวร
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={onOpenOfficerLogin}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm transition-all"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบเพื่อจัดตารางเวรและบันทึกลง Sheet</span>
                </button>
              </div>
            </div>
          ) : !selectedPersonId ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto text-emerald-700 dark:text-emerald-300 mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                กรุณาค้นหาหรือเลือกชื่อบุคลากร
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                พิมพ์ชื่อ นามสกุล หรือคลิกเลือกจากรายชื่อด้านล่าง เพื่อดูรายละเอียดวันเข้าเวร จุดประจำการ และคู่เวรที่ดึงจากตารางชีต roster_schedules
              </p>

              <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                {personnel.slice(0, 8).map(p => (
                  <button
                    key={p.db_id}
                    onClick={() => {
                      setSelectedPersonId(p.id);
                      setSearchQuery(`${p.fname} ${p.lname}`);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-600 transition-colors"
                  >
                    {p.fname} {p.lname} ({p.dept})
                  </button>
                ))}
              </div>
            </div>
          ) : selectedPerson ? (
            <div className="space-y-6">
              {/* Person Summary Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl text-white shadow-md ${
                      selectedPerson.gender === 'M'
                        ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                        : 'bg-gradient-to-tr from-teal-600 to-emerald-500'
                    }`}
                  >
                    {selectedPerson.gender === 'M' ? 'ช' : 'ญ'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {selectedPerson.fname} {selectedPerson.lname}
                      </h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {selectedPerson.id}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                      {selectedPerson.position} • {selectedPerson.dept}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium">
                        {selectedPerson.isInspector ? 'กลุ่มผู้ตรวจเวร' : `คู่ที่ ${selectedPerson.pairNo || '-'}`}
                      </span>
                      {selectedPerson.dutyPoint && (
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {selectedPerson.dutyPoint}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-700">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      เวรประจำเดือน {THAI_MONTHS[selectedMonth]} {selectedYear + 543}
                    </p>
                    <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {employeeDutyAssignments.length}{' '}
                      <span className="text-sm font-normal text-slate-600 dark:text-slate-400">ผลัด/วัน</span>
                    </p>
                  </div>
                  <button
                    onClick={handlePrintDutySlip}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-800 hover:bg-emerald-700 text-white transition-colors shadow-sm"
                  >
                    <Printer className="w-4 h-4 text-emerald-200" />
                    <span>พิมพ์ใบนัดเวร</span>
                  </button>
                </div>
              </div>

              {/* Duty Shift Cards Grid from roster_schedules */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employeeDutyAssignments.length === 0 ? (
                  <div className="col-span-full bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-700 text-slate-500">
                    <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                      ไม่มีตารางเข้าเวรในเดือนนี้สำหรับ {selectedPerson.fname} {selectedPerson.lname}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      (บุคลากรหญิงจะเข้าเวรเฉพาะวันเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์ หรือท่านอาจอยู่ในสถานะงดเวร)
                    </p>
                  </div>
                ) : (
                  employeeDutyAssignments.map((assignment, idx) => {
                    const isWeekend = assignment.dow === 0 || assignment.dow === 6;
                    return (
                      <div
                        key={idx}
                        className={`rounded-2xl p-5 border transition-all hover:shadow-md bg-white dark:bg-slate-800 ${
                          assignment.day === todayDay && isCurrentMonthYear
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-500/10'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {/* Header of shift card */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                              ผลัดที่ {idx + 1}
                            </span>
                            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                              {formatThaiDate(assignment.dateStr, false, true)}
                            </h4>
                          </div>

                          {assignment.day === todayDay && isCurrentMonthYear ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 animate-pulse">
                              ปฏิบัติหน้าที่วันนี้
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                isWeekend
                                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][assignment.dow]}
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                          {/* Duty Point */}
                          <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-700/40 p-2.5 rounded-xl">
                            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="text-slate-400 block text-[10px]">จุดปฏิบัติหน้าที่:</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {assignment.dutyPoint}
                              </span>
                            </div>
                          </div>

                          {/* Time & Role */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-50 dark:bg-slate-700/40 p-2.5 rounded-xl">
                              <span className="text-slate-400 block text-[10px] flex items-center gap-1">
                                <Clock className="w-3 h-3" /> เวลาปฏิบัติงาน:
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {assignment.timeSlot}
                              </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-700/40 p-2.5 rounded-xl">
                              <span className="text-slate-400 block text-[10px] flex items-center gap-1">
                                <Shield className="w-3 h-3" /> บทบาทในเวร:
                              </span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                {assignment.roleName}
                              </span>
                            </div>
                          </div>

                          {/* Shift Partner */}
                          {assignment.partnerNames.length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-700/40 p-2.5 rounded-xl">
                              <span className="text-slate-400 block text-[10px] flex items-center gap-1">
                                <Users className="w-3 h-3" /> สมาชิกร่วมผลัด/คู่เวร:
                              </span>
                              <div className="font-medium text-slate-800 dark:text-slate-200 mt-1 space-y-0.5">
                                {assignment.partnerNames.map((partner, pIdx) => (
                                  <div key={pIdx} className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <span>{partner}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Inspector on duty */}
                          <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700">
                            <span>ผู้ตรวจเวรประจำวัน:</span>
                            <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                              {assignment.inspectorName}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Instructions box */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-5 text-xs text-emerald-950 dark:text-emerald-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-800 dark:text-emerald-300">
                  <AlertCircle className="w-4 h-4" />
                  <span>ข้อปฏิบัติในการเข้าเวรยาม เทศบาลเมืองวารินชำราบ</span>
                </div>
                <p>
                  1. เวรกลางคืน (ชาย): เริ่มปฏิบัติหน้าที่ตั้งแต่เวลา 18.00 - 06.00 น. ของวันรุ่งขึ้น ไม่เว้นวันหยุดราชการ
                </p>
                <p>
                  2. เวรกลางวัน (หญิง): เริ่มปฏิบัติหน้าที่ตั้งแต่เวลา 08.30 - 16.30 น. ในวันเสาร์ - อาทิตย์ และวันหยุดนักขัตฤกษ์
                </p>
                <p>
                  3. กรณีมีเหตุจำเป็นไม่สามารถมาปฏิบัติหน้าที่ได้ ให้ทำบันทึกขอเปลี่ยนเวรพร้อมลงลายมือชื่อผู้สับเปลี่ยน และเสนอผู้บังคับบัญชาอนุมัติตามระเบียบ
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* VIEW 2: TODAY ON-DUTY OVERVIEW (Data from Google Sheet 'roster_schedules') */}
      {viewMode === 'today-overview' && (
        <div className="space-y-6">
          {scheduleRows.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Clock className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  ไม่มีข้อมูลเวรประจำวันสำหรับเดือน {THAI_MONTHS[selectedMonth]} {selectedYear + 543}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  ไม่พบข้อมูลตารางเวรใน Google Sheet แผ่นงาน <span className="font-semibold text-emerald-700 dark:text-emerald-400">roster_schedules</span> สำหรับเดือนนี้ หากมีการบันทึกข้อมูลแล้ว สามารถกดปุ่ม "รีเฟรชข้อมูลจาก Sheet" เพื่อดึงข้อมูลล่าสุดได้ทันที
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={onOpenOfficerLogin}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm transition-all"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบเพื่อจัดตารางเวรและบันทึกลง Sheet</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                    REAL-TIME DUTY TODAY (จากชีต roster_schedules)
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    รายชื่อผู้ปฏิบัติหน้าที่เวรยามประจำวันนี้
                  </h2>
                  <p className="text-sm text-slate-500">
                    วันที่ {todayDay} {THAI_MONTHS[selectedMonth]} {selectedYear + 543}
                  </p>
                </div>
              </div>

              {/* Male Night Duty Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      เวรชาย (กลางคืน 18.00 - 06.00 น.)
                    </h3>
                    <p className="text-xs text-slate-500">
                      ผู้ตรวจเวรประจำวัน:{' '}
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {todayMaleInspector || 'ไม่มีผู้ตรวจเวร'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dutyPoints
                    .filter(p => p.gender === 'M')
                    .map(pt => {
                      const pointRows = todayMaleRows.filter(r => r.point_name === pt.name);
                      return (
                        <div
                          key={pt.id}
                          className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600"
                        >
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-2">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="truncate" title={pt.name}>
                              {pt.name}
                            </span>
                          </div>

                          {pointRows.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">ไม่มีข้อมูลเวรในจุดนี้วันนี้</p>
                          ) : (
                            <div className="space-y-2 text-xs">
                              {pointRows.map((row, uIdx) => (
                                <div
                                  key={uIdx}
                                  className="space-y-1 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm"
                                >
                                  {row.head_name && (
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-slate-900 dark:text-white">
                                        1. {row.head_name}
                                      </span>
                                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                                        (หน.เวร)
                                      </span>
                                    </div>
                                  )}
                                  {row.sub_name && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-700 dark:text-slate-300">
                                        2. {row.sub_name}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-medium">
                                        (ผช.เวร)
                                      </span>
                                    </div>
                                  )}
                                  {row.sub2_name && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-700 dark:text-slate-300">
                                        3. {row.sub2_name}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-medium">
                                        (ผช.เวร)
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

              {/* Female Day Duty Section (Weekend / Holiday) */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      เวรหญิง (กลางวัน 08.30 - 16.30 น. เสาร์-อาทิตย์ และวันหยุด)
                    </h3>
                    <p className="text-xs text-slate-500">
                      {todayFemaleRows.length > 0 ? (
                        <>
                          ผู้ตรวจเวรประจำวัน:{' '}
                          <span className="font-bold text-teal-700 dark:text-teal-400">
                            {todayFemaleInspector || 'ไม่มีผู้ตรวจเวร'}
                          </span>
                        </>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          วันนี้เป็นวันทำการปกติ (ไม่มีเวรหญิงกลางวัน)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {todayFemaleRows.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dutyPoints
                      .filter(p => p.gender === 'F')
                      .map(pt => {
                        const pointRows = todayFemaleRows.filter(r => r.point_name === pt.name);
                        return (
                          <div
                            key={pt.id}
                            className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600"
                          >
                            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300 mb-2">
                              <MapPin className="w-3.5 h-3.5 text-teal-600" />
                              <span className="truncate" title={pt.name}>
                                {pt.name}
                              </span>
                            </div>

                            {pointRows.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">ไม่มีข้อมูลเวรในจุดนี้วันนี้</p>
                            ) : (
                              <div className="space-y-2 text-xs">
                                {pointRows.map((row, uIdx) => (
                                  <div
                                    key={uIdx}
                                    className="space-y-1 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm"
                                  >
                                    {row.head_name && (
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                          1. {row.head_name}
                                        </span>
                                        <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold">
                                          (หน.เวร)
                                        </span>
                                      </div>
                                    )}
                                    {row.sub_name && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-700 dark:text-slate-300">
                                          2. {row.sub_name}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-medium">
                                          (ผช.เวร)
                                        </span>
                                      </div>
                                    )}
                                    {row.sub2_name && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-700 dark:text-slate-300">
                                          3. {row.sub2_name}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-medium">
                                          (ผช.เวร)
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
    </div>
  );
};
