// ── Shared envelope returned by every Elios API endpoint ─────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ── Domain types ──────────────────────────────────────────────────────────────
export interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'ADMIN' | 'STAFF' | 'CLIENT';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  client?: ApiClient | null;
}

export interface ApiClient {
  id: string;
  userId: string;
  companyName: string;
  gstin?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  unit: string;
  moq: number;
  basePrice: string;       // Decimal comes as string from JSON
  currency: string;
  images: string[];
  isActive: boolean;
  createdAt: string;
  supplier: {
    id: string;
    companyName: string;
    city?: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    parent?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };
}

export interface ApiOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotalINR: string;
  shippingCostINR: string;
  taxINR: string;
  totalINR: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    companyName: string;
    user: { firstName: string; lastName: string; email: string };
  };
  items?: ApiOrderItem[];
  shipment?: ApiShipment | null;
}

export interface ApiOrderItem {
  id: string;
  quantity: number;
  unitPriceCNY: string;
  unitPriceINR: string;
  totalINR: string;
  product: {
    id: string;
    name: string;
    slug: string;
  };
  supplier: {
    id: string;
    companyName: string;
  };
  qcCheck?: {
    status: 'PENDING' | 'PASSED' | 'FAILED';
    notes?: string;
  } | null;
}

export interface ApiShipment {
  id: string;
  trackingNumber?: string;
  carrier?: string;
  status: ShipmentStatus;
  dispatchedAt?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
}

export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  children?: ApiCategory[];
  products?: ApiProduct[];
}

// ── Enums ─────────────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'CONFIRMED'
  | 'SOURCING'
  | 'QC_PENDING'
  | 'QC_PASSED'
  | 'QC_FAILED'
  | 'REPACKING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type ShipmentStatus =
  | 'PREPARING'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'CUSTOMS'
  | 'DELIVERED';

// ── Auth payloads ─────────────────────────────────────────────────────────────
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  user: ApiUser;
  accessToken: string;
}
