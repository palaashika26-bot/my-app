'use client';
import React, { useState, useMemo, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ClientLayout from '@/components/ClientLayout';
import { Star, ChevronLeft, Heart, Minus, Plus, CheckCircle2, Truck, ShieldCheck, Tag } from 'lucide-react';

// ─── Product Interface (backend-ready) ───────────────────────────────────────
interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  images: string[];
  rating: number;
  minPrice: number;
  maxPrice: number;
  moq: number;
  origin?: string;
  material?: string;
  weight?: string;
  leadTime: string;
  customization: boolean;
  features: string[];
  specs: Record<string, string>;
  badge?: 'NEW' | 'SALE' | 'HOT';
  isActive: boolean;
  createdAt: string;
  // Catalog-compat fields (populated when reading from existing localStorage)
  emoji?: string;
  priceCny?: string;
  shippingFrom?: string;
  subcategory?: string;
  bg?: string;
}

// ─── Seed products (fallback when localStorage is empty) ─────────────────────
const SEED_PRODUCTS: Product[] = [
  { id: 'p01', name: 'LED Strip Lights RGB 5m',     description: 'High-quality RGB LED strip lights, 5m length with multiple color modes, remote control, and easy peel-and-stick installation.',    categoryId: 'Electronics',           categoryName: 'Electronics',           images: [], rating: 4.2, minPrice: 35,  maxPrice: 55,  moq: 50,  origin: 'Yiwu, China',      material: 'PVC / Copper',          leadTime: '12–15 days', customization: true,  features: ['RGB color-changing modes', '5m length', 'Remote control included', 'Adhesive backing for easy install'],       specs: { Origin: 'Yiwu, China', Material: 'PVC / Copper', MOQ: '50 units', 'Lead Time': '12–15 days', Customization: 'Available' }, badge: undefined, isActive: true, createdAt: '2024-01-01', emoji: '🔌', priceCny: '¥35–55', shippingFrom: 'Yiwu',      subcategory: 'LED Lights & Strips',    bg: 'bg-[#f0eef8]'  },
  { id: 'p02', name: 'Silicone Phone Cases',         description: 'Slim, flexible silicone cases compatible with all major phone models. Shock-absorbing, scratch-resistant with precise cutouts.',         categoryId: 'Mobile Accessories',    categoryName: 'Mobile Accessories',    images: [], rating: 4.5, minPrice: 8,   maxPrice: 15,  moq: 200, origin: 'Guangzhou, China', material: 'Silicone',              leadTime: '7–10 days',  customization: true,  features: ['Compatible with all major models', 'Shock-absorbing edges', 'Scratch-resistant surface', 'Precise button cutouts'],  specs: { Origin: 'Guangzhou, China', Material: 'Silicone', MOQ: '200 units', 'Lead Time': '7–10 days', Customization: 'Available' }, badge: 'SALE', isActive: true, createdAt: '2024-01-05', emoji: '📱', priceCny: '¥8–15',  shippingFrom: 'Guangzhou', subcategory: 'Phone Cases & Covers',   bg: 'bg-[#e4eeee]'  },
  { id: 'p03', name: 'Stainless Steel Bottles',      description: 'Vacuum-insulated 500ml stainless steel water bottles. Keeps beverages hot for 12h and cold for 24h. BPA-free.',                         categoryId: 'Kitchenware',           categoryName: 'Kitchenware',           images: [], rating: 4.3, minPrice: 18,  maxPrice: 28,  moq: 100, origin: 'Yiwu, China',      material: 'Stainless Steel',       leadTime: '10–14 days', customization: true,  features: ['Vacuum insulation (hot 12h / cold 24h)', 'BPA-free materials', '500ml capacity', 'Leak-proof lid'],                   specs: { Origin: 'Yiwu, China', Material: 'Stainless Steel', MOQ: '100 units', 'Lead Time': '10–14 days', Customization: 'Available' }, badge: undefined, isActive: true, createdAt: '2024-01-10', emoji: '🍶', priceCny: '¥18–28', shippingFrom: 'Yiwu',      subcategory: 'Water Bottles & Flasks', bg: 'bg-cyan-100'   },
  { id: 'p04', name: 'Bluetooth Earbuds TWS',        description: 'True wireless stereo earbuds with active noise cancellation, 30h total battery life, IPX5 water resistance, and touch controls.',       categoryId: 'Mobile Accessories',    categoryName: 'Mobile Accessories',    images: [], rating: 4.7, minPrice: 45,  maxPrice: 80,  moq: 50,  origin: 'Shenzhen, China',  material: 'ABS Plastic',           leadTime: '14–18 days', customization: false, features: ['Active noise cancellation', '30h total battery', 'IPX5 water resistance', 'Touch controls'],                          specs: { Origin: 'Shenzhen, China', Material: 'ABS Plastic', MOQ: '50 units', 'Lead Time': '14–18 days', Customization: 'Not Available' }, badge: 'NEW', isActive: true, createdAt: '2024-02-01', emoji: '🎧', priceCny: '¥45–80', shippingFrom: 'Shenzhen',  subcategory: 'Earphones & Earbuds',    bg: 'bg-purple-100' },
  { id: 'p05', name: 'Power Banks 10000mAh',         description: 'Compact 10000mAh power banks with dual USB-A and USB-C ports. Supports 18W fast charging and features a built-in LED indicator.',       categoryId: 'Electronics',           categoryName: 'Electronics',           images: [], rating: 4.4, minPrice: 65,  maxPrice: 95,  moq: 30,  origin: 'Shenzhen, China',  material: 'ABS / Lithium-Ion',     leadTime: '14–18 days', customization: false, features: ['10000mAh capacity', 'Dual USB-A + USB-C output', '18W fast charging', 'LED battery indicator'],                         specs: { Origin: 'Shenzhen, China', Material: 'ABS / Lithium-Ion', MOQ: '30 units', 'Lead Time': '14–18 days', Customization: 'Not Available' }, badge: undefined, isActive: true, createdAt: '2024-01-15', emoji: '🔋', priceCny: '¥65–95', shippingFrom: 'Shenzhen',  subcategory: 'Batteries & Power Banks', bg: 'bg-emerald-100'},
  { id: 'p06', name: 'Wireless Mouse',               description: 'Ergonomic 2.4GHz wireless mouse with silent clicks, adjustable DPI (800–2400), and a 12-month battery life on a single AA battery.',   categoryId: 'Electronics',           categoryName: 'Electronics',           images: [], rating: 3.9, minPrice: 22,  maxPrice: 35,  moq: 50,  origin: 'Guangzhou, China', material: 'ABS Plastic',           leadTime: '10–12 days', customization: false, features: ['Silent click design', 'Adjustable DPI 800–2400', '12-month battery life', '2.4GHz wireless'],                          specs: { Origin: 'Guangzhou, China', Material: 'ABS Plastic', MOQ: '50 units', 'Lead Time': '10–12 days', Customization: 'Not Available' }, badge: undefined, isActive: true, createdAt: '2024-01-08', emoji: '🖱️', priceCny: '¥22–35', shippingFrom: 'Guangzhou', subcategory: 'Cables & Connectors',    bg: 'bg-slate-100'  },
  { id: 'p07', name: 'Resistance Bands Set',         description: 'Set of 5 latex resistance bands with varying tension levels (10–50 lbs). Includes carry bag and exercise guide.',                        categoryId: 'Sports & Fitness',      categoryName: 'Sports & Fitness',      images: [], rating: 4.1, minPrice: 15,  maxPrice: 25,  moq: 100, origin: 'Yiwu, China',      material: 'Natural Latex',         leadTime: '8–12 days',  customization: true,  features: ['5 resistance levels (10–50 lbs)', 'Natural latex material', 'Includes carry bag', 'Exercise guide included'],            specs: { Origin: 'Yiwu, China', Material: 'Natural Latex', MOQ: '100 units', 'Lead Time': '8–12 days', Customization: 'Available' }, badge: 'SALE', isActive: true, createdAt: '2024-01-20', emoji: '💪', priceCny: '¥15–25', shippingFrom: 'Yiwu',      subcategory: 'Exercise Equipment',     bg: 'bg-rose-100'   },
  { id: 'p08', name: 'Soap Dispenser Pump',          description: 'Refillable 300ml wall-mounted or countertop soap dispenser in matte finish. Compatible with liquid soap, lotion, and hand sanitizer.',   categoryId: 'Kitchenware',           categoryName: 'Kitchenware',           images: [], rating: 4.0, minPrice: 12,  maxPrice: 20,  moq: 100, origin: 'Yiwu, China',      material: 'ABS / Stainless Steel', leadTime: '8–12 days',  customization: true,  features: ['300ml capacity', 'Wall-mount or countertop use', 'Matte finish', 'Refillable design'],                                  specs: { Origin: 'Yiwu, China', Material: 'ABS / Stainless Steel', MOQ: '100 units', 'Lead Time': '8–12 days', Customization: 'Available' }, badge: undefined, isActive: true, createdAt: '2024-01-12', emoji: '🧴', priceCny: '¥12–20', shippingFrom: 'Yiwu',      subcategory: 'Kitchen Tools & Gadgets', bg: 'bg-teal-100'  },
  { id: 'p09', name: 'USB-C Cables (Braided)',       description: 'Heavy-duty braided USB-C cables, 1.2m length, supporting 60W fast charging and 480Mbps data transfer. Available in multiple colors.',   categoryId: 'Electronics',           categoryName: 'Electronics',           images: [], rating: 4.6, minPrice: 6,   maxPrice: 12,  moq: 200, origin: 'Shenzhen, China',  material: 'Nylon Braid / Copper',  leadTime: '7–10 days',  customization: true,  features: ['60W fast charging support', '480Mbps data transfer', 'Braided nylon sleeve', '1.2m length', 'Multi-color options'],     specs: { Origin: 'Shenzhen, China', Material: 'Nylon Braid / Copper', MOQ: '200 units', 'Lead Time': '7–10 days', Customization: 'Available' }, badge: 'SALE', isActive: true, createdAt: '2024-01-03', emoji: '🔌', priceCny: '¥6–12',  shippingFrom: 'Shenzhen',  subcategory: 'Cables & Connectors',    bg: 'bg-indigo-100' },
  { id: 'p10', name: 'Storage Box Organiser',        description: 'Stackable collapsible storage boxes in 3 sizes. Made from non-woven fabric with reinforced handles. Ideal for clothes and household items.',categoryId: 'Home & Decor',          categoryName: 'Home & Decor',          images: [], rating: 3.8, minPrice: 8,   maxPrice: 15,  moq: 50,  origin: 'Shanghai, China',  material: 'Non-Woven Fabric',      leadTime: '10–14 days', customization: false, features: ['Collapsible design', 'Stackable', 'Reinforced handles', 'Available in 3 sizes'],                                         specs: { Origin: 'Shanghai, China', Material: 'Non-Woven Fabric', MOQ: '50 units', 'Lead Time': '10–14 days', Customization: 'Not Available' }, badge: undefined, isActive: false, createdAt: '2024-01-25', emoji: '📦', priceCny: '¥8–15',  shippingFrom: 'Shanghai',  subcategory: 'Furniture & Storage',    bg: 'bg-yellow-100' },
  { id: 'p11', name: 'Canvas Tote Bags',             description: '100% cotton canvas tote bags with natural rope handles. 38×42cm, 320gsm weight. Ideal for grocery, retail, and promotional use.',         categoryId: 'Bags & Luggage',        categoryName: 'Bags & Luggage',        images: [], rating: 4.2, minPrice: 10,  maxPrice: 18,  moq: 100, origin: 'Guangzhou, China', material: 'Cotton Canvas',         leadTime: '10–15 days', customization: true,  features: ['100% cotton canvas', 'Natural rope handles', '38×42cm size', '320gsm weight', 'Custom print available'],                specs: { Origin: 'Guangzhou, China', Material: 'Cotton Canvas', MOQ: '100 units', 'Lead Time': '10–15 days', Customization: 'Available' }, badge: 'NEW', isActive: true, createdAt: '2024-02-10', emoji: '🎒', priceCny: '¥10–18', shippingFrom: 'Guangzhou', subcategory: 'Handbags & Purses',      bg: 'bg-pink-100'   },
  { id: 'p12', name: 'Smart Plug WiFi 16A',          description: '16A smart WiFi plug compatible with Alexa, Google Home, and Tuya. Features energy monitoring, timer, and schedule functions.',             categoryId: 'Electronics',           categoryName: 'Electronics',           images: [], rating: 4.8, minPrice: 18,  maxPrice: 28,  moq: 50,  origin: 'Shenzhen, China',  material: 'ABS / Flame Retardant', leadTime: '12–16 days', customization: false, features: ['16A load capacity', 'Alexa & Google Home compatible', 'Energy monitoring', 'Timer & schedule function'],                 specs: { Origin: 'Shenzhen, China', Material: 'ABS / Flame Retardant', MOQ: '50 units', 'Lead Time': '12–16 days', Customization: 'Not Available' }, badge: 'NEW', isActive: true, createdAt: '2024-02-05', emoji: '🏮', priceCny: '¥18–28', shippingFrom: 'Shenzhen',  subcategory: 'Smart Home Devices',     bg: 'bg-amber-100'  },
  { id: 'p13', name: 'Gold Plated Necklace Set',     description: '18K gold plated necklace and earring set with anti-tarnish coating. Includes gift box packaging. Suitable for wholesale or gifting.',     categoryId: 'Jewellery',             categoryName: 'Jewellery',             images: [], rating: 4.3, minPrice: 25,  maxPrice: 45,  moq: 50,  origin: 'Yiwu, China',      material: 'Gold Plated',           leadTime: '10–14 days', customization: true,  features: ['18K gold plating', 'Anti-tarnish coating', 'Necklace + earring set', 'Gift box included'],                               specs: { Origin: 'Yiwu, China', Material: 'Gold Plated Alloy', MOQ: '50 units', 'Lead Time': '10–14 days', Customization: 'Available' }, badge: 'NEW', isActive: true, createdAt: '2024-02-15', emoji: '✨', priceCny: '¥25–45', shippingFrom: 'Yiwu',      subcategory: 'Necklaces & Chains',     bg: 'bg-yellow-100' },
  { id: 'p14', name: 'Silver Stud Earrings',         description: '925 sterling silver stud earrings with zirconia stones. Hypoallergenic and nickel-free. Assorted designs, sold by the dozen.',            categoryId: 'Jewellery',             categoryName: 'Jewellery',             images: [], rating: 4.5, minPrice: 12,  maxPrice: 22,  moq: 100, origin: 'Yiwu, China',      material: 'Silver Plated',         leadTime: '8–12 days',  customization: false, features: ['925 sterling silver', 'Zirconia stone setting', 'Hypoallergenic & nickel-free', 'Assorted designs'],                     specs: { Origin: 'Yiwu, China', Material: 'Sterling Silver', MOQ: '100 units', 'Lead Time': '8–12 days', Customization: 'Not Available' }, badge: 'SALE', isActive: true, createdAt: '2024-01-28', emoji: '💎', priceCny: '¥12–22', shippingFrom: 'Yiwu',      subcategory: 'Earrings & Studs',       bg: 'bg-slate-100'  },
  { id: 'p15', name: "Women's Cotton Kurta",         description: "Lightweight 100% cotton kurta in assorted prints. Available in sizes S–XXL. Suitable for casual and festive wear. Custom prints available.", categoryId: 'Clothing & Apparel',    categoryName: 'Clothing & Apparel',    images: [], rating: 4.0, minPrice: 30,  maxPrice: 55,  moq: 50,  origin: 'Guangzhou, China', material: 'Cotton',                leadTime: '15–20 days', customization: true,  features: ['100% cotton fabric', 'Sizes S–XXL available', 'Assorted prints', 'Custom print on request'],                             specs: { Origin: 'Guangzhou, China', Material: '100% Cotton', MOQ: '50 units', 'Lead Time': '15–20 days', Customization: 'Available' }, badge: 'NEW', isActive: true, createdAt: '2024-02-20', emoji: '👗', priceCny: '¥30–55', shippingFrom: 'Guangzhou', subcategory: "Women's Wear",            bg: 'bg-pink-100'   },
  { id: 'p16', name: 'Educational Building Blocks',  description: '180-piece wooden building blocks set in a reusable storage box. Non-toxic paint, smooth edges, suitable for ages 3+.',                     categoryId: 'Toys & Games',          categoryName: 'Toys & Games',          images: [], rating: 4.4, minPrice: 18,  maxPrice: 35,  moq: 100, origin: 'Yiwu, China',      material: 'Solid Wood',            leadTime: '12–16 days', customization: false, features: ['180-piece set', 'Non-toxic paint', 'Smooth rounded edges', 'Reusable storage box', 'Ages 3+'],                            specs: { Origin: 'Yiwu, China', Material: 'Solid Wood', MOQ: '100 units', 'Lead Time': '12–16 days', Customization: 'Not Available' }, badge: undefined, isActive: true, createdAt: '2024-01-18', emoji: '🧸', priceCny: '¥18–35', shippingFrom: 'Yiwu',      subcategory: 'Educational Toys',       bg: 'bg-emerald-100'},
  { id: 'p17', name: 'Jade Roller Face Massager',    description: 'Real jade stone face roller with dual-end design. Helps reduce puffiness, improve blood circulation, and enhance absorption of serums.',    categoryId: 'Beauty & Personal Care',categoryName: 'Beauty & Personal Care',images: [], rating: 4.6, minPrice: 15,  maxPrice: 28,  moq: 50,  origin: 'Guangzhou, China', material: 'Natural Jade',          leadTime: '8–12 days',  customization: true,  features: ['Real jade stone', 'Dual-end roller', 'Reduces puffiness', 'Enhances serum absorption', 'Includes gift box'],             specs: { Origin: 'Guangzhou, China', Material: 'Natural Jade + Metal', MOQ: '50 units', 'Lead Time': '8–12 days', Customization: 'Available' }, badge: 'SALE', isActive: true, createdAt: '2024-01-22', emoji: '🌿', priceCny: '¥15–28', shippingFrom: 'Guangzhou', subcategory: 'Skincare Tools',          bg: 'bg-green-100'  },
  { id: 'p18', name: 'Yoga Mat Premium TPE',         description: 'Eco-friendly TPE yoga mat, 6mm thick, 183×61cm. Non-slip surface on both sides, odourless, and comes with carrying strap.',                categoryId: 'Sports & Fitness',      categoryName: 'Sports & Fitness',      images: [], rating: 4.2, minPrice: 25,  maxPrice: 45,  moq: 50,  origin: 'Shanghai, China',  material: 'TPE',                   leadTime: '12–15 days', customization: false, features: ['Eco-friendly TPE material', '6mm thickness', '183×61cm size', 'Non-slip both sides', 'Includes carrying strap'],          specs: { Origin: 'Shanghai, China', Material: 'TPE', MOQ: '50 units', 'Lead Time': '12–15 days', Customization: 'Not Available' }, badge: undefined, isActive: false, createdAt: '2024-01-30', emoji: '🧘', priceCny: '¥25–45', shippingFrom: 'Shanghai',  subcategory: 'Exercise Equipment',     bg: 'bg-violet-100' },
  { id: 'p19', name: 'Canvas Wall Art Prints',       description: 'Ready-to-hang canvas wall art in multiple sizes (30×40cm to 60×80cm). Fade-resistant UV inks, pine wood frame, various themes.',           categoryId: 'Home & Decor',          categoryName: 'Home & Decor',          images: [], rating: 3.9, minPrice: 20,  maxPrice: 40,  moq: 30,  origin: 'Yiwu, China',      material: 'Canvas / Pine Wood',    leadTime: '12–16 days', customization: true,  features: ['Fade-resistant UV inks', 'Pine wood frame', 'Multiple sizes available', 'Various themes', 'Custom print available'],       specs: { Origin: 'Yiwu, China', Material: 'Canvas / Pine Wood', MOQ: '30 units', 'Lead Time': '12–16 days', Customization: 'Available' }, badge: 'NEW', isActive: true, createdAt: '2024-02-25', emoji: '🖼️', priceCny: '¥20–40', shippingFrom: 'Yiwu',      subcategory: 'Wall Decor',             bg: 'bg-rose-100'   },
  { id: 'p20', name: 'Business Laptop Backpack',     description: '35L waterproof laptop backpack with USB charging port and anti-theft back pocket. Fits up to 17-inch laptops. Padded shoulder straps.',   categoryId: 'Bags & Luggage',        categoryName: 'Bags & Luggage',        images: [], rating: 4.7, minPrice: 55,  maxPrice: 85,  moq: 30,  origin: 'Guangzhou, China', material: 'Oxford Polyester',      leadTime: '12–15 days', customization: true,  features: ['35L capacity', 'Waterproof Oxford fabric', 'USB charging port', 'Anti-theft back pocket', 'Fits 17" laptops'],            specs: { Origin: 'Guangzhou, China', Material: 'Oxford Polyester', MOQ: '30 units', 'Lead Time': '12–15 days', Customization: 'Available' }, badge: undefined, isActive: true, createdAt: '2024-01-15', emoji: '💼', priceCny: '¥55–85', shippingFrom: 'Guangzhou', subcategory: 'Backpacks',              bg: 'bg-sky-100'    },
];

// ─── Data fetching (swap these functions for API calls in production) ─────────
const CNY_TO_INR = 11.5;

async function getProduct(id: string): Promise<Product | null> {
  try {
    console.log('=== PRODUCT DEBUG ===');
    console.log('URL param id:', id);
    console.log('Raw localStorage key used:', 'bk-catalog-products');
    const raw = localStorage.getItem('bk-catalog-products');
    const products = JSON.parse(raw || '[]') as Array<Record<string, unknown>>;
    console.log('Products found in storage:', products.length);
    console.log('Product IDs available:', products.map(p => p.id || p.productId || p._id));
    const mapped = products.map(mapAdminProduct);
    console.log('Mapped IDs:', mapped.map(p => p.id));
    const found = mapped.find(p =>
      p.id === id ||
      p.id === decodeURIComponent(id)
    );
    if (found) return found;
  } catch {}
  // fallback: seed products cover the case where localStorage is empty or product missing
  return SEED_PRODUCTS.find(p => p.id === id) ?? null;
}

async function getRelatedProducts(categoryId: string, excludeId: string): Promise<Product[]> {
  // TODO: replace with API call → return await fetch(`/api/products?category=${categoryId}&limit=6`)
  try {
    const stored = localStorage.getItem('bk-catalog-products');
    if (stored) {
      const adminProducts = JSON.parse(stored) as Array<Record<string, unknown>>;
      const fromAdmin = adminProducts
        .filter(p => String(p.category) === categoryId && String(p.id) !== excludeId)
        .slice(0, 6)
        .map(mapAdminProduct);
      if (fromAdmin.length > 0) return fromAdmin;
    }
  } catch {}
  return SEED_PRODUCTS.filter(p => p.categoryId === categoryId && p.id !== excludeId).slice(0, 6);
}

function parsePriceCny(priceCny: unknown): { min: number; max: number } {
  const str = String(priceCny ?? '').replace(/[¥\s]/g, '');
  const match = str.match(/^([\d.]+)[–\-]([\d.]+)$/);
  if (match) return { min: Number(match[1]), max: Number(match[2]) };
  const single = Number(str.replace(/[^0-9.]/g, ''));
  return { min: single || 0, max: single || 0 };
}

function mapAdminProduct(ap: Record<string, unknown>): Product {
  const seed = SEED_PRODUCTS.find(s => s.id === String(ap.id));
  const specsArr = Array.isArray(ap.specifications)
    ? (ap.specifications as Array<{ key: string; value: string }>)
    : [];
  const price = parsePriceCny(ap.priceCny);
  return {
    id: String(ap.id),
    name: String(ap.name ?? ''),
    description: String(ap.fullDescription ?? ap.shortDescription ?? ''),
    categoryId: String(ap.category ?? ''),
    categoryName: String(ap.category ?? ''),
    images: Array.isArray(ap.images) ? (ap.images as string[]) : [],
    rating: seed?.rating ?? 4.0,
    minPrice: price.min || seed?.minPrice || 0,
    maxPrice: price.max || seed?.maxPrice || 0,
    moq: Number(ap.moq) || 50,
    origin: String(ap.origin ?? ap.originCity ?? seed?.origin ?? 'China'),
    material: String(ap.material ?? seed?.material ?? ''),
    weight: String(ap.weight ?? seed?.weight ?? ''),
    leadTime: String(ap.leadTime ?? seed?.leadTime ?? '12–15 days'),
    customization: Boolean(ap.customization ?? seed?.customization ?? false),
    features: Array.isArray(ap.keyFeatures) ? (ap.keyFeatures as string[]).filter(Boolean) : (seed?.features ?? []),
    specs: specsArr.length > 0
      ? Object.fromEntries(specsArr.filter(s => s.key).map(s => [s.key, s.value]))
      : (seed?.specs ?? {}),
    badge: seed?.badge,
    isActive: seed?.isActive ?? true,
    createdAt: seed?.createdAt ?? '2024-01-01',
    emoji: String(ap.emoji ?? seed?.emoji ?? '📦'),
    priceCny: String(ap.priceCny ?? ''),
    shippingFrom: String(ap.originCity ?? seed?.shippingFrom ?? 'Yiwu'),
    subcategory: String(ap.subcategory ?? seed?.subcategory ?? ''),
    bg: String(ap.bg ?? seed?.bg ?? 'bg-[#e4eeee]'),
  };
}

// ─── Star rating component ────────────────────────────────────────────────────
function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
        />
      ))}
      <span className="ml-1.5 text-sm font-600 text-[#111111]">{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [inWishlist, setInWishlist] = useState(false);
  const [activeSection, setActiveSection] = useState<'description' | 'specs' | 'features'>('description');

  // Social proof numbers — generated once, never re-render flicker
  const viewers = useMemo(() => Math.floor(Math.random() * (35 - 8 + 1)) + 8, []);
  const quoteRequests = useMemo(() => Math.floor(Math.random() * (8 - 3 + 1)) + 3, []);

  useEffect(() => {
    async function load() {
      const p = await getProduct(id);
      setProduct(p);
      if (p) {
        setQty(p.moq);
        const rel = await getRelatedProducts(p.categoryId, p.id);
        setRelated(rel);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!product) return;
    try {
      const saved: string[] = JSON.parse(localStorage.getItem('wishlist-products') ?? '[]');
      setInWishlist(saved.includes(product.id));
    } catch {}
  }, [product]);

  function toggleWishlist() {
    if (!product) return;
    try {
      const saved: string[] = JSON.parse(localStorage.getItem('wishlist-products') ?? '[]');
      const next = inWishlist ? saved.filter(id => id !== product.id) : [...saved, product.id];
      localStorage.setItem('wishlist-products', JSON.stringify(next));
      setInWishlist(!inWishlist);
    } catch {}
  }

  function decrementQty() {
    if (!product) return;
    setQty(q => Math.max(product.moq, q - (product.moq >= 100 ? 10 : 1)));
  }
  function incrementQty() {
    if (!product) return;
    setQty(q => q + (product.moq >= 100 ? 10 : 1));
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <ClientLayout>
        <div className="max-w-6xl mx-auto animate-pulse">
          <div className="h-4 w-48 bg-muted rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-muted rounded-2xl" />
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-10 bg-muted rounded w-1/3" />
              <div className="h-20 bg-muted rounded" />
              <div className="h-12 bg-muted rounded" />
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  // ── Not found ───────────────────────────────────────────────────────────────
  if (!product) {
    return (
      <ClientLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-700 mb-2">Product not found</h2>
          <p className="text-sm text-muted-foreground mb-6">This product may have been removed or the link is incorrect.</p>
          <Link href="/catalog" className="btn-primary px-8 py-3 text-sm">Back to Catalog</Link>
        </div>
      </ClientLayout>
    );
  }

  const images = product.images.length > 0 ? product.images : [];
  const hasImages = images.length > 0;
  const hasMultipleImages = images.length > 1;
  const inrMin = Math.round(product.minPrice * CNY_TO_INR);
  const inrMax = Math.round(product.maxPrice * CNY_TO_INR);
  const showInr = product.minPrice > 0;

  return (
    <ClientLayout>
      <div className="max-w-6xl mx-auto">

        {/* ── Back button (mobile) ─────────────────────────────────────── */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 md:hidden transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {/* ── Breadcrumb ───────────────────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-1.5 text-xs text-[#888888] mb-6 flex-wrap">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link href="/catalog" className="hover:text-foreground transition-colors">Product Catalog</Link>
          <span>/</span>
          <Link href={`/catalog?category=${product.categoryId}`} className="hover:text-foreground transition-colors">{product.categoryName}</Link>
          <span>/</span>
          <span className="text-foreground font-500 truncate max-w-[200px]">{product.name}</span>
        </nav>

        {/* ── Two-column layout ────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row gap-6 lg:gap-10">

          {/* ════ LEFT COLUMN — IMAGE GALLERY ════════════════════════════ */}
          <div className="w-full md:w-[45%] flex-shrink-0">
            <div className="flex gap-3">

              {/* Vertical thumbnail strip (only when >1 image) */}
              {hasMultipleImages && (
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${activeImg === i ? 'border-[#4A3B52] shadow-sm' : 'border-[#e5e5e5] hover:border-[#4A3B52]/50'}`}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Main image */}
              <div className="flex-1 aspect-square rounded-2xl overflow-hidden border border-[#e5e5e5] bg-[#f5f5f5] flex items-center justify-center relative">
                {hasImages ? (
                  <img
                    src={images[activeImg]}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-8xl select-none">{product.emoji ?? '📦'}</span>
                )}
                {product.badge && (
                  <span className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-700 text-white ${product.badge === 'NEW' ? 'bg-emerald-500' : product.badge === 'SALE' ? 'bg-red-500' : 'bg-orange-500'}`}>
                    {product.badge}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ════ RIGHT COLUMN — PRODUCT INFO ════════════════════════════ */}
          <div className="flex-1 min-w-0">

            {/* Breadcrumb mobile */}
            <p className="text-xs text-[#888888] mb-2 md:hidden">{product.categoryName}{product.subcategory ? ` › ${product.subcategory}` : ''}</p>

            {/* 1. Product title */}
            <h1 className="text-2xl md:text-3xl font-700 text-[#111111] leading-tight mb-3">{product.name}</h1>

            {/* 2. Social proof row */}
            <div className="flex flex-col gap-1.5 mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <StarRow rating={product.rating} />
                <span className="text-xs text-[#888888]">•</span>
                <span className="text-xs text-[#888888]">{viewers} people viewing right now</span>
              </div>
              <p className="text-xs text-orange-600 font-500">
                🔥 Selling fast! Over {quoteRequests} people have this in their quote requests
              </p>
            </div>

            {/* 3. Price section */}
            <div className="bg-[#F8F9F9] border border-[#e5e5e5] rounded-xl p-4 mb-4">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-700 text-[#111111]">
                  {product.priceCny
                    ? product.priceCny
                    : product.minPrice > 0 ? `¥${product.minPrice}–${product.maxPrice}` : '—'}
                </span>
                <span className="text-sm text-muted-foreground">/ unit (CNY)</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">MOQ: <span className="font-600 text-[#111111]">{product.moq} units</span></p>
              {showInr && (
                <p className="text-sm text-emerald-700 mt-1 font-500">≈ ₹{inrMin.toLocaleString('en-IN')}–₹{inrMax.toLocaleString('en-IN')} / unit (indicative)</p>
              )}
            </div>

            {/* 4. Trust badges */}
            <div className="flex gap-2 flex-wrap mb-4">
              {[
                { icon: '🛡️', text: '101% Original' },
                { icon: '💰', text: 'Lowest Price' },
              ].map(b => (
                <div key={b.text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f5f5f5] border border-[#e5e5e5] text-xs font-600 text-[#111111]">
                  <span>{b.icon}</span> {b.text}
                </div>
              ))}
            </div>

            {/* 4b. Product Details */}
            {product.description && (
              <div className="bg-white border border-[#C8BEE0] rounded-xl overflow-hidden mb-4">
                <div className="px-4 py-3 border-b border-[#C8BEE0]">
                  <h3 className="text-xs font-700 text-[#111111] uppercase tracking-wide">Product Details</h3>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-[#444444] leading-relaxed">{product.description}</p>
                </div>
              </div>
            )}

            {/* 5. Quantity selector */}
            <div className="mb-4">
              <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2 block">
                Quantity (Min. {product.moq} units)
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={decrementQty}
                  disabled={qty <= product.moq}
                  className="w-10 h-10 rounded-lg border border-[#e5e5e5] flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-20 text-center font-700 text-lg text-[#111111]">{qty.toLocaleString()}</span>
                <button
                  onClick={incrementQty}
                  className="w-10 h-10 rounded-lg border border-[#e5e5e5] flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 6. Action buttons */}
            <div className="flex flex-col gap-2.5 mb-4">
              <button
                onClick={() => router.push(`/catalog/${product.id}/quote`)}
                className="btn-primary w-full py-3.5 text-sm font-600"
              >
                Request Quotation
              </button>
              <button
                onClick={toggleWishlist}
                className={`w-full py-3.5 text-sm font-600 rounded-full border-2 transition-colors min-h-[44px] ${inWishlist ? 'bg-[#f0eef8] border-[#5c5470] text-[#5c5470]' : 'border-[#1a1a1a] text-[#1a1a1a] hover:bg-muted'}`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Heart className={`w-4 h-4 ${inWishlist ? 'fill-[#5c5470]' : ''}`} />
                  {inWishlist ? 'Saved to Wishlist' : 'Add to Wishlist'}
                </span>
              </button>
            </div>

            {/* 7. Delivery info */}
            <div className="border border-[#e5e5e5] rounded-xl p-4 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-600 text-[#111111]">Estimated Delivery</p>
                  <p className="text-xs text-muted-foreground">15–25 business days after production</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-600 text-[#111111]">Shipping &amp; Returns</p>
                  <p className="text-xs text-muted-foreground">On bulk orders above MOQ</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Detailed sections ────────────────────────────────────────── */}
        <div className="mt-10 space-y-4">

          {/* A. Description */}
          <div className="bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left"
              onClick={() => setActiveSection(s => s === 'description' ? 'description' : 'description')}
            >
              <h2 className="font-700 text-[#111111]">Description</h2>
            </button>
            <div className="px-5 pb-5 border-t border-[#e5e5e5]">
              <p className="text-sm text-muted-foreground leading-relaxed mt-4">
                {product.description || 'No description available.'}
              </p>
            </div>
          </div>

          {/* B. Specifications */}
          <div className="bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden">
            <div className="px-5 py-4">
              <h2 className="font-700 text-[#111111]">Specifications</h2>
            </div>
            <div className="border-t border-[#e5e5e5]">
              {Object.keys(product.specs).length > 0 ? (
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(product.specs).map(([k, v], i) => (
                      <tr key={k} className={i % 2 === 0 ? 'bg-[#F8F9F9]' : 'bg-white'}>
                        <td className="px-5 py-3 font-600 text-muted-foreground w-2/5">{k}</td>
                        <td className="px-5 py-3 text-[#111111]">{v}</td>
                      </tr>
                    ))}
                    <tr className={Object.keys(product.specs).length % 2 === 0 ? 'bg-[#F8F9F9]' : 'bg-white'}>
                      <td className="px-5 py-3 font-600 text-muted-foreground">Customization</td>
                      <td className="px-5 py-3 text-[#111111]">{product.customization ? 'Available' : 'Not Available'}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div className="px-5 py-4 space-y-0">
                  {[
                    ['Origin', product.origin || '—'],
                    ['Material', product.material || '—'],
                    ['MOQ', `${product.moq} units`],
                    ['Lead Time', product.leadTime || '—'],
                    ['Customization', product.customization ? 'Available' : 'Not Available'],
                  ].map(([k, v], i) => (
                    <div key={k} className={`flex gap-4 py-3 border-b border-[#C8BEE0] last:border-0 ${i % 2 === 0 ? 'bg-[#F8F9F9]' : ''}`}>
                      <span className="text-sm font-600 text-muted-foreground w-2/5 px-5">{k}</span>
                      <span className="text-sm text-[#111111]">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* C. Features (only if non-empty) */}
          {product.features.length > 0 && (
            <div className="bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden">
              <div className="px-5 py-4">
                <h2 className="font-700 text-[#111111]">Features &amp; Highlights</h2>
              </div>
              <ul className="border-t border-[#e5e5e5] px-5 py-4 space-y-2.5">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[#111111]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Related Products ─────────────────────────────────────────── */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-700 text-[#111111] mb-5">Related Products</h2>

            {/* Horizontal scroll mobile / grid desktop */}
            <div className="flex md:grid md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-hide">
              {related.map(p => (
                <div
                  key={p.id}
                  className="flex-shrink-0 w-40 md:w-auto bg-white rounded-xl border border-[#e5e5e5] shadow-sm overflow-hidden card-hover cursor-pointer"
                  onClick={() => router.push(`/catalog/${p.id}`)}
                >
                  <div className={`aspect-square ${p.bg ?? 'bg-[#e4eeee]'} flex items-center justify-center text-4xl relative`}>
                    {p.images.length > 0
                      ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      : <span className="select-none">{p.emoji ?? '📦'}</span>
                    }
                    {p.badge && (
                      <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-700 text-white ${p.badge === 'NEW' ? 'bg-emerald-500' : p.badge === 'SALE' ? 'bg-red-500' : 'bg-orange-500'}`}>
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-600 text-[#111111] leading-tight line-clamp-2">{p.name}</p>
                    <div className="flex items-center gap-0.5 mt-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-[10px] text-muted-foreground">{p.rating.toFixed(1)}</span>
                    </div>
                    <p className="text-xs font-700 text-[#111111] mt-1">
                      {p.priceCny ?? (p.minPrice > 0 ? `¥${p.minPrice}–${p.maxPrice}` : '—')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">MOQ: {p.moq}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>

    </ClientLayout>
  );
}
