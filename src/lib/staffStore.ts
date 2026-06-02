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
      password: 'Demo@1234',
      lastLogin: null,
      createdAt,
    },
    {
      id: 'st-seed-warehouse',
      name: 'Vikram Desai',
      email: 'warehouse.staff@elioswholesale.in',
      phone: '+91 22 4000 1002',
      role: 'warehouse-qc',
      password: 'Demo@1234',
      lastLogin: null,
      createdAt,
    },
    {
      id: 'st-seed-logistics',
      name: 'Rohit Menon',
      email: 'logistics.staff@elioswholesale.in',
      phone: '+91 22 4000 1003',
      role: 'sourcing-logistics',
      password: 'Demo@1234',
      lastLogin: null,
      createdAt,
    },
    {
      id: 'st-seed-qc',
      name: 'Ananya Bose',
      email: 'qc.staff@elioswholesale.in',
      phone: '+91 22 4000 1004',
      role: 'warehouse-qc',
      password: 'Demo@1234',
      lastLogin: null,
      createdAt,
    },
  ];
}

export function getStaffRegistry(): StaffMember[] {
  const seeds = seedStaff();

  if (typeof window === 'undefined') return seeds;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seeds;

    const parsed = JSON.parse(raw) as StaffMember[];
    if (!Array.isArray(parsed)) return seeds;

    // Seeds are always authoritative — only pull extra non-seed entries from localStorage
    const seedIds = new Set(seeds.map((s) => s.id));
    const extraStaff = parsed.filter((s) => !seedIds.has(s.id));

    return [...seeds, ...extraStaff];
  } catch {
    return seeds;
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
  const registry = getStaffRegistry();
  console.log('[staffStore] registry:', registry.map((s) => ({ id: s.id, email: s.email })));
  console.log('[staffStore] trying:', email.trim(), '/', password.trim());

  const member = registry.find(
    (s) => s.email.toLowerCase() === email.toLowerCase().trim()
  );
  console.log('[staffStore] found member:', member ?? null);

  if (!member) return null;
  if (member.password !== password.trim()) return null;
  return member;
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
