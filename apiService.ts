import { DutyPoint, EmployeeDirectoryItem, Holiday, Personnel, SavedRosterScheduleRow, Settings, UserAccount } from './types';
import {
  DEFAULT_SETTINGS,
  INITIAL_DUTY_POINTS,
  INITIAL_EMPLOYEE_DIRECTORY,
  INITIAL_HOLIDAYS,
  INITIAL_PERSONNEL,
  INITIAL_USERS,
} from './mockData';

const LS_KEY_PERSONNEL = 'roster_personnel_v2';
const LS_KEY_POINTS = 'roster_duty_points_v2';
const LS_KEY_HOLIDAYS = 'roster_holidays_v2';
const LS_KEY_SETTINGS = 'roster_settings_v2';
const LS_KEY_DIRECTORY = 'roster_emp_directory_v2';
const LS_KEY_USERS = 'roster_users_v2';
const LS_KEY_ROSTER_PREFIX = 'roster_schedule_saved_';

export const APPS_SCRIPT_CODE_TEMPLATE = `/**
 * Google Apps Script - API Backend สำหรับระบบจัดเวรยาม
 * วางโค้ดนี้ใน Extensions > Apps Script บน Google Sheet แล้ว Deploy as Web App
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet() ? SpreadsheetApp.getActiveSpreadsheet().getId() : '';

function getSheet(sheetName) {
  let ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss && SPREADSHEET_ID) {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    }
  } catch (e) {
    if (SPREADSHEET_ID) {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } else {
      throw new Error('Cannot open Active Spreadsheet');
    }
  }

  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // สร้างหัวตารางเริ่มต้น
    if (sheetName === 'guards') {
      sheet.appendRow(['db_id', 'employee_id', 'fname', 'lname', 'gender', 'position', 'department', 'status', 'can_duty', 'is_inspector', 'dutyPoint', 'pairNo', 'orderIndex', 'updated_at']);
    } else if (sheetName === 'duty_points') {
      sheet.appendRow(['id', 'name', 'gender', 'order_index']);
    } else if (sheetName === 'holidays') {
      sheet.appendRow(['id', 'holiday_date', 'name', 'type']);
    } else if (sheetName === 'employees') {
      sheet.appendRow(['employee_id', 'full_name_thai', 'gender', 'position_thai', 'dept']);
    } else if (sheetName === 'users') {
      sheet.appendRow(['id', 'username', 'password', 'name', 'role', 'status', 'created_at', 'last_login']);
    } else if (sheetName === 'roster_schedules') {
      sheet.appendRow([
        'schedule_id',
        'year',
        'year_th',
        'month',
        'month_name',
        'gender',
        'date_str',
        'day',
        'day_of_week',
        'is_holiday',
        'point_name',
        'head_id',
        'head_name',
        'head_position',
        'sub_id',
        'sub_name',
        'sub_position',
        'sub2_id',
        'sub2_name',
        'sub2_position',
        'inspector_id',
        'inspector_name',
        'inspector_position',
        'updated_at'
      ]);
    }
  }
  return sheet;
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'get_all';
  let result = { status: 'error', message: 'Invalid action' };

  try {
    switch (action) {
      case 'get_all':
        result = {
          status: 'success',
          personnel: getGuardsData(),
          dutyPoints: getDutyPointsData(),
          holidays: getHolidaysData(),
          employees: getEmployeeDirectoryData(),
          users: getUsersData()
        };
        break;
      case 'get_guards':
        result = getGuardsData();
        break;
      case 'get_duty_points':
        result = getDutyPointsData();
        break;
      case 'get_holidays':
        result = getHolidaysData();
        break;
      case 'get_users':
        result = getUsersData();
        break;
      case 'get_roster_schedule':
        const targetMonth = e && e.parameter && e.parameter.month !== undefined ? Number(e.parameter.month) : null;
        const targetYear = e && e.parameter && e.parameter.year !== undefined ? Number(e.parameter.year) : null;
        const targetGender = (e && e.parameter && e.parameter.gender) || '';
        result = getRosterScheduleData(targetMonth, targetYear, targetGender);
        break;
      case 'search_employee':
        const query = (e && e.parameter && e.parameter.q) || '';
        result = searchEmployeeData(query);
        break;
      default:
        result = { status: 'error', message: 'Action ' + action + ' not found' };
    }
  } catch (err) {
    result = { status: 'error', message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);

  let result = { status: 'error', message: 'Unknown error' };

  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (ex) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = (e && e.parameter && e.parameter.action) || payload.action;

    switch (action) {
      case 'add_guard':
        result = addGuard(payload);
        break;
      case 'edit_guard':
        result = editGuard(payload);
        break;
      case 'delete_guard':
        result = deleteGuard(payload.db_id);
        break;
      case 'sync_all_guards':
        result = syncAllGuards(payload.personnel || []);
        break;
      case 'add_duty_point':
        result = addDutyPoint(payload);
        break;
      case 'delete_duty_point':
        result = deleteDutyPoint(payload.id);
        break;
      case 'add_holiday':
        result = addHoliday(payload);
        break;
      case 'delete_holiday':
        result = deleteHoliday(payload.id);
        break;
      case 'sync_all_holidays':
        result = syncAllHolidays(payload.holidays || []);
        break;
      case 'sync_all_users':
        result = syncAllUsers(payload.users || []);
        break;
      case 'add_user':
        result = addUser(payload);
        break;
      case 'edit_user':
        result = editUser(payload);
        break;
      case 'delete_user':
        result = deleteUser(payload.id || payload.username);
        break;
      case 'save_roster':
      case 'save_roster_schedule':
        result = saveRosterSchedule(payload);
        break;
      case 'get_roster_schedule':
        result = getRosterScheduleData(payload.month, payload.year, payload.gender);
        break;
      default:
        result = { status: 'error', message: 'Action ' + action + ' not supported' };
    }
  } catch (err) {
    result = { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function addGuard(data) {
  const sheet = getSheet('guards');
  const lastRow = sheet.getLastRow();
  const dbId = lastRow <= 1 ? 1 : Number(sheet.getRange(lastRow, 1).getValue()) + 1;
  const parts = (data.full_name || (data.fname + ' ' + (data.lname || ''))).trim().split(/\\s+/);
  const fname = data.fname || parts[0] || '';
  const lname = data.lname || parts.slice(1).join(' ') || '';

  const newRow = [
    dbId,
    data.employee_id || data.id || ('EMP' + String(dbId).padStart(3, '0')),
    fname,
    lname,
    data.gender || 'M',
    data.position || '',
    data.department || data.dept || '',
    data.status || 'active',
    data.can_duty !== undefined ? (data.can_duty ? 1 : 0) : (data.canDuty ? 1 : 0),
    data.is_inspector !== undefined ? (data.is_inspector ? 1 : 0) : (data.isInspector ? 1 : 0),
    data.dutyPoint || '',
    data.pairNo || '',
    data.orderIndex || new Date().getTime(),
    new Date()
  ];

  sheet.appendRow(newRow);
  return { status: 'success', db_id: dbId, message: 'Guard added successfully' };
}

function getGuardsData() {
  const sheet = getSheet('guards');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    data.push({
      db_id: Number(r[0]),
      id: String(r[1] || 'EMP' + r[0]),
      fname: String(r[2] || ''),
      lname: String(r[3] || ''),
      gender: String(r[4]) === 'F' || String(r[4]) === 'หญิง' ? 'F' : 'M',
      position: String(r[5] || ''),
      dept: String(r[6] || ''),
      status: String(r[7] || 'active'),
      canDuty: Boolean(r[8] == 1 || r[8] === true || r[8] === '1'),
      isInspector: Boolean(r[9] == 1 || r[9] === true || r[9] === '1'),
      dutyPoint: String(r[10] || ''),
      pairNo: String(r[11] || ''),
      orderIndex: Number(r[12] || r[0])
    });
  }
  data.sort((a, b) => a.orderIndex - b.orderIndex);
  return data;
}

function editGuard(data) {
  const sheet = getSheet('guards');
  const rows = sheet.getDataRange().getValues();
  const dbId = Number(data.db_id);

  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === dbId) {
      const parts = (data.full_name || (data.fname + ' ' + (data.lname || ''))).trim().split(/\\s+/);
      const fname = data.fname || parts[0] || '';
      const lname = data.lname || parts.slice(1).join(' ') || '';
      const rowIndex = i + 1;

      sheet.getRange(rowIndex, 3, 1, 12).setValues([[
        fname,
        lname,
        data.gender || 'M',
        data.position || '',
        data.department || data.dept || '',
        data.status || 'active',
        data.can_duty !== undefined ? (data.can_duty ? 1 : 0) : (data.canDuty ? 1 : 0),
        data.is_inspector !== undefined ? (data.is_inspector ? 1 : 0) : (data.isInspector ? 1 : 0),
        data.dutyPoint || '',
        data.pairNo || '',
        data.orderIndex !== undefined ? data.orderIndex : rows[i][12],
        new Date()
      ]]);
      return { status: 'success', message: 'Guard updated' };
    }
  }
  return { status: 'error', message: 'Guard not found' };
}

function deleteGuard(dbId) {
  const sheet = getSheet('guards');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === Number(dbId)) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Guard deleted' };
    }
  }
  return { status: 'error', message: 'Guard not found' };
}

function syncAllGuards(list) {
  const sheet = getSheet('guards');
  sheet.clearContents();
  sheet.appendRow(['db_id', 'employee_id', 'fname', 'lname', 'gender', 'position', 'department', 'status', 'can_duty', 'is_inspector', 'dutyPoint', 'pairNo', 'orderIndex', 'updated_at']);

  const rows = list.map((p, idx) => [
    p.db_id || (idx + 1),
    p.id || ('EMP' + (idx + 1)),
    p.fname || '',
    p.lname || '',
    p.gender || 'M',
    p.position || '',
    p.dept || '',
    p.status || 'active',
    p.canDuty ? 1 : 0,
    p.isInspector ? 1 : 0,
    p.dutyPoint || '',
    p.pairNo || '',
    p.orderIndex !== undefined ? p.orderIndex : idx + 1,
    new Date()
  ]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  return { status: 'success', count: rows.length };
}

function getDutyPointsData() {
  const sheet = getSheet('duty_points');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    data.push({
      id: Number(rows[i][0]),
      name: String(rows[i][1]),
      gender: String(rows[i][2]) === 'F' ? 'F' : 'M',
      order_index: Number(rows[i][3] || i)
    });
  }
  return data;
}

function addDutyPoint(data) {
  const sheet = getSheet('duty_points');
  const id = new Date().getTime();
  sheet.appendRow([id, data.name, data.gender, data.order_index || 0]);
  return { status: 'success', id: id };
}

function deleteDutyPoint(id) {
  const sheet = getSheet('duty_points');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === Number(id)) {
      sheet.deleteRow(i + 1);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Not found' };
}

function getHolidaysData() {
  const sheet = getSheet('holidays');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    let d = rows[i][1];
    if (d instanceof Date) {
      d = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
    data.push({
      id: Number(rows[i][0]),
      holiday_date: String(d),
      name: String(rows[i][2]),
      type: String(rows[i][3] || 'official')
    });
  }
  return data;
}

function addHoliday(data) {
  const sheet = getSheet('holidays');
  const id = new Date().getTime();
  sheet.appendRow([id, data.date || data.holiday_date, data.name, data.type || 'official']);
  return { status: 'success', id: id };
}

function deleteHoliday(id) {
  const sheet = getSheet('holidays');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === Number(id)) {
      sheet.deleteRow(i + 1);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Not found' };
}

function syncAllHolidays(holidays) {
  const sheet = getSheet('holidays');
  sheet.clearContents();
  sheet.appendRow(['id', 'holiday_date', 'name', 'type']);
  const rows = holidays.map(function(h, idx) {
    return [
      h.id || (new Date().getTime() + idx),
      h.holiday_date,
      h.name,
      h.type || 'official'
    ];
  });
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  return { status: 'success', count: rows.length, message: 'Synced ' + rows.length + ' holidays successfully' };
}

function getEmployeeDirectoryData() {
  const sheet = getSheet('employees');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    data.push({
      employee_id: String(rows[i][0]),
      full_name_thai: String(rows[i][1]),
      gender: String(rows[i][2]),
      position_thai: String(rows[i][3]),
      dept: String(rows[i][4])
    });
  }
  return data;
}

function searchEmployeeData(query) {
  const list = getEmployeeDirectoryData();
  if (!query) return list.slice(0, 15);
  const q = String(query).toLowerCase().trim();
  return list.filter(item => 
    item.full_name_thai.toLowerCase().includes(q) ||
    item.employee_id.toLowerCase().includes(q) ||
    item.dept.toLowerCase().includes(q) ||
    item.position_thai.toLowerCase().includes(q)
  ).slice(0, 15);
}

function getUsersData() {
  const sheet = getSheet('users');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] && !r[1]) continue;
    let createdAt = r[6];
    if (createdAt instanceof Date) {
      createdAt = Utilities.formatDate(createdAt, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    }
    let lastLogin = r[7];
    if (lastLogin instanceof Date) {
      lastLogin = Utilities.formatDate(lastLogin, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    }
    data.push({
      id: String(r[0] || ('USR' + i)),
      username: String(r[1] || '').trim(),
      password: String(r[2] || ''),
      name: String(r[3] || '').trim(),
      role: String(r[4] || 'officer'),
      status: String(r[5] || 'active'),
      createdAt: String(createdAt || ''),
      lastLogin: String(lastLogin || '')
    });
  }
  return data;
}

function addUser(data) {
  const sheet = getSheet('users');
  const rows = sheet.getDataRange().getValues();
  const username = String(data.username || '').trim();
  const id = String(data.id || ('USR' + String(new Date().getTime()).slice(-4)));

  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][1] && String(rows[i][1]).toLowerCase() === username.toLowerCase()) || 
        (rows[i][0] && String(rows[i][0]) === id)) {
      return editUser(data);
    }
  }

  const createdAt = data.createdAt || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  sheet.appendRow([
    id,
    username,
    String(data.password || ''),
    String(data.name || '').trim(),
    String(data.role || 'officer'),
    String(data.status || 'active'),
    createdAt,
    String(data.lastLogin || '')
  ]);
  return { status: 'success', id: id, message: 'User added successfully' };
}

function editUser(data) {
  const sheet = getSheet('users');
  const rows = sheet.getDataRange().getValues();
  const id = String(data.id || '');
  const username = String(data.username || '').trim().toLowerCase();

  for (let i = 1; i < rows.length; i++) {
    const rowId = String(rows[i][0]);
    const rowUser = String(rows[i][1]).trim().toLowerCase();
    if ((id && rowId === id) || (username && rowUser === username)) {
      const rowIndex = i + 1;
      sheet.getRange(rowIndex, 1, 1, 8).setValues([[
        data.id || rows[i][0],
        data.username || rows[i][1],
        data.password !== undefined && String(data.password).length > 0 ? String(data.password) : String(rows[i][2] || ''),
        String(data.name || rows[i][3] || ''),
        String(data.role || rows[i][4] || 'officer'),
        String(data.status || rows[i][5] || 'active'),
        rows[i][6] || '',
        data.lastLogin !== undefined ? String(data.lastLogin) : String(rows[i][7] || '')
      ]]);
      return { status: 'success', message: 'User updated successfully' };
    }
  }
  return addUser(data);
}

function deleteUser(id) {
  const sheet = getSheet('users');
  const rows = sheet.getDataRange().getValues();
  const targetId = String(id || '').trim();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === targetId || String(rows[i][1]).toLowerCase() === targetId.toLowerCase()) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'User deleted successfully' };
    }
  }
  return { status: 'error', message: 'User not found: ' + targetId };
}

function syncAllUsers(list) {
  const sheet = getSheet('users');
  sheet.clearContents();
  sheet.appendRow(['id', 'username', 'password', 'name', 'role', 'status', 'created_at', 'last_login']);

  if (!list || !Array.isArray(list) || list.length === 0) {
    return { status: 'success', count: 0, message: 'Cleared users sheet' };
  }

  const rows = list.map((u, idx) => [
    String(u.id || ('USR' + String(idx + 1).padStart(3, '0'))),
    String(u.username || '').trim(),
    String(u.password || ''),
    String(u.name || '').trim(),
    String(u.role || 'officer'),
    String(u.status || 'active'),
    String(u.createdAt || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')),
    String(u.lastLogin || '')
  ]);

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  return { status: 'success', count: rows.length, message: 'Synced ' + rows.length + ' users successfully' };
}

function saveRosterSchedule(data) {
  const sheet = getSheet('roster_schedules');
  const targetMonth = Number(data.month);
  const targetYear = Number(data.year);
  const targetGender = String(data.gender || 'M').toUpperCase();
  const rows = sheet.getDataRange().getValues();

  // หากคนละเดือนให้ลบเดือนก่อนหน้าทิ้งทั้งหมด ทั้งเวรชายและหญิง
  // คงไว้เฉพาะข้อมูลของเดือนเดียวกันกับที่กำลังบันทึก (กรณีบันทึกแยกเพศ ชาย/หญิง ในเดือนเดียวกัน)
  const existingRows = [];
  if (rows.length > 1) {
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r[0]) continue;
      const rYear = Number(r[1]);
      const rMonth = Number(r[3]);
      const rGender = String(r[5] || '').toUpperCase();
      // หากเป็นเดือนเดียวกัน และไม่ใช่เพศที่กำลังบันทึกทับ ให้เก็บไว้
      if (rYear === targetYear && rMonth === targetMonth) {
        if (targetGender !== 'ALL' && rGender !== targetGender) {
          existingRows.push(r);
        }
      }
    }
  }

  const items = data.items || [];
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  const newRows = items.map(function(item, idx) {
    return [
      item.schedule_id || ('SCH-' + targetYear + '-' + targetMonth + '-' + targetGender + '-' + (idx + 1)),
      targetYear,
      targetYear + 543,
      targetMonth,
      item.month_name || '',
      item.gender || targetGender,
      item.date_str || '',
      item.day || '',
      item.day_of_week || '',
      item.is_holiday ? 1 : 0,
      item.point_name || '',
      item.head_id || '',
      item.head_name || '',
      item.head_position || '',
      item.sub_id || '',
      item.sub_name || '',
      item.sub_position || '',
      item.sub2_id || '',
      item.sub2_name || '',
      item.sub2_position || '',
      item.inspector_id || '',
      item.inspector_name || '',
      item.inspector_position || '',
      nowStr
    ];
  });

  const allRows = existingRows.concat(newRows);
  sheet.clearContents();
  sheet.appendRow([
    'schedule_id',
    'year',
    'year_th',
    'month',
    'month_name',
    'gender',
    'date_str',
    'day',
    'day_of_week',
    'is_holiday',
    'point_name',
    'head_id',
    'head_name',
    'head_position',
    'sub_id',
    'sub_name',
    'sub_position',
    'sub2_id',
    'sub2_name',
    'sub2_position',
    'inspector_id',
    'inspector_name',
    'inspector_position',
    'updated_at'
  ]);

  if (allRows.length > 0) {
    sheet.getRange(2, 1, allRows.length, allRows[0].length).setValues(allRows);
  }

  return {
    status: 'success',
    count: newRows.length,
    total: allRows.length,
    month: targetMonth,
    year: targetYear,
    gender: targetGender,
    message: 'บันทึกข้อมูลตารางเวรเดือน ' + targetMonth + '/' + (targetYear + 543) + ' เรียบร้อย (ลบข้อมูลเดือนอื่นออกแล้ว)'
  };
}

function getRosterScheduleData(targetMonth, targetYear, targetGender) {
  const sheet = getSheet('roster_schedules');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    const rYear = Number(r[1]);
    const rMonth = Number(r[3]);
    const rGender = String(r[5] || '').toUpperCase();

    if (targetYear !== null && targetYear !== undefined && rYear !== targetYear) continue;
    if (targetMonth !== null && targetMonth !== undefined && rMonth !== targetMonth) continue;
    if (targetGender && targetGender !== 'ALL' && rGender !== targetGender.toUpperCase()) continue;

    data.push({
      schedule_id: String(r[0]),
      year: rYear,
      year_th: Number(r[2]),
      month: rMonth,
      month_name: String(r[4]),
      gender: rGender,
      date_str: String(r[6]),
      day: Number(r[7]),
      day_of_week: String(r[8]),
      is_holiday: Boolean(r[9] == 1 || r[9] === true || r[9] === '1'),
      point_name: String(r[10]),
      head_id: String(r[11]),
      head_name: String(r[12]),
      head_position: String(r[13]),
      sub_id: String(r[14]),
      sub_name: String(r[15]),
      sub_position: String(r[16]),
      sub2_id: String(r[17]),
      sub2_name: String(r[18]),
      sub2_position: String(r[19]),
      inspector_id: String(r[20]),
      inspector_name: String(r[21]),
      inspector_position: String(r[22]),
      updated_at: String(r[23])
    });
  }
  return data;
}
`;

// Helper: Local Storage Load & Save
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

// Default Apps Script Web App URL
export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw0uBAjnDuP7zKLQ3OzpvrslxsTfaz9misMR7zsTHVFnHioIULX4bKO3ELl5LeR3W_s/exec';

class ApiService {
  private getSettings(): Settings {
    const s = loadFromStorage<Settings>(LS_KEY_SETTINGS, DEFAULT_SETTINGS);
    if (!s.appsScriptUrl || !s.appsScriptUrl.trim()) {
      s.appsScriptUrl = DEFAULT_APPS_SCRIPT_URL;
    }
    return s;
  }

  public getAppsScriptUrl(): string {
    const url = this.getSettings().appsScriptUrl;
    return url && url.trim() ? url.trim() : DEFAULT_APPS_SCRIPT_URL;
  }

  public async callAppsScript(action: string, method: 'GET' | 'POST' = 'GET', payload?: any): Promise<any> {
    const scriptUrl = this.getAppsScriptUrl();
    if (!scriptUrl || !scriptUrl.trim()) {
      throw new Error('ยังไม่ได้ระบุ Google Apps Script Web App URL (กรุณาไปที่เมนูตั้งค่า Google Sheets)');
    }

    const trimmedUrl = scriptUrl.trim();
    let urlObj: URL;
    try {
      urlObj = new URL(trimmedUrl);
    } catch {
      throw new Error('Google Apps Script Web App URL รูปแบบไม่ถูกต้อง');
    }
    urlObj.searchParams.set('action', action);

    try {
      if (method === 'GET') {
        if (payload) {
          Object.keys(payload).forEach(k => {
            if (payload[k] !== undefined && payload[k] !== null) {
              urlObj.searchParams.set(k, String(payload[k]));
            }
          });
        }
        const res = await fetch(urlObj.toString(), { method: 'GET' });
        if (!res.ok) throw new Error(`Google Apps Script HTTP ${res.status}: ${res.statusText}`);
        const data = await res.json();
        if (data && data.status === 'error') {
          throw new Error(data.message || 'Google Apps Script ส่งกลับสถานะ Error');
        }
        return data;
      } else {
        // Apps Script POST with text/plain to avoid CORS preflight failures
        const postBody = JSON.stringify({ action, ...payload });
        const res = await fetch(urlObj.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: postBody,
        });
        if (!res.ok) throw new Error(`Google Apps Script HTTP ${res.status}: ${res.statusText}`);
        const data = await res.json();
        if (data && data.status === 'error') {
          throw new Error(data.message || 'Google Apps Script ส่งกลับสถานะ Error');
        }
        return data;
      }
    } catch (e: any) {
      if (e.message && e.message.includes('Failed to fetch')) {
        throw new Error('ไม่สามารถเชื่อมต่อกับ Google Apps Script ได้ (กรุณาตรวจสอบว่าเลือก Deploy as Web App เป็น "Who has access: Anyone")');
      }
      throw e;
    }
  }

  // PERSONNEL API
  public async getPersonnel(): Promise<Personnel[]> {
    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        const data = await this.callAppsScript('get_guards', 'GET');
        if (Array.isArray(data)) {
          saveToStorage(LS_KEY_PERSONNEL, data);
          return data;
        }
      } catch (err) {
        console.warn('Apps Script fetch failed, falling back to cache:', err);
      }
    }
    return loadFromStorage<Personnel[]>(LS_KEY_PERSONNEL, INITIAL_PERSONNEL);
  }

  public async savePersonnel(list: Personnel[]): Promise<void> {
    saveToStorage(LS_KEY_PERSONNEL, list);
    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        await this.callAppsScript('sync_all_guards', 'POST', { personnel: list });
      } catch (err) {
        console.warn('Could not sync personnel to Apps Script:', err);
      }
    }
  }

  public async addPersonnel(person: Omit<Personnel, 'db_id'>): Promise<Personnel> {
    const list = await this.getPersonnel();
    const newDbId = list.length > 0 ? Math.max(...list.map(p => p.db_id)) + 1 : 1;
    const newPerson: Personnel = {
      ...person,
      db_id: newDbId,
    };
    list.push(newPerson);
    await this.savePersonnel(list);

    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        await this.callAppsScript('add_guard', 'POST', {
          full_name: `${newPerson.fname} ${newPerson.lname}`.trim(),
          fname: newPerson.fname,
          lname: newPerson.lname,
          gender: newPerson.gender,
          position: newPerson.position,
          department: newPerson.dept,
          can_duty: newPerson.canDuty ? 1 : 0,
          is_inspector: newPerson.isInspector ? 1 : 0,
          dutyPoint: newPerson.dutyPoint,
          pairNo: newPerson.pairNo,
          orderIndex: newPerson.orderIndex,
          employee_id: newPerson.id,
        });
      } catch (err) {
        console.warn('Apps Script add_guard failed:', err);
      }
    }

    return newPerson;
  }

  public async updatePersonnel(person: Personnel): Promise<void> {
    const list = await this.getPersonnel();
    const index = list.findIndex(p => p.db_id === person.db_id);
    if (index !== -1) {
      list[index] = person;
      await this.savePersonnel(list);
    }

    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        await this.callAppsScript('edit_guard', 'POST', {
          db_id: person.db_id,
          full_name: `${person.fname} ${person.lname}`.trim(),
          fname: person.fname,
          lname: person.lname,
          gender: person.gender,
          position: person.position,
          department: person.dept,
          can_duty: person.canDuty ? 1 : 0,
          is_inspector: person.isInspector ? 1 : 0,
          dutyPoint: person.dutyPoint,
          pairNo: person.pairNo,
          orderIndex: person.orderIndex,
        });
      } catch (err) {
        console.warn('Apps Script edit_guard failed:', err);
      }
    }
  }

  public async deletePersonnel(db_id: number): Promise<void> {
    const list = await this.getPersonnel();
    const filtered = list.filter(p => p.db_id !== db_id);
    await this.savePersonnel(filtered);

    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        await this.callAppsScript('delete_guard', 'POST', { db_id });
      } catch (err) {
        console.warn('Apps Script delete_guard failed:', err);
      }
    }
  }

  // DUTY POINTS API
  public async getDutyPoints(): Promise<DutyPoint[]> {
    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        const data = await this.callAppsScript('get_duty_points', 'GET');
        if (Array.isArray(data)) {
          saveToStorage(LS_KEY_POINTS, data);
          return data;
        }
      } catch (err) {
        console.warn('Apps Script get_duty_points error:', err);
      }
    }
    return loadFromStorage<DutyPoint[]>(LS_KEY_POINTS, INITIAL_DUTY_POINTS);
  }

  public async addDutyPoint(name: string, gender: 'M' | 'F'): Promise<DutyPoint> {
    const list = await this.getDutyPoints();
    const newId = Date.now();
    const newPoint: DutyPoint = { id: newId, name, gender, order_index: list.length + 1 };
    list.push(newPoint);
    saveToStorage(LS_KEY_POINTS, list);

    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        await this.callAppsScript('add_duty_point', 'POST', newPoint);
      } catch (err) {
        console.warn('Apps Script add_duty_point error:', err);
      }
    }
    return newPoint;
  }

  public async deleteDutyPoint(id: number): Promise<void> {
    const list = await this.getDutyPoints();
    const filtered = list.filter(p => p.id !== id);
    saveToStorage(LS_KEY_POINTS, filtered);

    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        await this.callAppsScript('delete_duty_point', 'POST', { id });
      } catch (err) {
        console.warn('Apps Script delete_duty_point error:', err);
      }
    }
  }

  // HOLIDAYS API
  public async getHolidays(): Promise<Holiday[]> {
    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        const data = await this.callAppsScript('get_holidays', 'GET');
        if (Array.isArray(data)) {
          saveToStorage(LS_KEY_HOLIDAYS, data);
          return data;
        }
      } catch (err) {
        console.warn('Apps Script get_holidays error:', err);
      }
    }
    return loadFromStorage<Holiday[]>(LS_KEY_HOLIDAYS, INITIAL_HOLIDAYS);
  }

  public async addHoliday(holiday_date: string, name: string, type: 'official' | 'special'): Promise<Holiday> {
    const list = await this.getHolidays();
    const newId = Date.now();
    const newHol: Holiday = { id: newId, holiday_date, name, type };
    list.push(newHol);
    list.sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
    saveToStorage(LS_KEY_HOLIDAYS, list);

    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        await this.callAppsScript('add_holiday', 'POST', newHol);
      } catch (err) {
        console.warn('Apps Script add_holiday error:', err);
      }
    }
    return newHol;
  }

  public async deleteHoliday(id: number): Promise<void> {
    const list = await this.getHolidays();
    const filtered = list.filter(h => h.id !== id);
    saveToStorage(LS_KEY_HOLIDAYS, filtered);

    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        await this.callAppsScript('delete_holiday', 'POST', { id });
      } catch (err) {
        console.warn('Apps Script delete_holiday error:', err);
      }
    }
  }

  public async saveHolidays(holidays: Holiday[]): Promise<{ count: number; message: string }> {
    saveToStorage(LS_KEY_HOLIDAYS, holidays);
    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        const res = await this.callAppsScript('sync_all_holidays', 'POST', { holidays });
        return {
          count: holidays.length,
          message: res?.message || `ซิงก์ข้อมูลวันหยุด ${holidays.length} รายการขึ้น Google Sheet สำเร็จแล้ว`,
        };
      } catch (err: any) {
        console.warn('Apps Script sync_all_holidays error:', err);
        throw new Error(`ซิงก์ขึ้น Google Sheet ไม่สำเร็จ: ${err.message || err}`);
      }
    }
    return {
      count: holidays.length,
      message: `บันทึกข้อมูลวันหยุด ${holidays.length} รายการลงในเครื่องเรียบร้อย (ยังไม่ได้ตั้งค่า Google Sheet)`,
    };
  }

  // EMPLOYEE DIRECTORY SEARCH
  public async searchEmployee(query: string): Promise<EmployeeDirectoryItem[]> {
    const q = query.trim().toLowerCase();
    const settings = this.getSettings();
    if (settings.appsScriptUrl && q.length >= 2) {
      try {
        const res = await this.callAppsScript('search_employee', 'GET', { q });
        if (Array.isArray(res)) return res;
      } catch (err) {
        console.warn('Apps Script employee search fallback to local:', err);
      }
    }

    const directory = loadFromStorage<EmployeeDirectoryItem[]>(LS_KEY_DIRECTORY, INITIAL_EMPLOYEE_DIRECTORY);
    if (!q) return directory.slice(0, 15);
    return directory
      .filter(
        emp =>
          emp.full_name_thai.toLowerCase().includes(q) ||
          emp.employee_id.toLowerCase().includes(q) ||
          emp.dept.toLowerCase().includes(q) ||
          emp.position_thai.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }

  // USER MANAGEMENT API
  public async getUsers(): Promise<UserAccount[]> {
    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        const data = await this.callAppsScript('get_users', 'GET');
        if (Array.isArray(data) && data.length > 0) {
          saveToStorage(LS_KEY_USERS, data);
          return data;
        } else if (Array.isArray(data) && data.length === 0) {
          // If sheet is empty, seed initial users to Google Sheet
          const localUsers = loadFromStorage<UserAccount[]>(LS_KEY_USERS, INITIAL_USERS);
          if (localUsers.length > 0) {
            try {
              await this.callAppsScript('sync_all_users', 'POST', { users: localUsers });
            } catch (seedErr) {
              console.warn('Auto-seed users to Google Sheet error:', seedErr);
            }
          }
          return localUsers;
        }
      } catch (err) {
        console.warn('Apps Script get_users error, falling back to cache:', err);
      }
    }
    return loadFromStorage<UserAccount[]>(LS_KEY_USERS, INITIAL_USERS);
  }

  public async saveUsers(list: UserAccount[]): Promise<void> {
    saveToStorage(LS_KEY_USERS, list);
    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      await this.callAppsScript('sync_all_users', 'POST', { users: list });
    }
  }

  public async addUser(user: Omit<UserAccount, 'id'>): Promise<UserAccount> {
    const list = await this.getUsers();
    const newId = 'USR' + String(Date.now()).slice(-4);
    const newUser: UserAccount = {
      ...user,
      id: newId,
      createdAt: new Date().toISOString().split('T')[0],
    };
    list.push(newUser);
    saveToStorage(LS_KEY_USERS, list);

    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        await this.callAppsScript('add_user', 'POST', newUser);
      } catch (err: any) {
        console.warn('Apps Script add_user single call error, attempting full sync:', err);
        try {
          await this.callAppsScript('sync_all_users', 'POST', { users: list });
        } catch (syncErr: any) {
          throw new Error(`บันทึกลง Google Sheet ไม่สำเร็จ: ${syncErr.message || err.message || err}`);
        }
      }
    }
    return newUser;
  }

  public async updateUser(user: UserAccount): Promise<void> {
    const list = await this.getUsers();
    const idx = list.findIndex(u => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
    if (idx !== -1) {
      list[idx] = user;
    } else {
      list.push(user);
    }
    saveToStorage(LS_KEY_USERS, list);

    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        await this.callAppsScript('edit_user', 'POST', user);
      } catch (err: any) {
        console.warn('Apps Script edit_user single call error, attempting full sync:', err);
        try {
          await this.callAppsScript('sync_all_users', 'POST', { users: list });
        } catch (syncErr: any) {
          throw new Error(`บันทึกการแก้ไขลง Google Sheet ไม่สำเร็จ: ${syncErr.message || err.message || err}`);
        }
      }
    }
  }

  public async deleteUser(id: string): Promise<void> {
    const list = await this.getUsers();
    const filtered = list.filter(u => u.id !== id && u.username !== id);
    saveToStorage(LS_KEY_USERS, filtered);

    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        await this.callAppsScript('delete_user', 'POST', { id, username: id });
      } catch (err: any) {
        console.warn('Apps Script delete_user single call error, attempting full sync:', err);
        try {
          await this.callAppsScript('sync_all_users', 'POST', { users: filtered });
        } catch (syncErr: any) {
          throw new Error(`ลบจาก Google Sheet ไม่สำเร็จ: ${syncErr.message || err.message || err}`);
        }
      }
    }
  }

  // ROSTER SCHEDULE API
  public async saveRosterSchedule(
    month: number,
    year: number,
    gender: 'M' | 'F' | 'ALL',
    items: SavedRosterScheduleRow[]
  ): Promise<{ count: number; message: string }> {
    // ลบข้อมูลตารางเวรของเดือนอื่น/ปีก่อนหน้าออกจาก localStorage
    try {
      const keysToRemove: string[] = [];
      const currentPrefix = `${LS_KEY_ROSTER_PREFIX}${year}_${month}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LS_KEY_ROSTER_PREFIX)) {
          if (!k.startsWith(currentPrefix)) {
            keysToRemove.push(k);
          }
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Error clearing previous months from localStorage:', e);
    }

    const storageKey = `${LS_KEY_ROSTER_PREFIX}${year}_${month}_${gender}`;
    saveToStorage(storageKey, items);
    saveToStorage(`${storageKey}_time`, new Date().toISOString());

    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        const res = await this.callAppsScript('save_roster_schedule', 'POST', {
          month,
          year,
          gender,
          items,
        });
        return {
          count: items.length,
          message: res?.message || `บันทึกข้อมูลตารางเวร ${items.length} รายการลง Google Sheet สำเร็จ (ลบข้อมูลเดือนอื่นออกแล้ว)`,
        };
      } catch (err: any) {
        console.warn('Apps Script save_roster_schedule error:', err);
        throw new Error(`บันทึกลง Google Sheet ไม่สำเร็จ: ${err.message || err}`);
      }
    }

    return {
      count: items.length,
      message: `บันทึกข้อมูลตารางเวร ${items.length} รายการลงในเครื่องเรียบร้อย (ลบข้อมูลเดือนก่อนหน้าแล้ว)`,
    };
  }

  public async getRosterSchedule(
    month?: number,
    year?: number,
    gender?: 'M' | 'F' | 'ALL'
  ): Promise<SavedRosterScheduleRow[]> {
    const settings = this.getSettings();
    if (settings.appsScriptUrl) {
      try {
        const data = await this.callAppsScript('get_roster_schedule', 'GET', {
          month,
          year,
          gender: gender && gender !== 'ALL' ? gender : undefined,
        });
        if (Array.isArray(data)) {
          return data;
        }
      } catch (err) {
        console.warn('Apps Script get_roster_schedule error, fallback to cache:', err);
      }
    }

    if (month !== undefined && year !== undefined) {
      if (gender && gender !== 'ALL') {
        const storageKey = `${LS_KEY_ROSTER_PREFIX}${year}_${month}_${gender}`;
        return loadFromStorage<SavedRosterScheduleRow[]>(storageKey, []);
      } else {
        const mKey = `${LS_KEY_ROSTER_PREFIX}${year}_${month}_M`;
        const fKey = `${LS_KEY_ROSTER_PREFIX}${year}_${month}_F`;
        const allKey = `${LS_KEY_ROSTER_PREFIX}${year}_${month}_ALL`;
        const mRows = loadFromStorage<SavedRosterScheduleRow[]>(mKey, []);
        const fRows = loadFromStorage<SavedRosterScheduleRow[]>(fKey, []);
        const allRows = loadFromStorage<SavedRosterScheduleRow[]>(allKey, []);
        if (allRows.length > 0) return allRows;
        return [...mRows, ...fRows];
      }
    }
    return [];
  }

  public getLastSavedRosterTime(month: number, year: number, gender: 'M' | 'F' | 'ALL'): string | null {
    const storageKey = `${LS_KEY_ROSTER_PREFIX}${year}_${month}_${gender}_time`;
    return loadFromStorage<string | null>(storageKey, null);
  }

  // SETTINGS
  public getAppConfig(): Settings {
    return this.getSettings();
  }

  public saveAppConfig(newSettings: Settings): void {
    saveToStorage(LS_KEY_SETTINGS, newSettings);
  }
}

export const apiService = new ApiService();
