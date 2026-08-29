import React, { useState } from 'react';
import { MapPin, Moon, Plus, Sun, Trash2, X } from 'lucide-react';
import { DutyPoint } from './types';

interface DutyPointsManagementProps {
  dutyPoints: DutyPoint[];
  onAddDutyPoint: (name: string, gender: 'M' | 'F') => Promise<void>;
  onDeleteDutyPoint: (id: number) => Promise<void>;
}

export const DutyPointsManagement: React.FC<DutyPointsManagementProps> = ({
  dutyPoints,
  onAddDutyPoint,
  onDeleteDutyPoint,
}) => {
  const [maleInput, setMaleInput] = useState('');
  const [femaleInput, setFemaleInput] = useState('');
  const [deletingPoint, setDeletingPoint] = useState<DutyPoint | null>(null);

  const malePoints = dutyPoints.filter(p => p.gender === 'M');
  const femalePoints = dutyPoints.filter(p => p.gender === 'F');

  const handleAddMale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maleInput.trim()) return;
    await onAddDutyPoint(maleInput.trim(), 'M');
    setMaleInput('');
  };

  const handleAddFemale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!femaleInput.trim()) return;
    await onAddDutyPoint(femaleInput.trim(), 'F');
    setFemaleInput('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> จัดการจุดประจำการอยู่เวรยาม
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          กำหนดจุดประจำการของเวรชาย (กลางคืน ทุกวัน) และ เวรหญิง (กลางวัน เสาร์-อาทิตย์-วันหยุด)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Male Duty Points Manager */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-700 dark:text-emerald-400">
                <Moon className="w-4 h-4" />
                <span>จุดเวรชาย ({malePoints.length} จุด)</span>
              </div>
              <span className="text-xs text-slate-400">เข้าเวรทุกคืน</span>
            </div>

            <div className="space-y-2 mb-4">
              {malePoints.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">ยังไม่มีจุดเวรชาย</p>
              ) : (
                malePoints.map((pt, idx) => (
                  <div
                    key={pt.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 text-xs border border-slate-100 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2.5 font-medium text-slate-800 dark:text-slate-200">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <span>{pt.name}</span>
                    </div>
                    <button
                      onClick={() => setDeletingPoint(pt)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="ลบจุดเวร"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleAddMale} className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <input
              type="text"
              value={maleInput}
              onChange={e => setMaleInput(e.target.value)}
              placeholder="เพิ่มชื่อจุดเวรชายใหม่..."
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่ม</span>
            </button>
          </form>
        </div>

        {/* Female Duty Points Manager */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <div className="flex items-center gap-2 font-bold text-sm text-pink-700 dark:text-pink-400">
                <Sun className="w-4 h-4" />
                <span>จุดเวรหญิง ({femalePoints.length} จุด)</span>
              </div>
              <span className="text-xs text-slate-400">เข้าเวรวันหยุด</span>
            </div>

            <div className="space-y-2 mb-4">
              {femalePoints.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">ยังไม่มีจุดเวรหญิง</p>
              ) : (
                femalePoints.map((pt, idx) => (
                  <div
                    key={pt.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 text-xs border border-slate-100 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2.5 font-medium text-slate-800 dark:text-slate-200">
                      <span className="w-6 h-6 rounded-full bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 flex items-center justify-center font-bold text-xs">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{pt.name}</span>
                    </div>
                    <button
                      onClick={() => setDeletingPoint(pt)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="ลบจุดเวร"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleAddFemale} className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <input
              type="text"
              value={femaleInput}
              onChange={e => setFemaleInput(e.target.value)}
              placeholder="เพิ่มชื่อจุดเวรหญิงใหม่..."
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่ม</span>
            </button>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingPoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700 text-center">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
              ยืนยันการลบจุดเวร
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              คุณต้องการลบจุดเวร <strong>{deletingPoint.name}</strong> ใช่หรือไม่?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingPoint(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  await onDeleteDutyPoint(deletingPoint.id);
                  setDeletingPoint(null);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
