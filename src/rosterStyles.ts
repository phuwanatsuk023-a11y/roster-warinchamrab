/**
 * ==============================================================================
 * ไฟล์กำหนดขนาดข้อความและรูปแบบตาราง (Typography & Styling Configuration)
 * สำหรับ: ตารางบัญชีรายชื่อเจ้าหน้าที่อยู่เวร-ยาม และผู้ตรวจเวร ประจำสำนักงานเทศบาลเมืองวารินชำราบ
 * ==============================================================================
 */

export type RosterFontSizePreset = 'compact' | 'normal' | 'large' | 'extralarge' | 'custom';

export interface RosterTypographySetting {
  id: string;
  name: string;
  description: string;
  fontSizePt: number;
  // หัวกระดาษและคำสั่ง
  docTitle: string;
  orderRef: string;
  monthTitle: string;
  clauseIntro: string;
  // องค์ประกอบในตาราง
  tableHeader: string;
  dateCell: string;
  personName: string;
  roleBadge: string;
  pairBadge: string;
  inspectorName: string;
  // ระยะห่างและขอบ
  cellPadding: string;
  lineSpacing: string;
  // สไตล์สำหรับการสั่งพิมพ์ (Print Specific Style)
  printFontSize: string;
  printHeaderSize: string;
}

export const DEFAULT_FONT_SIZE_PT = 11;

/**
 * คำนวณ Typography และ Style ตารางแบบไดนามิกตามขนาดตัวเลข pt (Custom Font Size)
 */
export function getDynamicTypographyByPt(fontSizePt: number): RosterTypographySetting {
  const pt = Math.max(8, Math.min(26, fontSizePt || DEFAULT_FONT_SIZE_PT));
  const headerPt = Math.round(pt * 1.3);
  const subPt = Math.round(pt * 0.9);

  return {
    id: `custom-${pt}`,
    name: `ขนาด ${pt} pt`,
    description: `ปรับแต่งขนาดตัวอักษรแบบกำหนดเอง ${pt} pt`,
    fontSizePt: pt,
    docTitle: pt >= 14 ? 'text-lg sm:text-xl font-bold' : pt >= 12 ? 'text-base sm:text-lg font-bold' : 'text-sm sm:text-base font-bold',
    orderRef: pt >= 13 ? 'text-sm' : 'text-xs',
    monthTitle: pt >= 14 ? 'text-base sm:text-lg font-bold' : pt >= 12 ? 'text-sm sm:text-base font-bold' : 'text-xs sm:text-sm font-bold',
    clauseIntro: pt >= 14 ? 'text-sm sm:text-base leading-relaxed' : 'text-xs sm:text-sm leading-normal',
    tableHeader: 'font-bold text-center',
    dateCell: 'font-bold text-center',
    personName: 'font-normal',
    roleBadge: pt >= 13 ? 'text-[11px] font-semibold' : 'text-[10px] font-semibold',
    pairBadge: 'text-[10px] font-semibold text-rose-600',
    inspectorName: 'font-medium text-center',
    cellPadding: pt >= 14 ? 'p-2.5' : pt >= 12 ? 'p-2' : 'p-1.5',
    lineSpacing: pt >= 13 ? 'space-y-1' : 'space-y-0.5',
    printFontSize: `${pt}pt`,
    printHeaderSize: `${headerPt}pt`,
  };
}

export const ROSTER_FONT_PRESETS: Record<string, RosterTypographySetting> = {
  compact: getDynamicTypographyByPt(9.5),
  normal: getDynamicTypographyByPt(11),
  large: getDynamicTypographyByPt(13),
  extralarge: getDynamicTypographyByPt(15),
};

export const DEFAULT_ROSTER_FONT_PRESET: RosterFontSizePreset = 'normal';

export function getRosterTypography(preset: RosterFontSizePreset = DEFAULT_ROSTER_FONT_PRESET): RosterTypographySetting {
  if (preset in ROSTER_FONT_PRESETS) {
    return ROSTER_FONT_PRESETS[preset];
  }
  return getDynamicTypographyByPt(DEFAULT_FONT_SIZE_PT);
}
