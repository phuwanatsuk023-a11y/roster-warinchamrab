export interface Personnel {
  db_id: number;
  id: string; // employee_id e.g. EMP001
  fname: string;
  lname: string;
  gender: 'M' | 'F';
  position: string;
  dept: string;
  status: 'active' | 'inactive';
  canDuty: boolean;
  isInspector: boolean;
  dutyPoint: string;
  pairNo: string;
  orderIndex: number;
}

export interface DutyPoint {
  id: number;
  name: string;
  gender: 'M' | 'F';
  order_index?: number;
}

export interface Holiday {
  id: number;
  holiday_date: string; // YYYY-MM-DD
  name: string;
  type: 'official' | 'special';
}

export interface EmployeeDirectoryItem {
  employee_id: string;
  full_name_thai: string;
  gender: 'M' | 'F' | 'ชาย' | 'หญิง';
  position_thai: string;
  dept: string;
}

export interface RosterDayUnit {
  head: string | null; // employee_id
  sub: string | null;
  sub2?: string | null;
}

export interface RosterDay {
  day: number;
  dow: number; // 0 = Sunday, 6 = Saturday
  isOff: boolean;
  dateStr: string;
  unitsByPoint: Record<string, RosterDayUnit[]>;
  inspector: string | null;
}

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'superadmin' | 'admin' | 'officer';
  status: 'active' | 'inactive';
  createdAt?: string;
  lastLogin?: string;
}

export interface Settings {
  malePoints: number;
  femalePoints: number;
  headPerPoint: number;
  subPerPoint: number;
  appsScriptUrl: string;
  adminPasscode: string;
}

export interface SavedRosterScheduleRow {
  schedule_id?: string;
  year: number;
  year_th?: number;
  month: number;
  month_name?: string;
  gender: 'M' | 'F';
  date_str: string;
  day: number;
  day_of_week?: string;
  is_holiday?: boolean;
  point_name: string;
  head_id: string;
  head_name: string;
  head_position?: string;
  sub_id: string;
  sub_name: string;
  sub_position?: string;
  sub2_id?: string;
  sub2_name?: string;
  sub2_position?: string;
  inspector_id?: string;
  inspector_name?: string;
  inspector_position?: string;
  updated_at?: string;
}
