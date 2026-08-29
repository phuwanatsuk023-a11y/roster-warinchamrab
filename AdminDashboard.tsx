import React from 'react';
import {
  AlertTriangle,
  Building,
  Calendar,
  CalendarOff,
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  MapPin,
  Moon,
  Plus,
  Shield,
  Sun,
  UserCheck,
  Users,
} from 'lucide-react';
import { DutyPoint, Holiday, Personnel } from './types';

interface AdminDashboardProps {
  personnel: Personnel[];
  dutyPoints: DutyPoint[];
  holidays: Holiday[];
  userCount?: number;
  onNavigate: (tab: string) => void;
  onOpenAddPersonnel: () => void;
  onOpenAddHoliday: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  personnel,
  dutyPoints,
  holidays,
  userCount = 0,
  onNavigate,
  onOpenAddPersonnel,
  onOpenAddHoliday,
}) => {
  const activePersonnel = personnel.filter(p => p.status === 'active');
  const males = activePersonnel.filter(p => p.gender === 'M');
  const females = activePersonnel.filter(p => p.gender === 'F');

  // Duty vs Inspector breakdown
  const dutyGuards = activePersonnel.filter(p => p.canDuty && !p.isInspector);
  const maleDuty = dutyGuards.filter(p => p.gender === 'M').length;
  const femaleDuty = dutyGuards.filter(p => p.gender === 'F').length;

  const inspectors = activePersonnel.filter(p => p.isInspector);
  const maleInspectors = inspectors.filter(p => p.gender === 'M').length;
  const femaleInspectors = inspectors.filter(p => p.gender === 'F').length;

  const malePoints = dutyPoints.filter(p => p.gender === 'M').length;
  const femalePoints = dutyPoints.filter(p => p.gender === 'F').length;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthHolidays = holidays.filter(h => {
    const d = new Date(h.holiday_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Officer Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-2xl p-6 border border-emerald-700/50 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/60 text-emerald-200 text-xs font-semibold mb-2 border border-emerald-500/40">
            <Shield className="w-3.5 h-3.5 text-emerald-300" />
            <span>ศูนย์ควบคุมระบบจัดเวรยาม (Admin Management Hub)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            แดชบอร์ดสรุปยอดบุคลากรและสถิติเวรยาม
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1">
            เทศบาลเมืองวารินชำราบ • ตรวจสอบความพร้อมของบุคลากร จัดคู่เวร และพิมพ์คำสั่ง
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2.5">
          <button
            onClick={() => onNavigate('admin-users')}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 transition-all"
          >
            <Shield className="w-4 h-4 text-emerald-200" />
            <span>จัดการผู้ใช้ ({userCount})</span>
          </button>
          <button
            onClick={onOpenAddPersonnel}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-md border border-emerald-500/40 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มบุคลากรเข้าเวร</span>
          </button>
          <button
            onClick={() => onNavigate('admin-roster')}
            className="px-4 py-2.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
          >
            <FileText className="w-4 h-4 text-emerald-900" />
            <span>สร้าง & พิมพ์ตารางเวร</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Guards (Male & Female) */}
        <div
          onClick={() => onNavigate('admin-personnel')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">บุคลากรทั้งหมด</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
            {activePersonnel.length}{' '}
            <span className="text-xs font-normal text-slate-500">คน</span>
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs font-medium">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">ชาย {males.length}</span>
            <span className="text-slate-300">•</span>
            <span className="text-teal-600 dark:text-teal-400 font-bold">หญิง {females.length}</span>
          </div>
        </div>

        {/* Active Duty Guards */}
        <div
          onClick={() => onNavigate('admin-personnel')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ผู้เข้าเวร (ปฏิบัติงาน)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-2">
            {dutyGuards.length}{' '}
            <span className="text-xs font-normal text-slate-500">คน</span>
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs font-medium">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">ชาย {maleDuty}</span>
            <span className="text-slate-300">•</span>
            <span className="text-teal-600 dark:text-teal-400 font-bold">หญิง {femaleDuty}</span>
          </div>
        </div>

        {/* Inspectors */}
        <div
          onClick={() => onNavigate('admin-personnel')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-teal-500 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ผู้ตรวจเวร</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-teal-800 dark:text-teal-300 mt-2">
            {inspectors.length}{' '}
            <span className="text-xs font-normal text-slate-500">คน</span>
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs font-medium">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">ชาย {maleInspectors}</span>
            <span className="text-slate-300">•</span>
            <span className="text-teal-600 dark:text-teal-400 font-bold">หญิง {femaleInspectors}</span>
          </div>
        </div>

        {/* Duty Points & Holidays */}
        <div
          onClick={() => onNavigate('admin-duty-points')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">จุดประจำเวร & วันหยุด</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-700 mt-2">
            {dutyPoints.length}{' '}
            <span className="text-xs font-normal text-slate-500">จุดเวร</span>
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs font-medium">
            <span className="text-slate-700 font-semibold">ช {malePoints} / ญ {femalePoints}</span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-600 font-bold">วันหยุด {monthHolidays.length} วัน</span>
          </div>
        </div>
      </div>

      {/* Duty Points Overview & Quick Roster Launch */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Male Duty Points Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                จุดเวรชาย (กลางคืน ทุกวัน 18.00 - 06.00 น.)
              </h3>
            </div>
            <button
              onClick={() => onNavigate('admin-duty-points')}
              className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-bold"
            >
              จัดการจุดเวร
            </button>
          </div>

          <div className="space-y-2">
            {dutyPoints
              .filter(p => p.gender === 'M')
              .map((pt, idx) => {
                const count = personnel.filter(p => p.dutyPoint === pt.name && p.status === 'active').length;
                return (
                  <div
                    key={pt.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-xs"
                  >
                    <div className="flex items-center gap-2.5 font-medium text-slate-800 dark:text-slate-200">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{pt.name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-bold text-[11px]">
                      {count} คน
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Female Duty Points Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-teal-600"></div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                จุดเวรหญิง (กลางวัน วันหยุด 08.30 - 16.30 น.)
              </h3>
            </div>
            <button
              onClick={() => onNavigate('admin-duty-points')}
              className="text-xs text-teal-700 dark:text-teal-400 hover:underline font-bold"
            >
              จัดการจุดเวร
            </button>
          </div>

          <div className="space-y-2">
            {dutyPoints
              .filter(p => p.gender === 'F')
              .map((pt, idx) => {
                return (
                  <div
                    key={pt.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-xs"
                  >
                    <div className="flex items-center gap-2.5 font-medium text-slate-800 dark:text-slate-200">
                      <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold text-[10px]">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{pt.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">เข้าเวรตามผลัด</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

