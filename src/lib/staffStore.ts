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

// Demo staff accounts have been removed. Staff are managed through the real
// backend (`/api/v1/admin/staff`); no credentials live in client-side source.
// Any entries a user adds at runtime are still read from localStorage below.
function seedStaff(): StaffMember[] {
  return [];
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

// authenticateStaff() was removed: client-side password checking is insecure and
// enabled a login bypass. All authentication now goes through the backend API.

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
