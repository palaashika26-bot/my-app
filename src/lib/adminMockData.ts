// Admin-only mock data: suppliers, support tickets, activity logs, etc.
// Re-exports the shared mockData too so admin pages only need one import.

export * from './mockData';

export interface Supplier {
  id: string;
  name: string;
  city: string;
  province: string;
  contactPerson: string;
  phone: string;
  email: string;
  categories: string[];
  rating: number;
  status: 'Active' | 'Inactive';
  joined: string;
  productsCount: number;
}

export const mockSuppliers: Supplier[] = [
  { id: 'sup-001', name: 'Shenzhen Bright Electronics Co.', city: 'Shenzhen', province: 'Guangdong', contactPerson: 'Li Wei',     phone: '+86 138 1234 5678', email: 'liwei@brightelec.cn',   categories: ['Electronics', 'Lighting'],            rating: 4.7, status: 'Active',   joined: '12 Feb 2024', productsCount: 142 },
  { id: 'sup-002', name: 'Yiwu Trading Hub Ltd.',           city: 'Yiwu',     province: 'Zhejiang',  contactPerson: 'Chen Mei',    phone: '+86 139 8765 4321', email: 'chen@yiwutrading.cn',  categories: ['Mobile Accessories', 'Fashion'],     rating: 4.5, status: 'Active',   joined: '03 Mar 2024', productsCount: 287 },
  { id: 'sup-003', name: 'Guangzhou Home Goods Factory',    city: 'Guangzhou',province: 'Guangdong', contactPerson: 'Wang Yang',   phone: '+86 137 1122 3344', email: 'wang@ghgfactory.cn',   categories: ['Kitchenware', 'Home Decor'],         rating: 4.6, status: 'Active',   joined: '18 Jan 2024', productsCount: 96 },
  { id: 'sup-004', name: 'Dongguan Smart Tech Industries',  city: 'Dongguan', province: 'Guangdong', contactPerson: 'Zhang Min',   phone: '+86 136 5566 7788', email: 'zhang@dgsmarttech.cn', categories: ['Electronics', 'IoT'],                rating: 4.8, status: 'Active',   joined: '07 Dec 2023', productsCount: 215 },
  { id: 'sup-005', name: 'Ningbo Packaging Solutions',      city: 'Ningbo',   province: 'Zhejiang',  contactPerson: 'Liu Hua',     phone: '+86 135 9988 7766', email: 'liu@nbpackaging.cn',   categories: ['Packaging'],                          rating: 4.3, status: 'Active',   joined: '22 Apr 2024', productsCount: 54 },
  { id: 'sup-006', name: 'Shanghai Fashion Group',          city: 'Shanghai', province: 'Shanghai',  contactPerson: 'Zhao Lin',    phone: '+86 134 4433 2211', email: 'zhao@shfashion.cn',    categories: ['Fashion', 'Accessories'],            rating: 4.4, status: 'Active',   joined: '15 May 2024', productsCount: 178 },
  { id: 'sup-007', name: 'Hangzhou Office Supplies Co.',    city: 'Hangzhou', province: 'Zhejiang',  contactPerson: 'Sun Jie',     phone: '+86 133 2233 4455', email: 'sun@hzoffice.cn',      categories: ['Office', 'Stationery'],              rating: 4.2, status: 'Active',   joined: '08 Jun 2024', productsCount: 65 },
  { id: 'sup-008', name: 'Xiamen Sports Manufacturing',     city: 'Xiamen',   province: 'Fujian',    contactPerson: 'Huang Bo',    phone: '+86 132 6677 8899', email: 'huang@xmsports.cn',    categories: ['Sports', 'Fitness'],                 rating: 4.6, status: 'Inactive', joined: '11 Mar 2024', productsCount: 84 },
  { id: 'sup-009', name: 'Qingdao Industrial Hardware',     city: 'Qingdao',  province: 'Shandong',  contactPerson: 'Yang Tao',    phone: '+86 131 8877 6655', email: 'yang@qdhardware.cn',   categories: ['Hardware', 'Tools'],                 rating: 4.5, status: 'Active',   joined: '29 Jul 2024', productsCount: 103 },
  { id: 'sup-010', name: 'Foshan Furniture Co.',            city: 'Foshan',   province: 'Guangdong', contactPerson: 'Xu Lei',      phone: '+86 130 4422 1133', email: 'xu@fsfurniture.cn',    categories: ['Furniture', 'Home Decor'],           rating: 4.3, status: 'Active',   joined: '05 Sep 2024', productsCount: 72 },
];

export interface SupportTicket {
  id: string;
  clientName: string;
  clientEmail: string;
  subject: string;
  category: 'Order Issue' | 'Payment' | 'Shipment' | 'General' | 'Account';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  createdAt: string;
  lastReply: string;
  description: string;
}

export const mockTickets: SupportTicket[] = [
  { id: 'TKT-2026-0034', clientName: 'Rajesh Kumar',  clientEmail: 'rajesh@techimports.in',     subject: 'Shipment delayed by 5 days',          category: 'Shipment',     priority: 'High',   status: 'Open',        createdAt: '11 May 2026', lastReply: '5 min ago',   description: 'Order BK-ORD-2024-0268 has been at Shenzhen Port for 5 days, ETA was 10 May.' },
  { id: 'TKT-2026-0033', clientName: 'Priya Sharma',  clientEmail: 'priya@stylehub.in',         subject: 'Wrong items delivered',                category: 'Order Issue',  priority: 'Urgent', status: 'In Progress', createdAt: '10 May 2026', lastReply: '2 hours ago', description: 'Received 80 white cases instead of 100 black cases for BK-ORD-2024-0255.' },
  { id: 'TKT-2026-0032', clientName: 'Amit Patel',    clientEmail: 'amit@patelelectronics.com', subject: 'GST invoice request',                  category: 'Payment',      priority: 'Medium', status: 'Open',        createdAt: '09 May 2026', lastReply: '1 day ago',   description: 'Need GST-compliant invoice for BK-ORD-2024-0268 for accounting purposes.' },
  { id: 'TKT-2026-0031', clientName: 'Sunita Verma',  clientEmail: 'sunita@kiranaplus.in',      subject: 'How to add team member?',              category: 'Account',      priority: 'Low',    status: 'Resolved',    createdAt: '08 May 2026', lastReply: '2 days ago',  description: 'Want to add a colleague to the company account.' },
  { id: 'TKT-2026-0030', clientName: 'Rahul Mehta',   clientEmail: 'rahul@mehtatrading.in',     subject: 'Payment not reflecting',               category: 'Payment',      priority: 'High',   status: 'In Progress', createdAt: '07 May 2026', lastReply: '3 hours ago', description: 'Bank transfer made on 5 May for BK-ORD-2024-0287, still showing as pending.' },
  { id: 'TKT-2026-0029', clientName: 'Rajesh Kumar',  clientEmail: 'rajesh@techimports.in',     subject: 'Catalog product unavailable',          category: 'General',      priority: 'Low',    status: 'Resolved',    createdAt: '05 May 2026', lastReply: '5 days ago',  description: 'LED Strip RGB 10m not available in catalog anymore.' },
  { id: 'TKT-2026-0028', clientName: 'Amit Patel',    clientEmail: 'amit@patelelectronics.com', subject: 'Quotation revision needed',            category: 'Order Issue',  priority: 'Medium', status: 'Open',        createdAt: '04 May 2026', lastReply: '6 days ago',  description: 'Need to revise quotation BK-REQ-2024-0308 — quantity changed.' },
  { id: 'TKT-2026-0027', clientName: 'Priya Sharma',  clientEmail: 'priya@stylehub.in',         subject: 'Damage during transit',                category: 'Shipment',     priority: 'Urgent', status: 'Closed',      createdAt: '01 May 2026', lastReply: '8 days ago',  description: '12 units damaged during transit. Insurance claim processed and refund issued.' },
];

// Expanded admin orders — reuse mockOrders and add more entries
import { mockOrders } from './mockData';
import type { OrderRow } from './mockData';

const extraOrders: OrderRow[] = [
  { id: 'ord-014', orderId: 'BK-ORD-2024-0202', date: '20 Feb 2026', amount: '₹1,76,400', amountCny: '¥14,700', itemCount: 5, status: 'Out for Delivery'         as any, estimatedDelivery: '13 May 2026', client: 'Priya Sharma',  itemNames: 'Silicone Cases, Tempered Glass' },
  { id: 'ord-015', orderId: 'BK-ORD-2024-0198', date: '15 Feb 2026', amount: '₹93,600',  amountCny: '¥7,800',  itemCount: 4, status: 'In Transit'               as any, estimatedDelivery: '17 May 2026', client: 'Amit Patel',    itemNames: 'Bluetooth Speakers, Mounts' },
  { id: 'ord-016', orderId: 'BK-ORD-2024-0195', date: '10 Feb 2026', amount: '₹62,400',  amountCny: '¥5,200',  itemCount: 3, status: 'Shipped from China'      as any, estimatedDelivery: '19 May 2026', client: 'Rahul Mehta',   itemNames: 'Stationery, Pen Sets' },
  { id: 'ord-017', orderId: 'BK-ORD-2024-0190', date: '04 Feb 2026', amount: '₹4,38,000', amountCny: '¥36,500', itemCount: 9, status: 'Sourcing'                 as any, estimatedDelivery: '02 Jun 2026', client: 'Amit Patel',    itemNames: 'Smart Home Devices, Sensors' },
  { id: 'ord-018', orderId: 'BK-ORD-2024-0184', date: '01 Feb 2026', amount: '₹84,000',  amountCny: '¥7,000',  itemCount: 4, status: 'Repacking/QC'             as any, estimatedDelivery: '21 May 2026', client: 'Sunita Verma',  itemNames: 'Kitchen Storage Sets' },
  { id: 'ord-019', orderId: 'BK-ORD-2024-0178', date: '28 Jan 2026', amount: '₹1,32,000', amountCny: '¥11,000', itemCount: 6, status: 'Completed'                as any, estimatedDelivery: '15 Mar 2026', client: 'Rajesh Kumar',  itemNames: 'Office Furniture' },
  { id: 'ord-020', orderId: 'BK-ORD-2024-0172', date: '22 Jan 2026', amount: '₹52,800',  amountCny: '¥4,400',  itemCount: 2, status: 'Completed'                as any, estimatedDelivery: '08 Mar 2026', client: 'Priya Sharma',  itemNames: 'Display Stands' },
  { id: 'ord-021', orderId: 'BK-ORD-2024-0166', date: '14 Jan 2026', amount: '₹1,98,000', amountCny: '¥16,500', itemCount: 7, status: 'Completed'                as any, estimatedDelivery: '01 Mar 2026', client: 'Rahul Mehta',   itemNames: 'Photography Equipment' },
];

export const mockAdminOrders: OrderRow[] = [...mockOrders, ...extraOrders];

// Admin notes timeline on order detail
export const orderNotesLog = [
  { id: 'n1', time: '11 May 2026 • 14:22', actor: 'System',        message: 'Status changed: Sourcing → At China Warehouse',           icon: '📦' },
  { id: 'n2', time: '11 May 2026 • 09:15', actor: 'Arjun Sharma',  message: 'Added internal note: “Client requested early delivery”',  icon: '📝' },
  { id: 'n3', time: '10 May 2026 • 17:48', actor: 'System',        message: 'Payment confirmed: ₹1,18,450 via NEFT',                    icon: '✅' },
  { id: 'n4', time: '08 May 2026 • 11:02', actor: 'Arjun Sharma',  message: 'Sent quotation to client',                                   icon: '📤' },
  { id: 'n5', time: '06 May 2026 • 10:30', actor: 'System',        message: 'Request received from client',                               icon: '📥' },
];
