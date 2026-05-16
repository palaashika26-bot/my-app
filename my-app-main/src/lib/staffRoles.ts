/** Non-admin workspace roles (stored on each staff member). */
export type StaffRoleId = 'sourcing_staff' | 'warehouse_staff' | 'qc_staff' | 'logistics_staff';

export const STAFF_ROLE_LABELS: Record<StaffRoleId, string> = {
  sourcing_staff: 'Sourcing Staff',
  warehouse_staff: 'Warehouse Staff',
  qc_staff: 'QC Staff',
  logistics_staff: 'Logistics Staff',
};

export const STAFF_ROLE_OPTIONS: { id: StaffRoleId; label: string; hint: string }[] = [
  { id: 'sourcing_staff', label: 'Sourcing Staff', hint: 'Orders & quotations; supplier costs; no revenue/payments.' },
  { id: 'warehouse_staff', label: 'Warehouse Staff', hint: 'Shipping-stage orders; item names/qty only; no money fields.' },
  { id: 'qc_staff', label: 'QC Staff', hint: 'Orders & quotations for verification; no costs or revenue.' },
  { id: 'logistics_staff', label: 'Logistics Staff', hint: 'Orders & shipment weights/dims; no pricing.' },
];

/** Order statuses visible to warehouse (shipping / fulfilment focus). */
const WAREHOUSE_EXCLUDED_STATUSES = new Set(['Payment Pending', 'Payment Confirmed', 'Sourcing']);

export function isWarehouseShippingOrderStatus(status: string): boolean {
  return !WAREHOUSE_EXCLUDED_STATUSES.has(status);
}

export type QuotationScope = 'none' | 'names_qty' | 'verification' | 'logistics_dims' | 'full';

export interface EffectivePermissions {
  isFullAdmin: boolean;
  canSeeOrderListAmounts: boolean;
  canSeeGrandTotalsAndMargins: boolean;
  canSeeClientPayments: boolean;
  canSeeSupplierCostsInOrders: boolean;
  ordersScope: 'all' | 'shipping_only';
  quotationScope: QuotationScope;
  canSeeRequestBudget: boolean;
  canSeeClientSpendInSnapshot: boolean;
  navStaff: boolean;
  navUsers: boolean;
  navSuppliers: boolean;
  navSettings: boolean;
}

export function getEffectivePermissions(
  role: 'client' | 'admin' | 'staff' | null,
  staffRoleId?: StaffRoleId | null
): EffectivePermissions {
  if (role === 'admin') {
    return {
      isFullAdmin: true,
      canSeeOrderListAmounts: true,
      canSeeGrandTotalsAndMargins: true,
      canSeeClientPayments: true,
      canSeeSupplierCostsInOrders: true,
      ordersScope: 'all',
      quotationScope: 'full',
      canSeeRequestBudget: true,
      canSeeClientSpendInSnapshot: true,
      navStaff: true,
      navUsers: true,
      navSuppliers: true,
      navSettings: true,
    };
  }

  if (role === 'staff' && staffRoleId) {
    const staffBase: Omit<EffectivePermissions, keyof {
      canSeeSupplierCostsInOrders: boolean;
      ordersScope: 'all' | 'shipping_only';
      quotationScope: QuotationScope;
      canSeeRequestBudget: boolean;
      navSuppliers: boolean;
    }> = {
      isFullAdmin: false,
      canSeeOrderListAmounts: false,
      canSeeGrandTotalsAndMargins: false,
      canSeeClientPayments: false,
      navStaff: false,
      navUsers: false,
      navSettings: false,
      canSeeClientSpendInSnapshot: false,
    };

    switch (staffRoleId) {
      case 'sourcing_staff':
        return {
          ...staffBase,
          canSeeSupplierCostsInOrders: true,
          ordersScope: 'all',
          quotationScope: 'full',
          canSeeRequestBudget: true,
          navSuppliers: true,
        };
      case 'warehouse_staff':
        return {
          ...staffBase,
          canSeeSupplierCostsInOrders: false,
          ordersScope: 'shipping_only',
          quotationScope: 'names_qty',
          canSeeRequestBudget: false,
          navSuppliers: false,
        };
      case 'qc_staff':
        return {
          ...staffBase,
          canSeeSupplierCostsInOrders: false,
          ordersScope: 'all',
          quotationScope: 'verification',
          canSeeRequestBudget: false,
          navSuppliers: false,
        };
      case 'logistics_staff':
        return {
          ...staffBase,
          canSeeSupplierCostsInOrders: false,
          ordersScope: 'all',
          quotationScope: 'logistics_dims',
          canSeeRequestBudget: false,
          navSuppliers: false,
        };
      default:
        return {
          ...staffBase,
          canSeeSupplierCostsInOrders: false,
          ordersScope: 'all',
          quotationScope: 'none',
          canSeeRequestBudget: false,
          navSuppliers: false,
        };
    }
  }

  return {
    isFullAdmin: false,
    canSeeOrderListAmounts: false,
    canSeeGrandTotalsAndMargins: false,
    canSeeClientPayments: false,
    canSeeSupplierCostsInOrders: false,
    ordersScope: 'all',
    quotationScope: 'none',
    canSeeRequestBudget: false,
    canSeeClientSpendInSnapshot: false,
    navStaff: false,
    navUsers: false,
    navSuppliers: false,
    navSettings: false,
  };
}

export function getStaffAccessDeniedRedirect(
  pathname: string | null,
  perms: EffectivePermissions,
  staffRoleId?: StaffRoleId | null
): string | null {
  if (perms.isFullAdmin || !pathname?.startsWith('/admin')) return null;
  if (pathname.startsWith('/admin/warehouse')) {
    if (staffRoleId === 'warehouse_staff') return null;
    return '/admin';
  }
  if (pathname.startsWith('/admin/users')) return '/admin';
  if (pathname.startsWith('/admin/settings')) return '/admin';
  if (pathname.startsWith('/admin/staff')) return '/admin';
  if (pathname.startsWith('/admin/suppliers') && !perms.navSuppliers) return '/admin';
  return null;
}
