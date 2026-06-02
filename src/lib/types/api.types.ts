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
  staffRole?: string | null;
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
  advanceAmountINR?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  /** Ordered list of completed timeline stages — used to derive granular display status */
  completedStages?: string[];
  client?: {
    companyName: string;
    user: { firstName: string; lastName: string; email: string };
  };
  items?: ApiOrderItem[];
  shipment?: ApiShipment | null;
  warehouseReport?: {
    isReadByAdmin: boolean;
    isReadByStaff: boolean;
    lastUpdatedAt: string | null;
  } | null;
}

export interface ApiOrderItem {
  id: string;
  quantity: number;
  unitPriceCNY: string;
  unitPriceINR: string;
  totalINR: string;
  notes?: string | null;
  imageUrl?: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
  } | null;
  supplier: {
    id: string;
    companyName: string;
  } | null;
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
  | 'PAYMENT_PENDING'
  | 'ADVANCE_PAID'
  | 'FULLY_PAID'
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

export type InquiryStatus =
  | 'PENDING'
  | 'REVIEWING'
  | 'QUOTED'
  | 'PARTIALLY_ACCEPTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'CONVERTED';

export interface ApiInquiryItem {
  id: string;
  inquiryId: string;
  type: 'CATALOG' | 'CUSTOM';
  productId?: string | null;
  productName: string;
  productDescription?: string | null;
  quantity: number;
  unit: string;
  targetPricePerUnit?: string | null;
  quotedPrice?: string | null;
  notes?: string | null;
  status: InquiryStatus;
  product?: {
    id: string;
    name: string;
    slug: string;
    images: string[];
    supplier: { id: string; companyName: string };
  } | null;
}

export interface ApiInquiry {
  id: string;
  inquiryNumber: string;
  status: InquiryStatus;
  notes?: string | null;
  staffNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    companyName: string;
    user: { firstName: string; lastName: string; email: string };
  };
  items: ApiInquiryItem[];
}

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

export interface RegisterClientPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  gstin?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface AuthResponse {
  user: ApiUser;
  accessToken: string;
}
