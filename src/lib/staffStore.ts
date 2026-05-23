import type { StaffRoleId } from '@/lib/staffRoles';

const STORAGE_KEY = 'bk_staff_registry';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRoleId;
  /** Demo-only — replace with hashed secrets on the server */
  password: string;
  lastLogin: string | null;
  createdAt: string;
}

function seedStaff(): StaffMember[] {
  const createdAt = new Date().toISOString();
  return [
    {
      id: 'st-seed-sourcing',
      name: 'Meera Nair',
      email: 'sourcing.staff@elioswholesale.in',
      phone: '+91 22 4000 1001',
      role: 'sourcing-logistics',
      password: 'staff-demo-24',
      lastLogin: null,
      createdAt,
    },
    {
      id: 'st-seed-warehouse',
      name: 'Vikram Desai',
      email: 'warehouse.staff@elioswholesale.in',
      phone: '+91 22 4000 1002',
      role: 'warehouse-qc',
      password: 'warehouse-24',
      lastLogin: null,
      createdAt,
    },
  ];
}

export function getStaffRegistry(): StaffMember[] {
  if (typeof window === 'undefined') return seedStaff();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = seedStaff();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as StaffMember[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = seedStaff();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    // Migrate old role IDs to new combined roles
    const migrated = parsed.map((s) => {
      if ((s.role as string) === 'sourcing_staff' || (s.role as string) === 'logistics_staff') {
        return { ...s, role: 'sourcing-logistics' as StaffRoleId };
      }
      if ((s.role as string) === 'warehouse_staff' || (s.role as string) === 'qc_staff') {
        return { ...s, role: 'warehouse-qc' as StaffRoleId };
      }
      return s;
    });
    return migrated;
  } catch {
    return seedStaff();
  }
}

export function saveStaffRegistry(list: StaffMember[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function findStaffByEmail(email: string): StaffMember | undefined {
  const e = email.trim().toLowerCase();
  return getStaffRegistry().find((s) => s.email.toLowerCase() === e);
}

export function authenticateStaff(email: string, password: string): StaffMember | null {
  const s = findStaffByEmail(email);
  if (!s || s.password !== password) return null;
  return s;
}

export function touchStaffLastLogin(id: string) {
  const list = getStaffRegistry();
  const now = new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const next = list.map((s) => (s.id === id ? { ...s, lastLogin: now } : s));
  saveStaffRegistry(next);
}

export function upsertStaff(member: StaffMember) {
  const list = getStaffRegistry();
  const idx = list.findIndex((s) => s.id === member.id);
  if (idx === -1) list.unshift(member);
  else list[idx] = member;
  saveStaffRegistry([...list]);
}

export function deleteStaff(id: string) {
  saveStaffRegistry(getStaffRegistry().filter((s) => s.id !== id));
}

export function newStaffId() {
  return `st-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
