import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  FileSpreadsheet,
  Filter,
  GripVertical,
  MapPin,
  Plus,
  Printer,
  Search,
  Shield,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { DutyPoint, EmployeeDirectoryItem, Personnel } from './types';
import { PersonnelImportExportModal } from './PersonnelImportExportModal';

interface PersonnelManagementProps {
  personnel: Personnel[];
  dutyPoints: DutyPoint[];
  onAddPersonnel: (person: Omit<Personnel, 'db_id'>) => Promise<void>;
  onUpdatePersonnel: (person: Personnel) => Promise<void>;
  onDeletePersonnel: (db_id: number) => Promise<void>;
  onSearchEmployeeDirectory: (q: string) => Promise<EmployeeDirectoryItem[]>;
  onReorderPersonnel: (reordered: Personnel[]) => Promise<void>;
  onBatchImportPersonnel?: (imported: Personnel[], replace: boolean) => Promise<void>;
  showToast?: (msg: string) => void;
}

export const PersonnelManagement: React.FC<PersonnelManagementProps> = ({
  personnel,
  dutyPoints,
  onAddPersonnel,
  onUpdatePersonnel,
  onDeletePersonnel,
  onSearchEmployeeDirectory,
  onReorderPersonnel,
  onBatchImportPersonnel,
  showToast = () => {},
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState<'all' | 'M' | 'F'>('all');
  const [filterRole, setFilterRole] = useState<'all' | 'duty' | 'inspector'>('all');
  const [filterPoint, setFilterPoint] = useState<string>('all');
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Personnel | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<Personnel | null>(null);

  // Add Form state with Employee Database Search
  const [empSearchInput, setEmpSearchInput] = useState('');
  const [empSearchResults, setEmpSearchResults] = useState<EmployeeDirectoryItem[]>([]);
  const [isSearchingEmp, setIsSearchingEmp] = useState(false);
  const [addForm, setAddForm] = useState({
    id: '',
    fname: '',
    lname: '',
    gender: 'M' as 'M' | 'F',
    position: '',
    dept: '',
    role: 'duty' as 'duty' | 'inspector',
    dutyPoint: '',
    pairNo: '1',
  });

  // Filtered & Sorted Personnel
  const filteredList = useMemo(() => {
    return personnel.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        p.fname.toLowerCase().includes(q) ||
        p.lname.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q) ||
        p.dept.toLowerCase().includes(q) ||
        (p.pairNo && p.pairNo.includes(q));

      const matchGender = filterGender === 'all' || p.gender === filterGender;
      const matchRole =
        filterRole === 'all' ||
        (filterRole === 'duty' ? !p.isInspector : p.isInspector);
      const matchPoint = filterPoint === 'all' || p.dutyPoint === filterPoint;

      return matchQ && matchGender && matchRole && matchPoint;
    });
  }, [personnel, searchQuery, filterGender, filterRole, filterPoint]);

  // Pagination
  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(filteredList.length / rowsPerPage);
  const paginatedList = useMemo(() => {
    if (rowsPerPage === 'all') return filteredList;
    const start = (currentPage - 1) * rowsPerPage;
    return filteredList.slice(start, start + rowsPerPage);
  }, [filteredList, currentPage, rowsPerPage]);

  // Drag and Drop Handler
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, db_id: number) => {
    e.dataTransfer.setData('text/plain', String(db_id));
    setDraggedId(db_id);
  };

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const sourceIdx = personnel.findIndex(p => p.db_id === draggedId);
    const targetIdx = personnel.findIndex(p => p.db_id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const updated = [...personnel];
    const [moved] = updated.splice(sourceIdx, 1);
    updated.splice(targetIdx, 0, moved);

    // Update orderIndex
    const reordered = updated.map((p, idx) => ({ ...p, orderIndex: idx + 1 }));
    await onReorderPersonnel(reordered);
    setDraggedId(null);
  };

  // Employee Directory Search inside Add Form
  const handleEmpSearch = async (val: string) => {
    setEmpSearchInput(val);
    if (val.trim().length < 2) {
      setEmpSearchResults([]);
      return;
    }
    setIsSearchingEmp(true);
    try {
      const results = await onSearchEmployeeDirectory(val);
      setEmpSearchResults(results);
    } catch {
      setEmpSearchResults([]);
    } finally {
      setIsSearchingEmp(false);
    }
  };

  const selectEmployee = (emp: EmployeeDirectoryItem) => {
    const parts = emp.full_name_thai.trim().split(/\s+/);
    const fn = parts[0] || '';
    const ln = parts.slice(1).join(' ') || '';
    const g = emp.gender === 'หญิง' || emp.gender === 'F' ? 'F' : 'M';

    setAddForm(prev => ({
      ...prev,
      id: emp.employee_id,
      fname: fn,
      lname: ln,
      gender: g,
      position: emp.position_thai,
      dept: emp.dept,
      dutyPoint: g === 'M' ? (dutyPoints.find(dp => dp.gender === 'M')?.name || '') : '',
    }));
    setEmpSearchInput(emp.full_name_thai);
    setEmpSearchResults([]);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.fname.trim()) return;

    await onAddPersonnel({
      id: addForm.id || `EMP${String(personnel.length + 1).padStart(3, '0')}`,
      fname: addForm.fname.trim(),
      lname: addForm.lname.trim(),
      gender: addForm.gender,
      position: addForm.position.trim(),
      dept: addForm.dept.trim(),
      status: 'active',
      canDuty: addForm.role === 'duty',
      isInspector: addForm.role === 'inspector',
      dutyPoint: addForm.role === 'duty' ? addForm.dutyPoint : '',
      pairNo: addForm.role === 'duty' ? addForm.pairNo : '',
      orderIndex: personnel.length + 1,
    });

    setIsAddModalOpen(false);
    setEmpSearchInput('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson) return;
    await onUpdatePersonnel(editingPerson);
    setEditingPerson(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPerson) return;
    await onDeletePersonnel(deletingPerson.db_id);
    setDeletingPerson(null);
  };

  // Print Personnel Verification List
  const handlePrintVerificationList = () => {
    window.print();
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Action Bar & Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหาชื่อ, ตำแหน่ง, สำนัก..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <select
            value={filterGender}
            onChange={e => {
              setFilterGender(e.target.value as any);
              setCurrentPage(1);
            }}
            className="text-xs font-medium border rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
          >
            <option value="all">เพศ (ทั้งหมด)</option>
            <option value="M">ชาย</option>
            <option value="F">หญิง</option>
          </select>

          <select
            value={filterRole}
            onChange={e => {
              setFilterRole(e.target.value as any);
              setCurrentPage(1);
            }}
            className="text-xs font-medium border rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
          >
            <option value="all">บทบาท (ทั้งหมด)</option>
            <option value="duty">เข้าเวร (ปฏิบัติงาน)</option>
            <option value="inspector">ผู้ตรวจเวร</option>
          </select>

          <select
            value={filterPoint}
            onChange={e => {
              setFilterPoint(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs font-medium border rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white max-w-[160px] truncate"
          >
            <option value="all">จุดอยู่เวร (ทั้งหมด)</option>
            {dutyPoints.map(dp => (
              <option key={dp.id} value={dp.name}>
                {dp.name}
              </option>
            ))}
          </select>

          <select
            value={rowsPerPage}
            onChange={e => {
              setRowsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10));
              setCurrentPage(1);
            }}
            className="text-xs font-medium border rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
          >
            <option value="all">แสดงทั้งหมด</option>
            <option value={10}>10 รายการ</option>
            <option value={20}>20 รายการ</option>
            <option value={50}>50 รายการ</option>
          </select>
        </div>

        {/* Buttons: Import/Export, Print & Add */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <button
            onClick={() => setIsImportExportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-600 transition-colors shadow-sm"
            title="นำเข้า / นำออก ข้อมูลบุคลากร (Excel CSV, JSON)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>นำเข้า / นำออกข้อมูล</span>
          </button>

          <button
            onClick={handlePrintVerificationList}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            title="พิมพ์บัญชีรายชื่อตรวจสอบบุคลากรปฏิบัติหน้าที่เวรยาม"
          >
            <Printer className="w-4 h-4 text-emerald-200" />
            <span>พิมพ์รายชื่อตรวจสอบ</span>
          </button>

          <button
            onClick={() => {
              setAddForm({
                id: '',
                fname: '',
                lname: '',
                gender: 'M',
                position: '',
                dept: '',
                role: 'duty',
                dutyPoint: dutyPoints.find(dp => dp.gender === 'M')?.name || '',
                pairNo: '1',
              });
              setEmpSearchInput('');
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มบุคลากร</span>
          </button>
        </div>
      </div>

      {/* Personnel Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase">
              <tr>
                <th className="p-3 text-center w-12">ลำดับ</th>
                <th className="p-3 text-center w-16">คู่ที่</th>
                <th className="p-3 min-w-[180px]">ชื่อ-สกุล</th>
                <th className="p-3">ตำแหน่ง</th>
                <th className="p-3">สำนัก/กอง</th>
                <th className="p-3 text-center w-16">เพศ</th>
                <th className="p-3">จุดอยู่เวร</th>
                <th className="p-3 text-center">บทบาท</th>
                <th className="p-3 text-center w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    ไม่พบข้อมูลบุคลากรที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                paginatedList.map((p, idx) => {
                  const globalIdx = (currentPage - 1) * (rowsPerPage === 'all' ? 0 : rowsPerPage) + idx + 1;
                  return (
                    <tr
                      key={p.db_id}
                      draggable
                      onDragStart={e => handleDragStart(e, p.db_id)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => handleDrop(e, p.db_id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-move group"
                      title="คลิกค้างแล้วลากเพื่อสลับลำดับ"
                    >
                      <td className="p-3 text-center text-slate-500 font-mono">
                        <div className="flex items-center justify-center gap-1">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span>{globalIdx}</span>
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        {p.isInspector ? (
                          <span className="text-slate-400">-</span>
                        ) : p.pairNo ? (
                          <span
                            className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full font-bold text-[11px] ${
                              p.gender === 'M'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
                            }`}
                          >
                            {p.pairNo}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {p.fname} {p.lname}
                        <span className="block text-[10px] font-normal text-slate-400">
                          ID: {p.id}
                        </span>
                      </td>

                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {p.position}
                      </td>

                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {p.dept}
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            p.gender === 'M'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                          }`}
                        >
                          {p.gender === 'M' ? 'ชาย' : 'หญิง'}
                        </span>
                      </td>

                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {p.isInspector ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          p.dutyPoint || <span className="text-slate-400 italic">ไม่ระบุ</span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        {p.isInspector ? (
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            ผู้ตรวจเวร
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            เข้าเวร
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingPerson(p)}
                            className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                            title="แก้ไขข้อมูล"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingPerson(p)}
                            className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                            title="ลบข้อมูล"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {rowsPerPage !== 'all' && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-500">
              หน้า {currentPage} จาก {totalPages} (ทั้งหมด {filteredList.length} คน)
            </span>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD PERSONNEL MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" /> เพิ่มบุคลากรเข้าสู่ระบบเวรยาม
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick search from directory */}
            <div className="relative mb-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                🔍 ค้นหาด่วนจากฐานข้อมูลพนักงานเทศบาล
              </label>
              <input
                type="text"
                value={empSearchInput}
                onChange={e => handleEmpSearch(e.target.value)}
                placeholder="พิมพ์ชื่อ หรือ รหัสพนักงานเพื่อดึงข้อมูลอัตโนมัติ..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />

              {empSearchResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {empSearchResults.map(emp => (
                    <button
                      key={emp.employee_id}
                      type="button"
                      onClick={() => selectEmployee(emp)}
                      className="w-full text-left p-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-b-0 text-xs"
                    >
                      <div className="font-bold text-blue-900 dark:text-blue-300">
                        {emp.full_name_thai}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {emp.position_thai} • {emp.dept} ({emp.employee_id})
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">ชื่อ (รวมคำนำหน้า)</label>
                  <input
                    required
                    type="text"
                    value={addForm.fname}
                    onChange={e => setAddForm({ ...addForm, fname: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">นามสกุล</label>
                  <input
                    required
                    type="text"
                    value={addForm.lname}
                    onChange={e => setAddForm({ ...addForm, lname: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">ตำแหน่ง</label>
                  <input
                    required
                    type="text"
                    value={addForm.position}
                    onChange={e => setAddForm({ ...addForm, position: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">สำนัก/กอง</label>
                  <input
                    required
                    type="text"
                    value={addForm.dept}
                    onChange={e => setAddForm({ ...addForm, dept: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">เพศ</label>
                  <select
                    value={addForm.gender}
                    onChange={e => setAddForm({ ...addForm, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="M">ชาย</option>
                    <option value="F">หญิง</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">บทบาท</label>
                  <select
                    value={addForm.role}
                    onChange={e => setAddForm({ ...addForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="duty">เข้าเวร (ปฏิบัติงาน)</option>
                    <option value="inspector">ผู้ตรวจเวร</option>
                  </select>
                </div>
              </div>

              {addForm.role === 'duty' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">จัดอยู่คู่ที่ (ตัวเลข)</label>
                    <input
                      type="text"
                      value={addForm.pairNo}
                      onChange={e => setAddForm({ ...addForm, pairNo: e.target.value })}
                      placeholder="เช่น 1, 2"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  {addForm.gender === 'M' && (
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1">จุดประจำเวร</label>
                      <select
                        value={addForm.dutyPoint}
                        onChange={e => setAddForm({ ...addForm, dutyPoint: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs truncate"
                      >
                        <option value="">เลือกจุดเวร</option>
                        {dutyPoints
                          .filter(dp => dp.gender === 'M')
                          .map(dp => (
                            <option key={dp.id} value={dp.name}>
                              {dp.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold shadow-md shadow-emerald-700/30"
                >
                  บันทึกลงระบบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PERSONNEL MODAL */}
      {editingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" /> แก้ไขข้อมูลบุคลากร
              </h3>
              <button
                onClick={() => setEditingPerson(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">ชื่อ</label>
                  <input
                    required
                    type="text"
                    value={editingPerson.fname}
                    onChange={e => setEditingPerson({ ...editingPerson, fname: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">นามสกุล</label>
                  <input
                    required
                    type="text"
                    value={editingPerson.lname}
                    onChange={e => setEditingPerson({ ...editingPerson, lname: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">ตำแหน่ง</label>
                  <input
                    required
                    type="text"
                    value={editingPerson.position}
                    onChange={e => setEditingPerson({ ...editingPerson, position: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">สำนัก/กอง</label>
                  <input
                    required
                    type="text"
                    value={editingPerson.dept}
                    onChange={e => setEditingPerson({ ...editingPerson, dept: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">เพศ</label>
                  <select
                    value={editingPerson.gender}
                    onChange={e => setEditingPerson({ ...editingPerson, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="M">ชาย</option>
                    <option value="F">หญิง</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">บทบาท</label>
                  <select
                    value={editingPerson.isInspector ? 'inspector' : 'duty'}
                    onChange={e =>
                      setEditingPerson({
                        ...editingPerson,
                        isInspector: e.target.value === 'inspector',
                        canDuty: e.target.value === 'duty',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="duty">เข้าเวร (ปฏิบัติงาน)</option>
                    <option value="inspector">ผู้ตรวจเวร</option>
                  </select>
                </div>
              </div>

              {!editingPerson.isInspector && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">จัดอยู่คู่ที่</label>
                    <input
                      type="text"
                      value={editingPerson.pairNo || ''}
                      onChange={e => setEditingPerson({ ...editingPerson, pairNo: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">จุดประจำเวร</label>
                    <select
                      value={editingPerson.dutyPoint || ''}
                      onChange={e => setEditingPerson({ ...editingPerson, dutyPoint: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs truncate"
                    >
                      <option value="">เลือกจุดเวร</option>
                      {dutyPoints.map(dp => (
                        <option key={dp.id} value={dp.name}>
                          {dp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingPerson(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold shadow-md shadow-emerald-700/30"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deletingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700 text-center">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
              ยืนยันการลบบุคลากร
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              คุณต้องการลบ <strong>{deletingPerson.fname} {deletingPerson.lname}</strong> ออกจากระบบเวรยามใช่หรือไม่?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingPerson(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
      {/* IMPORT / EXPORT MODAL */}
      <PersonnelImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        personnel={personnel}
        filteredPersonnel={filteredList}
        dutyPoints={dutyPoints}
        onBatchImport={async (imported, replace) => {
          if (onBatchImportPersonnel) {
            await onBatchImportPersonnel(imported, replace);
          }
        }}
        showToast={showToast}
      />
    </div>
  );
};
