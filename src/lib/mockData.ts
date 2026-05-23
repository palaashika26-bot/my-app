import type { OrderStatus } from '@/components/ui/StatusBadge';

export type PerProductQuoteStatus = 'Pending' | 'Quoted' | 'Accepted' | 'Rejected';

export interface RequestLineItem {
  id: string;
  name: string;
  quantity: number;
  specs?: string;
  /** Product image URL — shown in items table */
  imageUrl?: string;
  /** Supplier RMB cost per unit — internal only */
  rmbCostPerUnit: number;
  /** Quoted selling price per unit in CNY (entered by admin) */
  unitPriceCny?: number;
  /** Quoted selling price per unit in INR (auto-calculated: unitPriceCny x CNY_TO_INR) */
  unitPriceInr?: number;
  status: PerProductQuoteStatus;
  /** Set when client uses counter-offer; cleared when staff saves a new unit price */
  revisionRequested?: boolean;
  /** Optional value captured from client counter-offer flow */
  clientProposedInr?: number;
}

export interface RequestRow {
  id: string;
  requestId: string;
  date: string;
  items: number;
  itemNames: string;
  status: OrderStatus;
  totalBudget: string;
  client?: string;
  source?: 'manual' | 'photo_scan';
  imageAttached?: boolean;
  detectedProduct?: string;
  confidence?: number;
  /** When set, drives per-product RFQ rows instead of parsing itemNames */
  lineItems?: RequestLineItem[];
}

export interface OrderLineItemBrief {
  id: string;
  name: string;
  quantity: number;
}

export interface OrderRow {
  id: string;
  orderId: string;
  date: string;
  amount: string;
  amountCny: string;
  itemCount: number;
  status: OrderStatus;
  estimatedDelivery: string;
  client?: string;
  itemNames?: string;
  /** When set, drives per-product QC and line-item displays */
  lineItems?: OrderLineItemBrief[];
}

export const mockRequests: RequestRow[] = [
  { id: 'req-001', requestId: 'BK-REQ-2024-0312', date: '08 May 2026', items: 3, itemNames: 'LED Strip Lights, Cable Ties, USB Hubs', status: 'Awaiting Approval', totalBudget: '₹45,000', client: 'Rajesh Kumar', source: 'manual' },
  { id: 'req-002', requestId: 'BK-REQ-2024-0308', date: '05 May 2026', items: 1, itemNames: 'Silicone Phone Cases (iPhone 15)', status: 'Quotation in Progress', totalBudget: '₹22,500', client: 'Rajesh Kumar', source: 'manual' },
  { id: 'req-003', requestId: 'BK-REQ-2024-0301', date: '01 May 2026', items: 5, itemNames: 'Bluetooth Earbuds, Power Banks, Cables...', status: 'Payment Pending', totalBudget: '₹1,18,000', client: 'Priya Sharma', source: 'manual' },
  { id: 'req-004', requestId: 'BK-REQ-2024-0295', date: '28 Apr 2026', items: 2, itemNames: 'Stainless Steel Water Bottles, Lids', status: 'Sourcing', totalBudget: '₹38,400', client: 'Amit Patel', source: 'photo_scan', imageAttached: true, detectedProduct: 'Stainless Steel Water Bottle (500ml)', confidence: 91 },
  { id: 'req-005', requestId: 'BK-REQ-2024-0288', date: '22 Apr 2026', items: 4, itemNames: 'Packaging Boxes, Bubble Wrap, Tape...', status: 'At China Warehouse', totalBudget: '₹67,200', client: 'Sunita Verma', source: 'manual' },
  { id: 'req-006', requestId: 'BK-REQ-2024-0279', date: '15 Apr 2026', items: 2, itemNames: 'Ceramic Mugs, Gift Boxes', status: 'Request Submitted', totalBudget: '₹19,800', client: 'Rahul Mehta', source: 'manual' },
  { id: 'req-007', requestId: 'BK-REQ-2024-0271', date: '10 Apr 2026', items: 6, itemNames: 'Fitness Bands, Yoga Mats, Resistance...', status: 'Completed', totalBudget: '₹2,34,000', client: 'Amit Patel', source: 'manual' },
  { id: 'req-008', requestId: 'BK-REQ-2024-0265', date: '05 Apr 2026', items: 3, itemNames: 'Smart Plugs, Extension Boards, Adapters', status: 'Exception', totalBudget: '₹52,600', client: 'Rajesh Kumar', source: 'manual' },
  { id: 'req-009', requestId: 'BK-REQ-2024-0258', date: '02 Apr 2026', items: 1, itemNames: 'LED Strip Light (RGB, 5m)', status: 'Quotation in Progress', totalBudget: '₹42,000', client: 'Priya Sharma', source: 'photo_scan', imageAttached: true, detectedProduct: 'LED Strip Light (RGB, 5m)', confidence: 94 },
  {
    id: 'req-010',
    requestId: 'BK-REQ-2024-0250',
    date: '28 Mar 2026',
    items: 2,
    itemNames: 'Necklace, Earrings',
    status: 'Awaiting Approval',
    totalBudget: '₹78,500',
    client: 'Rahul Mehta',
    source: 'manual',
    lineItems: [
      {
        id: 'req-010-line-0',
        name: 'Necklace',
        quantity: 100,
        specs: 'Gold-plated, 18 inch chain',
        rmbCostPerUnit: 42,
        unitPriceInr: 500,
        status: 'Quoted',
      },
      {
        id: 'req-010-line-1',
        name: 'Earrings',
        quantity: 100,
        specs: 'Matching studs, hypoallergenic posts',
        rmbCostPerUnit: 28,
        unitPriceInr: 300,
        status: 'Quoted',
      },
    ],
  },
];

export const mockOrders: OrderRow[] = [
  { id: 'ord-001', orderId: 'BK-ORD-2024-0287', date: '03 May 2026', amount: '₹1,18,450', amountCny: '¥9,876', itemCount: 5, status: 'Payment Confirmed', estimatedDelivery: '28 May 2026', client: 'Rajesh Kumar', itemNames: 'Bluetooth Earbuds, Power Banks, Cables' },
  { id: 'ord-002', orderId: 'BK-ORD-2024-0281', date: '28 Apr 2026', amount: '₹38,900', amountCny: '¥3,241', itemCount: 2, status: 'Sourcing', estimatedDelivery: '25 May 2026', client: 'Amit Patel', itemNames: 'Steel Bottles, Lids' },
  {
    id: 'ord-003',
    orderId: 'BK-ORD-2024-0274',
    date: '22 Apr 2026',
    amount: '₹67,600',
    amountCny: '¥5,633',
    itemCount: 4,
    status: 'Repacking Warehouse',
    estimatedDelivery: '18 May 2026',
    client: 'Sunita Verma',
    itemNames: 'Packaging Boxes, Wrap',
    lineItems: [
      { id: 'ord-003-p1', name: 'Corrugated packaging boxes (medium)', quantity: 200 },
      { id: 'ord-003-p2', name: 'Bubble wrap rolls (500mm)', quantity: 40 },
      { id: 'ord-003-p3', name: 'Kraft tape (heavy duty)', quantity: 120 },
      { id: 'ord-003-p4', name: 'Edge protectors (L-shape)', quantity: 800 },
    ],
  },
  { id: 'ord-004', orderId: 'BK-ORD-2024-0268', date: '16 Apr 2026', amount: '₹2,34,200', amountCny: '¥19,517', itemCount: 6, status: 'Shipped from China', estimatedDelivery: '14 May 2026', client: 'Amit Patel', itemNames: 'Fitness Bands, Yoga Mats' },
  { id: 'ord-005', orderId: 'BK-ORD-2024-0261', date: '10 Apr 2026', amount: '₹52,800', amountCny: '¥4,400', itemCount: 3, status: 'Arrived India Warehouse', estimatedDelivery: '12 May 2026', client: 'Rajesh Kumar', itemNames: 'Smart Plugs, Adapters' },
  { id: 'ord-006', orderId: 'BK-ORD-2024-0255', date: '04 Apr 2026', amount: '₹89,400', amountCny: '¥7,450', itemCount: 4, status: 'Out for Delivery', estimatedDelivery: '11 May 2026', client: 'Priya Sharma', itemNames: 'Phone Cases, Screen Guards' },
  { id: 'ord-007', orderId: 'BK-ORD-2024-0248', date: '28 Mar 2026', amount: '₹1,45,000', amountCny: '¥12,083', itemCount: 7, status: 'Completed', estimatedDelivery: '08 May 2026', client: 'Rahul Mehta', itemNames: 'Office Supplies, Stationery' },
  { id: 'ord-008', orderId: 'BK-ORD-2024-0241', date: '22 Mar 2026', amount: '₹44,300', amountCny: '¥3,692', itemCount: 3, status: 'Exception', estimatedDelivery: 'On Hold', client: 'Rajesh Kumar', itemNames: 'Bluetooth Speakers' },
  { id: 'ord-009', orderId: 'BK-ORD-2024-0235', date: '18 Mar 2026', amount: '₹78,200', amountCny: '¥6,516', itemCount: 5, status: 'In Transit', estimatedDelivery: '16 May 2026', client: 'Amit Patel', itemNames: 'LED Lights, Connectors' },
  { id: 'ord-010', orderId: 'BK-ORD-2024-0229', date: '12 Mar 2026', amount: '₹1,98,500', amountCny: '¥16,541', itemCount: 8, status: 'At China Warehouse', estimatedDelivery: '24 May 2026', client: 'Priya Sharma', itemNames: 'Kitchen Appliances' },
  { id: 'ord-011', orderId: 'BK-ORD-2024-0221', date: '06 Mar 2026', amount: '₹56,900', amountCny: '¥4,742', itemCount: 4, status: 'Payment Pending', estimatedDelivery: '30 May 2026', client: 'Sunita Verma', itemNames: 'Hand Tools, Gloves' },
  { id: 'ord-012', orderId: 'BK-ORD-2024-0215', date: '01 Mar 2026', amount: '₹1,12,300', amountCny: '¥9,358', itemCount: 6, status: 'Completed', estimatedDelivery: '20 Apr 2026', client: 'Rahul Mehta', itemNames: 'Tripods, Camera Bags' },
  { id: 'ord-013', orderId: 'BK-ORD-2024-0208', date: '24 Feb 2026', amount: '₹32,400', amountCny: '¥2,700', itemCount: 2, status: 'Cancelled' as OrderStatus, estimatedDelivery: '-', client: 'Rajesh Kumar', itemNames: 'Power Strips' },
  {
    id: 'ord-022',
    orderId: 'BK-ORD-2024-0199',
    date: '12 May 2026',
    amount: '₹54,200',
    amountCny: '¥4,517',
    itemCount: 2,
    status: 'Repacking Warehouse',
    estimatedDelivery: '22 May 2026',
    client: 'Rajesh Kumar',
    itemNames: 'USB Hubs, Cable organisers',
    lineItems: [
      { id: 'ord-022-p1', name: 'USB 3.0 hub (7-port, powered)', quantity: 80 },
      { id: 'ord-022-p2', name: 'Cable organiser box (medium)', quantity: 80 },
    ],
  },
];

export const kpiData = {
  activeOrders: { value: 6, change: '+2 this week', trend: 'neutral' as const },
  pendingPayments: { value: 2, change: '₹1,56,950 due', trend: 'warning' as const },
  awaitingApproval: { value: 3, change: '2 new quotes', trend: 'action' as const },
  completed: { value: 47, change: '+5 this month', trend: 'positive' as const },
};

// =========== ADMIN DATA ===========
export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  gstin: string;
  totalOrders: number;
  totalSpend: string;
  joinedDate: string;
  status: 'Active' | 'Inactive';
}

export const mockClients: Client[] = [
  { id: 'cli-001', name: 'Rajesh Kumar', company: 'TechImports India', email: 'rajesh@techimports.in', phone: '+91 98765 43210', gstin: '27AABCT3518Q1Z9', totalOrders: 47, totalSpend: '₹24,50,000', joinedDate: '15 Jan 2024', status: 'Active' },
  { id: 'cli-002', name: 'Priya Sharma', company: 'StyleHub Retail', email: 'priya@stylehub.in', phone: '+91 87654 32109', gstin: '29AADCS5732P1ZK', totalOrders: 23, totalSpend: '₹8,70,000', joinedDate: '03 Mar 2024', status: 'Active' },
  { id: 'cli-003', name: 'Amit Patel', company: 'Patel Electronics', email: 'amit@patelelectronics.com', phone: '+91 76543 21098', gstin: '24AAACL0123M1ZE', totalOrders: 61, totalSpend: '₹42,30,000', joinedDate: '22 Nov 2023', status: 'Active' },
  { id: 'cli-004', name: 'Sunita Verma', company: 'Kirana Plus', email: 'sunita@kiranaplus.in', phone: '+91 65432 10987', gstin: '07AABFK4218J1ZQ', totalOrders: 8, totalSpend: '₹3,20,000', joinedDate: '10 Jul 2024', status: 'Inactive' },
  { id: 'cli-005', name: 'Rahul Mehta', company: 'Mehta Trading Co.', email: 'rahul@mehtatrading.in', phone: '+91 54321 09876', gstin: '33AACCM1234S1Z6', totalOrders: 34, totalSpend: '₹18,90,000', joinedDate: '01 Feb 2024', status: 'Active' },
];

export const adminKpis = {
  totalRevenueINR: '₹4,28,50,000',
  activeOrders: 18,
  pendingRequests: 7,
  totalClients: 5,
  exceptions: 2,
  monthlyRevenue: [
    { month: 'Dec', revenue: 4200000 },
    { month: 'Jan', revenue: 5100000 },
    { month: 'Feb', revenue: 4800000 },
    { month: 'Mar', revenue: 6300000 },
    { month: 'Apr', revenue: 7200000 },
    { month: 'May', revenue: 8500000 },
  ],
  ordersByStatus: [
    { name: 'Sourcing', value: 4, color: '#6366F1' },
    { name: 'In China WH', value: 3, color: '#06B6D4' },
    { name: 'In Transit', value: 5, color: '#4A3B52' },
    { name: 'In India', value: 4, color: '#10B981' },
    { name: 'Delivered', value: 12, color: '#059669' },
    { name: 'Exception', value: 2, color: '#EF4444' },
  ],
};

export const recentActivity = [
  { id: 'act-1', type: 'request', icon: '📝', text: 'New request from Priya Sharma — Silicone Phone Cases', time: '5 min ago' },
  { id: 'act-2', type: 'payment', icon: '💰', text: 'Payment confirmed for BK-ORD-2024-0287 — ₹1,18,450', time: '32 min ago' },
  { id: 'act-3', type: 'photo', icon: '📷', text: 'Photo-scan request submitted by Amit Patel — LED Strip Light', time: '1 hour ago' },
  { id: 'act-4', type: 'shipped', icon: '🚢', text: 'BK-ORD-2024-0268 shipped from Shenzhen Port', time: '2 hours ago' },
  { id: 'act-5', type: 'exception', icon: '⚠️', text: 'Exception flagged on BK-ORD-2024-0241 — item shortage', time: '4 hours ago' },
  { id: 'act-6', type: 'quotation', icon: '📄', text: 'Quotation sent to Rajesh Kumar for BK-REQ-2024-0308', time: '6 hours ago' },
  { id: 'act-7', type: 'delivered', icon: '✅', text: 'BK-ORD-2024-0255 delivered to Priya Sharma', time: 'Yesterday' },
  { id: 'act-8', type: 'client', icon: '👤', text: 'New client signed up: Rahul Mehta (Mehta Trading Co.)', time: '2 days ago' },
];

export const pendingActions = [
  { id: 'pa-1', title: '3 quotations awaiting your review', desc: 'New sourcing requests need pricing', action: 'Review Requests', href: '/admin/requests' },
  { id: 'pa-2', title: '2 payment verifications pending', desc: 'Confirm bank receipts for client orders', action: 'Verify Payments', href: '/admin/orders' },
  { id: 'pa-3', title: '1 exception needs resolution', desc: 'Item shortage on BK-ORD-2024-0241', action: 'Resolve Issue', href: '/admin/orders' },
  { id: 'pa-4', title: '2 photo-scan requests received', desc: 'Review AI-detected products', action: 'Process Photos', href: '/admin/requests' },
];

// Shipment carriers + locations
export const statusToLocation: Record<string, { label: string; query: string; progress: number }> = {
  'At China Warehouse':      { label: 'Shenzhen, China',    query: 'Shenzhen China',                 progress: 20 },
  'Repacking Warehouse':     { label: 'Shenzhen, China',    query: 'Shenzhen China',                 progress: 25 },
  'Ready for Shipping':      { label: 'Shenzhen Port',      query: 'Shenzhen Port China',            progress: 35 },
  'Ready for Logistics':     { label: 'Shenzhen Port',      query: 'Shenzhen logistics China',       progress: 36 },
  'Return from China':       { label: 'Return — China',     query: 'Shenzhen China',                 progress: 22 },
  'Shipped from China':      { label: 'South China Sea',    query: 'South China Sea',                progress: 45 },
  'In Transit':              { label: 'Arabian Sea',        query: 'Arabian Sea',                    progress: 65 },
  'Arrived India Warehouse': { label: 'JNPT, Mumbai',       query: 'Jawaharlal Nehru Port Mumbai',   progress: 82 },
  'Out for Delivery':        { label: 'Mumbai, India',      query: 'Mumbai India',                   progress: 94 },
  'Completed':               { label: 'Delivered',          query: 'Mumbai India',                   progress: 100 },
};

export const mockCarriers = [
  { carrier: 'COSCO Shipping', trackingNo: 'COSU123456789CN', mode: 'Sea Freight' },
  { carrier: 'Maersk Line',    trackingNo: 'MAEU987654321IN', mode: 'Sea Freight' },
  { carrier: 'DHL Express',    trackingNo: 'DHL4567891234',   mode: 'Air Freight' },
  { carrier: 'FedEx',          trackingNo: 'FX9876543210',    mode: 'Express' },
];

export function carrierForOrder(orderId: string) {
  let h = 0;
  for (let i = 0; i < orderId.length; i++) h = (h * 31 + orderId.charCodeAt(i)) >>> 0;
  return mockCarriers[h % mockCarriers.length];
}

export const mockNotifications = [
  { id: 'n1', title: 'Quotation Ready', description: 'BK-REQ-2024-0312 quotation is ready for review.', time: '10 min ago', read: false, type: 'request', group: 'Today' },
  { id: 'n2', title: 'Payment Verified', description: 'Your payment for BK-ORD-2024-0287 has been verified.', time: '2 hours ago', read: false, type: 'payment', group: 'Today' },
  { id: 'n3', title: 'Shipment Update', description: 'BK-ORD-2024-0268 left Shenzhen Port.', time: '5 hours ago', read: false, type: 'order', group: 'Today' },
  { id: 'n4', title: 'Photo-Scan Match', description: 'AI identified your product as LED Strip Light (94%).', time: 'Yesterday', read: true, type: 'request', group: 'Yesterday' },
  { id: 'n5', title: 'Exception Alert', description: 'Item out of stock for BK-ORD-2024-0241.', time: '2 days ago', read: true, type: 'alert', group: 'This Week' },
  { id: 'n6', title: 'Delivery Completed', description: 'BK-ORD-2024-0248 delivered successfully.', time: '3 days ago', read: true, type: 'order', group: 'This Week' },
  { id: 'n7', title: 'New Quotation', description: 'Quotation for BK-REQ-2024-0308 received.', time: '1 week ago', read: true, type: 'request', group: 'Earlier' },
];
