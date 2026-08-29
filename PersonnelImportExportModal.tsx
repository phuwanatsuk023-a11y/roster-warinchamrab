import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Info,
  Layers,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { DutyPoint, Personnel } from './types';

interface PersonnelImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnel: Personnel[];
  filteredPersonnel: Personnel[];
  dutyPoints: DutyPoint[];
  onBatchImport: (imported: Personnel[], replace: boolean) => Promise<void>;
  showToast: (msg: string) => void;
}

export const PersonnelImportExportModal: React.FC<PersonnelImportExportModalProps> = ({
  isOpen,
  onClose,
  personnel,
  filteredPersonnel,
  dutyPoints,
  onBatchImport,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');

  // IMPORT STATE
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [rawText, setRawText] = useState<string>('');
  const [parsedList, setParsedList] = useState<Personnel[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // EXPORT STATE
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'male' | 'female' | 'inspectors'>('all');

  if (!isOpen) return null;

  // ----------------------------------------------------
  // PARSE CSV / TEXT
  // ----------------------------------------------------
  const handleParseInput = (text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setParsedList([]);
      setParseErrors([]);
      return;
    }

    try {
      // Check if JSON format
      if (text.trim().startsWith('[') && text.trim().endsWith(']')) {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          const list: Personnel[] = json.map((item: any, idx: number) => ({
            db_id: Date.now() + idx,
            id: String(item.id || item.employee_id || `EMP${String(idx + 1).padStart(3, '0')}`),
            fname: String(item.fname || item.firstName || item.name || '').trim(),
            lname: String(item.lname || item.lastName || '').trim(),
            gender: (item.gender === 'F' || item.gender === 'หญิง' || item.gender === 'female' ? 'F' : 'M') as 'M' | 'F',
            position: String(item.position || item.position_thai || '').trim(),
            dept: String(item.dept || item.department || '').trim(),
            status: (item.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
            canDuty: item.canDuty !== undefined ? Boolean(item.canDuty) : (item.isInspector ? false : true),
            isInspector: Boolean(item.isInspector || item.role === 'inspector'),
            dutyPoint: String(item.dutyPoint || ''),
            pairNo: item.pairNo ? String(item.pairNo) : '1',
            orderIndex: idx + 1,
          })).filter(p => p.fname);

          setParsedList(list);
          setParseErrors([]);
          return;
        }
      }

      // Parse CSV / TSV lines
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length === 0) {
        setParsedList([]);
        return;
      }

      const results: Personnel[] = [];
      const errors: string[] = [];

      // Determine delimiter (comma or tab or semicolon)
      const firstLine = lines[0];
      let delimiter = ',';
      if (firstLine.includes('\t')) delimiter = '\t';
      else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

      // Check if first line is header
      const lowerFirst = firstLine.toLowerCase();
      const hasHeader =
        lowerFirst.includes('ชื่อ') ||
        lowerFirst.includes('fname') ||
        lowerFirst.includes('name') ||
        lowerFirst.includes('รหัส');

      const startIdx = hasHeader ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split CSV row while handling quoted strings
        const cols = splitCsvRow(line, delimiter);
        if (cols.length < 2) {
          errors.push(`บรรทัดที่ ${i + 1}: ข้อมูลไม่ครบถ้วน (${line.slice(0, 30)}...)`);
          continue;
        }

        // Expected columns template:
        // [0: ID, 1: Fname, 2: Lname, 3: Gender, 4: Position, 5: Dept, 6: Role/Inspector, 7: DutyPoint, 8: PairNo]
        // Or flexible: If 1st is Name "นายสมชาย ใจดี" or separate
        let id = cols[0]?.trim() || '';
        let fname = cols[1]?.trim() || '';
        let lname = cols[2]?.trim() || '';
        let genderStr = cols[3]?.trim() || '';
        let position = cols[4]?.trim() || '';
        let dept = cols[5]?.trim() || '';
        let roleStr = cols[6]?.trim() || '';
        let dutyPoint = cols[7]?.trim() || '';
        let pairNo = cols[8]?.trim() || '1';

        // If cols[0] doesn't look like ID, maybe cols[0] is Firstname
        if (!id.match(/^[A-Za-z0-9_-]+$/) && !fname) {
          fname = id;
          id = `EMP${String(results.length + 1).padStart(3, '0')}`;
        }

        // Split full name if lname is empty
        if (fname && !lname && fname.includes(' ')) {
          const parts = fname.split(/\s+/);
          fname = parts[0];
          lname = parts.slice(1).join(' ');
        }

        if (!fname) {
          errors.push(`บรรทัดที่ ${i + 1}: ไม่พบชื่อเจ้าหน้าที่`);
          continue;
        }

        const isFemale =
          genderStr === 'หญิง' ||
          genderStr.toLowerCase() === 'f' ||
          genderStr.toLowerCase() === 'female' ||
          fname.startsWith('นาง') ||
          fname.startsWith('น.ส.');
        const gender: 'M' | 'F' = isFemale ? 'F' : 'M';

        const isInspector =
          roleStr.includes('ตรวจ') ||
          roleStr.toLowerCase().includes('insp') ||
          roleStr === 'ผู้ตรวจเวร';

        // Auto assign default duty point if missing and not inspector
        if (!dutyPoint && !isInspector) {
          const defaultPoint = dutyPoints.find(dp => dp.gender === gender);
          if (defaultPoint) dutyPoint = defaultPoint.name;
        }

        results.push({
          db_id: Date.now() + i,
          id: id || `EMP${String(results.length + 1).padStart(3, '0')}`,
          fname: fname.trim(),
          lname: lname.trim(),
          gender,
          position: position.trim() || 'พนักงานเทศบาล',
          dept: dept.trim() || 'เทศบาลเมืองวารินชำราบ',
          status: 'active',
          canDuty: !isInspector,
          isInspector,
          dutyPoint: isInspector ? '' : dutyPoint.trim(),
          pairNo: isInspector ? '' : (pairNo.trim() || '1'),
          orderIndex: results.length + 1,
        });
      }

      setParsedList(results);
      setParseErrors(errors);
    } catch (err: any) {
      setParseErrors([`เกิดข้อผิดพลาดในการประมวลผล: ${err.message}`]);
      setParsedList([]);
    }
  };

  const splitCsvRow = (row: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  // ----------------------------------------------------
  // FILE UPLOAD HANDLER
  // ----------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      handleParseInput(content);
    };
    reader.readAsText(file);
  };

  // ----------------------------------------------------
  // SUBMIT IMPORT
  // ----------------------------------------------------
  const handleConfirmImport = async () => {
    if (parsedList.length === 0) return;
    setIsProcessing(true);
    try {
      await onBatchImport(parsedList, importMode === 'replace');
      showToast(`นำเข้าข้อมูลบุคลากรสำเร็จ ${parsedList.length} รายการ`);
      onClose();
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ----------------------------------------------------
  // DOWNLOAD CSV TEMPLATE
  // ----------------------------------------------------
  const handleDownloadTemplate = () => {
    const headers = [
      'รหัสบุคลากร',
      'ชื่อ',
      'นามสกุล',
      'เพศ',
      'ตำแหน่ง',
      'สำนัก_กอง',
      'บทบาท',
      'จุดอยู่เวร',
      'คู่เวรที่',
    ];

    const sampleRows = [
      [
        'EMP001',
        'สมชาย',
        'ใจดี',
        'ชาย',
        'นายช่างโยธาชำนาญงาน',
        'กองช่าง',
        'เข้าเวร',
        'สำนักงานเทศบาลเมืองวารินชำราบ',
        '1',
      ],
      [
        'EMP002',
        'วิชัย',
        'มั่นคง',
        'ชาย',
        'เจ้าพนักงานเทศกิจปฏิบัติงาน',
        'สำนักปลัดเทศบาล',
        'เข้าเวร',
        'สำนักงานเทศบาลเมืองวารินชำราบ',
        '1',
      ],
      [
        'EMP003',
        'ประเสริฐ',
        'มีโชค',
        'ชาย',
        'นักวิเคราะห์นโยบายและแผนชำนาญการ',
        'สำนักปลัดเทศบาล',
        'ผู้ตรวจเวร',
        '',
        '',
      ],
      [
        'EMP004',
        'สมศรี',
        'รักชาติ',
        'หญิง',
        'นักวิชาการคลังชำนาญการ',
        'กองคลัง',
        'เข้าเวร',
        'สำนักงานเทศบาลเมืองวารินชำราบ',
        '1',
      ],
      [
        'EMP005',
        'กาญจนา',
        'สุขเกษม',
        'หญิง',
        'เจ้าพนักงานธุรการชำนาญงาน',
        'กองสาธารณสุขและสิ่งแวดล้อม',
        'เข้าเวร',
        'ศูนย์บริการสาธารณสุขฯ แห่งที่ 2',
        '1',
      ],
    ];

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...sampleRows.map(row => row.map(v => `"${v}"`).join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'แม่แบบข้อมูลบุคลากร_เทศบาลเมืองวารินชำราบ.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('ดาวน์โหลดแม่แบบไฟล์ CSV เรียบร้อยแล้ว');
  };

  // ----------------------------------------------------
  // EXPORT HANDLER
  // ----------------------------------------------------
  const handleExportCSV = () => {
    let listToExport = personnel;
    if (exportScope === 'filtered') listToExport = filteredPersonnel;
    else if (exportScope === 'male') listToExport = personnel.filter(p => p.gender === 'M');
    else if (exportScope === 'female') listToExport = personnel.filter(p => p.gender === 'F');
    else if (exportScope === 'inspectors') listToExport = personnel.filter(p => p.isInspector);

    const headers = [
      'รหัสบุคลากร',
      'ชื่อ',
      'นามสกุล',
      'เพศ',
      'ตำแหน่ง',
      'สำนัก_กอง',
      'บทบาท',
      'จุดอยู่เวร',
      'คู่เวรที่',
      'สถานะ',
    ];

    const rows = listToExport.map(p => [
      p.id || '',
      p.fname || '',
      p.lname || '',
      p.gender === 'M' ? 'ชาย' : 'หญิง',
      p.position || '',
      p.dept || '',
      p.isInspector ? 'ผู้ตรวจเวร' : 'เข้าเวร',
      p.dutyPoint || '',
      p.pairNo || '',
      p.status === 'active' ? 'ปฏิบัติงานปกติ' : 'พักเวร/งดเวร',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map(row => row.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join(
        '\r\n'
      );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const todayStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `รายชื่อบุคลากร_เทศบาลเมืองวารินชำราบ_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`ส่งออกข้อมูลบุคลากรสำเร็จ (${listToExport.length} รายการ)`);
  };

  const handleExportJSON = () => {
    let listToExport = personnel;
    if (exportScope === 'filtered') listToExport = filteredPersonnel;
    else if (exportScope === 'male') listToExport = personnel.filter(p => p.gender === 'M');
    else if (exportScope === 'female') listToExport = personnel.filter(p => p.gender === 'F');
    else if (exportScope === 'inspectors') listToExport = personnel.filter(p => p.isInspector);

    const jsonStr = JSON.stringify(listToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const todayStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `รายชื่อบุคลากร_เทศบาลเมืองวารินชำราบ_${todayStr}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`ส่งออกไฟล์ JSON สำเร็จ (${listToExport.length} รายการ)`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">จัดการข้อมูลบุคลากร (นำเข้า / นำออก)</h2>
              <p className="text-xs text-emerald-200">
                รองรับไฟล์ Excel (.csv), คัดลอก-วางตาราง, และไฟล์ JSON พร้อมตัวอย่างแม่แบบ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-800 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>นำเข้าข้อมูล (Import CSV / Excel)</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'export'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-800 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>นำออกข้อมูล (Export CSV / JSON)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'import' ? (
            /* ================= IMPORT TAB ================= */
            <div className="space-y-4">
              {/* Template Download and Mode Selection Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                    ดาวน์โหลดแม่แบบเพื่อดูรูปแบบหัวคอลัมน์ที่ระบบรองรับ
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลดแม่แบบ CSV</span>
                </button>
              </div>

              {/* Mode: Append or Replace */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">รูปแบบการนำเข้า:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-slate-800 dark:text-slate-200">เพิ่มต่อท้ายรายการเดิม (Append)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-rose-700 dark:text-rose-400">แทนที่ข้อมูลทั้งหมด (Replace)</span>
                </label>
              </div>

              {/* File Upload Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  เลือกไฟล์จากเครื่อง (.csv, .txt, .json):
                </label>
                <input
                  type="file"
                  accept=".csv,.txt,.json"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-slate-700 dark:file:text-emerald-300 cursor-pointer border border-slate-300 dark:border-slate-600 rounded-xl p-1 bg-slate-50 dark:bg-slate-700"
                />
              </div>

              {/* Text Area for Pasting */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between items-center">
                  <span>หรือ วางข้อความ CSV / คัดลอกจาก Excel ลงในช่องนี้:</span>
                  {rawText && (
                    <button
                      type="button"
                      onClick={() => handleParseInput('')}
                      className="text-[11px] text-rose-500 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> ล้างข้อความ
                    </button>
                  )}
                </label>
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={e => handleParseInput(e.target.value)}
                  placeholder={`รหัสบุคลากร,ชื่อ,นามสกุล,เพศ,ตำแหน่ง,สำนัก_กอง,บทบาท,จุดอยู่เวร,คู่เวรที่\nEMP001,สมชาย,ใจดี,ชาย,นายช่างโยธา,กองช่าง,เข้าเวร,สำนักงานเทศบาลเมืองวารินชำราบ,1\nEMP002,ประเสริฐ,มีโชค,ชาย,นักวิเคราะห์ฯ,สำนักปลัด,ผู้ตรวจเวร,,`}
                  className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Errors & Warnings */}
              {parseErrors.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>แจ้งเตือนข้อผิดพลาดบางรายการ ({parseErrors.length} จุด):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto pl-1">
                    {parseErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview parsed records */}
              {parsedList.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>ตัวอย่างข้อมูลที่พร้อมนำเข้า ({parsedList.length} รายการ)</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      ชาย: {parsedList.filter(p => p.gender === 'M').length} | หญิง:{' '}
                      {parsedList.filter(p => p.gender === 'F').length} | ผู้ตรวจเวร:{' '}
                      {parsedList.filter(p => p.isInspector).length}
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-inner">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-700/80 sticky top-0 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2">ลำดับ</th>
                          <th className="p-2">ชื่อ - นามสกุล</th>
                          <th className="p-2">เพศ</th>
                          <th className="p-2">ตำแหน่ง / กอง</th>
                          <th className="p-2">บทบาท</th>
                          <th className="p-2">จุดเวร</th>
                          <th className="p-2">คู่ที่</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {parsedList.slice(0, 50).map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                            <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                            <td className="p-2 font-semibold text-slate-900 dark:text-white">
                              {p.fname} {p.lname}
                            </td>
                            <td className="p-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  p.gender === 'M'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                    : 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300'
                                }`}
                              >
                                {p.gender === 'M' ? 'ชาย' : 'หญิง'}
                              </span>
                            </td>
                            <td className="p-2 text-slate-600 dark:text-slate-400">
                              {p.position} ({p.dept})
                            </td>
                            <td className="p-2">
                              {p.isInspector ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 font-bold">
                                  ผู้ตรวจเวร
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-bold">
                                  เข้าเวร
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-slate-600 dark:text-slate-400 max-w-[120px] truncate">
                              {p.dutyPoint || '-'}
                            </td>
                            <td className="p-2 text-center font-bold text-rose-600">
                              {p.pairNo || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedList.length > 50 && (
                    <p className="text-[11px] text-slate-500 text-center">
                      ...แสดงตัวอย่าง 50 รายการแรกจากทั้งหมด {parsedList.length} รายการ
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ================= EXPORT TAB ================= */
            <div className="space-y-5">
              <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  เลือกขอบเขตข้อมูลที่ต้องการนำออก:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer hover:border-emerald-500 transition-colors">
                    <input
                      type="radio"
                      name="exportScope"
                      value="all"
                      checked={exportScope === 'all'}
                      onChange={() => setExportScope('all')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-900 dark:text-white">บุคลากรทั้งหมด</div>
                      <div className="text-[11px] text-slate-500">{personnel.length} รายชื่อ</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer hover:border-emerald-500 transition-colors">
                    <input
                      type="radio"
                      name="exportScope"
                      value="filtered"
                      checked={exportScope === 'filtered'}
                      onChange={() => setExportScope('filtered')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-900 dark:text-white">เฉพาะที่กรองอยู่</div>
                      <div className="text-[11px] text-slate-500">{filteredPersonnel.length} รายชื่อ</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer hover:border-emerald-500 transition-colors">
                    <input
                      type="radio"
                      name="exportScope"
                      value="male"
                      checked={exportScope === 'male'}
                      onChange={() => setExportScope('male')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-900 dark:text-white">เฉพาะเวรชาย (กลางคืน)</div>
                      <div className="text-[11px] text-slate-500">
                        {personnel.filter(p => p.gender === 'M').length} รายชื่อ
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer hover:border-emerald-500 transition-colors">
                    <input
                      type="radio"
                      name="exportScope"
                      value="female"
                      checked={exportScope === 'female'}
                      onChange={() => setExportScope('female')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-900 dark:text-white">เฉพาะเวรหญิง (กลางวัน)</div>
                      <div className="text-[11px] text-slate-500">
                        {personnel.filter(p => p.gender === 'F').length} รายชื่อ
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons for Export */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="p-4 rounded-xl border-2 border-emerald-600/30 hover:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 text-left transition-all group flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                      แนะนำสำหรับ Excel
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600">
                      ส่งออกเป็นไฟล์ Excel CSV (.csv)
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      เข้ารหัส UTF-8 พร้อม BOM เปิดใน Microsoft Excel ภาษาไทยไม่เพี้ยน
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="p-4 rounded-xl border-2 border-blue-600/30 hover:border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 text-left transition-all group flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      สำหรับสำรองข้อมูล
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600">
                      ส่งออกเป็นไฟล์ JSON (.json)
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      โครงสร้างข้อมูลครบถ้วน สำหรับสำรองข้อมูลหรือนำเข้าข้ามระบบ
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            ปิดหน้าต่าง
          </button>

          {activeTab === 'import' && (
            <button
              type="button"
              disabled={parsedList.length === 0 || isProcessing}
              onClick={handleConfirmImport}
              className={`px-5 py-2 text-xs font-bold rounded-xl text-white flex items-center gap-1.5 shadow-md transition-all ${
                parsedList.length === 0 || isProcessing
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>
                {isProcessing
                  ? 'กำลังนำเข้า...'
                  : `ยืนยันการนำเข้าข้อมูล (${parsedList.length} รายการ)`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
