/** Map raw error strings thrown by lib/store.ts (or Supabase) to `errors.*` i18n keys.
 *  DB values stay English — only UI labels/errors are translated. Unknown
 *  messages (e.g. Supabase internals) return null so callers show them as-is. */

const MAP: [string, string][] = [
  ["กรุณากรอกอีเมลและรหัสผ่าน", "fillLogin"],
  ["รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", "passMin"],
  ["อีเมลหรือรหัสผ่านไม่ถูกต้อง", "badLogin"],
  ["เข้าสู่ระบบไม่สำเร็จ", "loginFailed"],
  ["Machine ID ห้ามว่าง", "machineIdRequired"],
  ["Machine Name ห้ามว่าง", "machineNameRequired"],
  ["Machine ID นี้มีอยู่แล้ว (ห้ามซ้ำ)", "machineIdDup"],
  ["ไม่พบเครื่องจักร", "machineNotFound"],
  ["กรุณาระบุเครื่องจักร", "alarmMachineRequired"],
  ["Alarm Code ห้ามว่าง", "alarmCodeRequired"],
  ["Alarm Description ห้ามว่าง", "alarmDescRequired"],
  ["Alarm Code นี้มีอยู่แล้ว (ห้ามซ้ำ)", "alarmCodeDup"],
  ["ไม่พบ alarm", "alarmNotFound"],
  ["Problem ห้ามว่าง", "maintProblemRequired"],
  ["Technician ห้ามว่าง", "maintTechRequired"],
  ["กรุณาระบุวันที่", "maintDateRequired"],
  ["ไม่พบ maintenance record", "maintNotFound"],
  ["Role name ห้ามว่าง (a-z, 0-9, -, _)", "roleNameRequired"],
  ["Display name ห้ามว่าง", "roleDisplayRequired"],
  ["Role นี้มีอยู่แล้ว (ห้ามซ้ำ)", "roleDup"],
  ["ไม่พบ role", "roleNotFound"],
  ["ห้ามลบ built-in role (admin/technician/viewer)", "roleBuiltin"],
  ["Demo user หลักลบไม่ได้ (ลบได้เฉพาะ user ที่สร้างเพิ่ม)", "demoMain"],
  ["บันทึกไม่สำเร็จ", "saveFailed"],
  ["โหลดข้อมูลไม่สำเร็จ", "loadFailed"],
  ["เปลี่ยน role ไม่สำเร็จ", "changeRoleFailed"],
  ["กรุณากรอกอีเมล", "needEmail"],
  ["สร้าง user ไม่สำเร็จ", "createUserFailed"],
  ["แถวนี้เป็น demo fallback — ไม่มีใน Supabase", "demoRow"],
  ["ลบ user ไม่สำเร็จ", "deleteUserFailed"],
  ["ลบไม่สำเร็จ", "deleteFailed"],
  ["โหลด roles ไม่สำเร็จ", "loadRolesFailed"],
];

export function errorKeyOf(message: string | null | undefined): string | null {
  if (!message) return null;
  for (const [raw, key] of MAP) {
    if (message.includes(raw)) return key;
  }
  return null;
}
