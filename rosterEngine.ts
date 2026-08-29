import { DutyPoint, Holiday, Personnel, RosterDay, RosterDayUnit } from './types';

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_SHORT_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const THAI_DAYS = [
  'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
];

export function toThaiNumeral(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return str.toString();
}

export function formatThaiDate(dateStr: string | null | undefined, short = false, includeDayName = false): string {
  if (!dateStr) return '-';
  const str = String(dateStr).trim();
  
  // Handle Date objects or timestamp strings formatted like ISO or Date toString
  let d: Date;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    d = new Date(y, m, day);
  } else {
    d = new Date(str);
  }

  if (isNaN(d.getTime())) return str;

  const year = d.getFullYear() + 543;
  const monthIdx = d.getMonth();
  const day = d.getDate();
  const dow = d.getDay();
  const month = short ? THAI_SHORT_MONTHS[monthIdx] : THAI_MONTHS[monthIdx];
  const dayPrefix = includeDayName ? `${THAI_DAYS[dow]}ที่ ` : '';

  return `${dayPrefix}${day} ${month} ${year}`;
}

export function getDutyUnitsForPoint(point: string, gender: 'M' | 'F', personnel: Personnel[]) {
  const people = personnel.filter(p => {
    if (p.gender !== gender || !p.canDuty || p.status !== 'active' || p.isInspector) return false;
    if (gender === 'M') return p.dutyPoint === point;
    return true;
  });

  const groups: Record<string, Personnel[]> = {};
  const singletons: Personnel[] = [];

  people.forEach(p => {
    if (p.pairNo && p.pairNo.trim() !== '') {
      if (!groups[p.pairNo]) groups[p.pairNo] = [];
      groups[p.pairNo].push(p);
    } else {
      singletons.push(p);
    }
  });

  // Sort defined pair numbers
  const sortedPairNos = Object.keys(groups).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  // Build preliminary units from sorted pairs
  const initialUnits: { id: string; label: string; members: Personnel[] }[] = sortedPairNos.map(pairNo => ({
    id: `pair_${pairNo}`,
    label: `คู่ที่ ${pairNo}`,
    members: groups[pairNo],
  }));

  // Append any persons without pairNo as single units initially
  singletons.forEach(s => {
    initialUnits.push({ id: `single_${s.id}`, label: 'เดี่ยว', members: [s] });
  });

  // Helper to determine if a person's role is Head (หน.เวร) or Sub (ผช.เวร)
  // Higher rank, executive, head of dept, officer vs operational/general worker
  const isHeadRole = (person: Personnel): boolean => {
    const pos = (person.position || '').toLowerCase();
    const subKeywords = ['ผู้ช่วย', 'คนงาน', 'พนักงานขับ', 'ดับเพลิง', 'จ้างทั่วไป', 'ประจำรถ'];
    const isSub = subKeywords.some(kw => pos.includes(kw));
    return !isSub;
  };

  // Check if we need merging for units that have only 1 person
  // Rule:
  // - If single member is Head (หน.เวร): merge into next adjacent pair (คู่ถัดไป)
  // - If single member is Sub (ผช.เวร): merge into previous adjacent pair (คู่ก่อนหน้าตัวเอง)
  if (initialUnits.length > 1) {
    const mergedUnits: { id: string; label: string; members: Personnel[] }[] = [];
    const skipIndices = new Set<number>();

    for (let i = 0; i < initialUnits.length; i++) {
      if (skipIndices.has(i)) continue;

      const unit = initialUnits[i];
      if (unit.members.length === 1) {
        const soloPerson = unit.members[0];
        const isHead = isHeadRole(soloPerson);

        if (isHead) {
          // หน.เวร -> ให้คู่ติดกันคู่ถัดไปมารวม (merge with next pair if exists)
          if (i + 1 < initialUnits.length) {
            const nextUnit = initialUnits[i + 1];
            // Combine solo Head with nextUnit members, putting Head first
            const combinedMembers = [soloPerson, ...nextUnit.members];
            mergedUnits.push({
              id: `${unit.id}_${nextUnit.id}`,
              label: `${unit.label} + ${nextUnit.label}`,
              members: combinedMembers,
            });
            skipIndices.add(i + 1);
            continue;
          }
        } else {
          // ผช.เวร -> ให้ไปรวมคู่ก่อนตัวเอง (merge into previous pair if exists)
          if (mergedUnits.length > 0) {
            const prevUnit = mergedUnits[mergedUnits.length - 1];
            // Append solo Sub to previous unit's members
            prevUnit.members.push(soloPerson);
            prevUnit.label = `${prevUnit.label} + ${unit.label}`;
            continue;
          }
        }
      }

      mergedUnits.push({ ...unit, members: [...unit.members] });
    }

    return mergedUnits;
  }

  return initialUnits;
}

export function generateMonthlyRoster(
  month: number, // 0 - 11
  year: number, // CE e.g. 2026
  gender: 'M' | 'F',
  personnel: Personnel[],
  dutyPoints: DutyPoint[],
  holidays: Holiday[],
  startingIndices: Record<string, number> = {},
  startingInspectorIndex = 0
): RosterDay[] {
  const activeDutyPoints = dutyPoints.filter(p => p.gender === gender).map(p => p.name);
  if (activeDutyPoints.length === 0) return [];

  const inspectors = personnel.filter(p => p.gender === gender && p.isInspector && p.status === 'active');
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const roster: RosterDay[] = [];

  // Setup starting cyclic indexes
  const pointUnits: Record<string, { id: string; label: string; members: Personnel[] }[]> = {};
  const pointCurrentIndex: Record<string, number> = {};

  activeDutyPoints.forEach(pt => {
    const rawUnits = getDutyUnitsForPoint(pt, gender, personnel);
    pointUnits[pt] = rawUnits;
    pointCurrentIndex[pt] = startingIndices[pt] !== undefined ? startingIndices[pt] : 0;
  });

  let inspIdx = startingInspectorIndex;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dow = date.getDay();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isHoliday = holidays.some(h => (h.holiday_date || '').startsWith(dateStr));
    const isOff = dow === 0 || dow === 6 || isHoliday;

    let isDutyDay = false;
    if (gender === 'M') {
      isDutyDay = true; // Male guards duty every night
    } else {
      if (isOff) isDutyDay = true; // Female guards duty on weekends & holidays
    }

    const dayEntry: RosterDay = {
      day: d,
      dow,
      isOff,
      dateStr,
      unitsByPoint: {},
      inspector: null,
    };

    if (isDutyDay) {
      activeDutyPoints.forEach(pt => {
        const units = pointUnits[pt] || [];
        if (units.length > 0) {
          const cIdx = pointCurrentIndex[pt] % units.length;
          const currentUnit = units[cIdx];
          const head = currentUnit.members[0] ? currentUnit.members[0].id : null;
          const sub = currentUnit.members[1] ? currentUnit.members[1].id : null;
          const sub2 = currentUnit.members[2] ? currentUnit.members[2].id : null;

          dayEntry.unitsByPoint[pt] = [{ head, sub, sub2 }];
          pointCurrentIndex[pt] = (pointCurrentIndex[pt] + 1) % units.length;
        } else {
          dayEntry.unitsByPoint[pt] = [];
        }
      });

      if (inspectors.length > 0) {
        dayEntry.inspector = inspectors[inspIdx % inspectors.length].id;
        inspIdx++;
      }
    }

    roster.push(dayEntry);
  }

  return roster;
}

export interface EmployeeDutyAssignment {
  dateStr: string;
  day: number;
  month: number;
  year: number;
  dow: number;
  isOff: boolean;
  role: 'head' | 'sub' | 'sub2' | 'inspector';
  roleName: string;
  dutyPoint: string;
  timeSlot: string;
  pairNo: string;
  partnerNames: string[];
  inspectorName: string;
}

export function getEmployeeDutyHistory(
  employeeId: string,
  month: number,
  year: number,
  personnel: Personnel[],
  dutyPoints: DutyPoint[],
  holidays: Holiday[]
): {
  person: Personnel | undefined;
  assignments: EmployeeDutyAssignment[];
  totalShifts: number;
} {
  const person = personnel.find(p => p.id === employeeId || p.fname.includes(employeeId) || p.lname.includes(employeeId));
  if (!person) return { person: undefined, assignments: [], totalShifts: 0 };

  const gender = person.gender;
  const roster = generateMonthlyRoster(month, year, gender, personnel, dutyPoints, holidays);
  const assignments: EmployeeDutyAssignment[] = [];

  roster.forEach(r => {
    if (person.isInspector && r.inspector === person.id) {
      assignments.push({
        dateStr: r.dateStr,
        day: r.day,
        month,
        year,
        dow: r.dow,
        isOff: r.isOff,
        role: 'inspector',
        roleName: 'ผู้ตรวจเวร',
        dutyPoint: 'ตรวจทุกจุดประจำการ',
        timeSlot: gender === 'M' ? '18.00 - 06.00 น. (กลางคืน)' : '08.30 - 16.30 น. (กลางวัน)',
        pairNo: '-',
        partnerNames: [],
        inspectorName: `${person.fname} ${person.lname}`,
      });
      return;
    }

    // Check duty units by point
    Object.keys(r.unitsByPoint).forEach(pt => {
      const units = r.unitsByPoint[pt] || [];
      units.forEach(u => {
        const isHead = u.head === person.id;
        const isSub = u.sub === person.id;
        const isSub2 = u.sub2 === person.id;

        if (isHead || isSub || isSub2) {
          const headPerson = personnel.find(p => p.id === u.head);
          const subPerson = personnel.find(p => p.id === u.sub);
          const sub2Person = personnel.find(p => p.id === u.sub2);
          const inspPerson = personnel.find(p => p.id === r.inspector);

          const allPartners: string[] = [];
          if (headPerson && headPerson.id !== person.id) allPartners.push(`${headPerson.fname} ${headPerson.lname} (หน.เวร)`);
          if (subPerson && subPerson.id !== person.id) allPartners.push(`${subPerson.fname} ${subPerson.lname} (ผช.เวร)`);
          if (sub2Person && sub2Person.id !== person.id) allPartners.push(`${sub2Person.fname} ${sub2Person.lname} (ผช.เวร)`);

          const roleName = isHead ? 'หัวหน้าเวร' : 'ผู้ช่วยเวร';
          const role = isHead ? 'head' : isSub ? 'sub' : 'sub2';

          assignments.push({
            dateStr: r.dateStr,
            day: r.day,
            month,
            year,
            dow: r.dow,
            isOff: r.isOff,
            role,
            roleName,
            dutyPoint: pt,
            timeSlot: gender === 'M' ? '18.00 - 06.00 น. (กลางคืน)' : '08.30 - 16.30 น. (กลางวัน)',
            pairNo: person.pairNo || '-',
            partnerNames: allPartners,
            inspectorName: inspPerson ? `${inspPerson.fname} ${inspPerson.lname}` : 'ไม่ระบุ',
          });
        }
      });
    });
  });

  return {
    person,
    assignments,
    totalShifts: assignments.length,
  };
}
