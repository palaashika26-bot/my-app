'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ClientLayout from '@/components/ClientLayout';
import { useToast } from '@/components/ui/Toast';
import { Search, X, Plus, SlidersHorizontal, ArrowUpDown, Check, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductImage from '@/components/ProductImage';
import { productsApi } from '@/lib/api/products.api';
import { TOKEN_KEY } from '@/lib/api/axiosClient';
import type { ApiProduct } from '@/lib/types/api.types';

interface Spec { key: string; value: string; }

interface Product {
  id: string;
  emoji: string;
  name: string;
  category: string;
  subcategory: string;
  brand?: string;
  originCity?: string;
  sku?: string;
  priceCny: string;
  priceCnyMin: number;
  priceCnyMax: number;
  moq: number;
  sampleAvailable?: boolean;
  samplePrice?: string;
  shortDescription?: string;
  fullDescription?: string;
  keyFeatures?: string[];
  specifications?: Spec[];
  tags?: string;
  images?: string[];
  videos?: string[];
  bg: string;
  inStock: boolean;
  isNew: boolean;
  onSale: boolean;
  shippingFrom: string;
  material?: string;
  rating: number;
}

interface StripCategory {
  id: string;
  name: string;
  image: string;
  productIds: string[];
}

const CAT_LS_KEY = 'catalog-categories';

const SEED_STRIP_CATS: StripCategory[] = [
  { id: 'sc-electronics', name: 'Electronics',   image: '', productIds: ['p01', 'p05', 'p06', 'p09', 'p12'] },
  { id: 'sc-fashion',     name: 'Fashion',        image: '', productIds: ['p11', 'p13', 'p14', 'p15'] },
  { id: 'sc-home',        name: 'Home & Kitchen', image: '', productIds: ['p03', 'p08', 'p10', 'p19'] },
  { id: 'sc-beauty',      name: 'Beauty',         image: '', productIds: ['p17'] },
  { id: 'sc-sports',      name: 'Sports',         image: '', productIds: ['p07', 'p18'] },
  { id: 'sc-toys',        name: 'Toys',           image: '', productIds: ['p16'] },
];

function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (lower === 'all') return '🛍️';
  if (lower.includes('electron')) return '⚡';
  if (lower.includes('fashion') || lower.includes('cloth')) return '👗';
  if (lower.includes('home') || lower.includes('kitchen')) return '🏠';
  if (lower.includes('beauty')) return '💄';
  if (lower.includes('sport')) return '⚽';
  if (lower.includes('toy')) return '🧸';
  if (lower.includes('mobile') || lower.includes('phone')) return '📱';
  if (lower.includes('jewel')) return '💎';
  if (lower.includes('bag') || lower.includes('luggage')) return '🎒';
  return '📦';
}

const SUBCATEGORIES: Record<string, string[]> = {
  Electronics: ['LED Lights & Strips', 'Power Adapters & Chargers', 'Cables & Connectors', 'Smart Home Devices', 'Batteries & Power Banks'],
  'Mobile Accessories': ['Phone Cases & Covers', 'Screen Protectors', 'Earphones & Earbuds', 'Charging Accessories', 'Camera & Lens Accessories'],
  Jewellery: ['Necklaces & Chains', 'Earrings & Studs', 'Bangles & Bracelets', 'Rings', 'Anklets', 'Jewellery Sets', 'Hair Accessories'],
  Kitchenware: ['Cookware & Pans', 'Storage Containers', 'Kitchen Tools & Gadgets', 'Tableware & Cutlery', 'Water Bottles & Flasks'],
  'Clothing & Apparel': ["Men's Wear", "Women's Wear", "Kids' Wear", 'Innerwear & Socks', 'Winter Wear'],
  'Home & Decor': ['Furniture & Storage', 'Bedding & Cushions', 'Wall Decor', 'Lighting & Lamps', 'Showpieces & Gifts'],
  'Bags & Luggage': ['Handbags & Purses', 'Backpacks', 'Travel Luggage', 'Wallets & Pouches'],
  'Toys & Games': ['Educational Toys', 'Action Figures', 'Board Games', 'Outdoor Toys'],
  'Beauty & Personal Care': ['Skincare Tools', 'Hair Care Tools', 'Makeup Accessories', 'Grooming Products'],
  'Sports & Fitness': ['Exercise Equipment', 'Sportswear Accessories', 'Outdoor & Camping'],
};

const CATEGORIES = ['All', ...Object.keys(SUBCATEGORIES)];

type SortOption = 'relevance' | 'price-asc' | 'price-desc' | 'moq-asc' | 'moq-desc' | 'newest' | 'popular' | 'name-asc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance',  label: 'Relevance (Default)' },
  { value: 'price-asc',  label: 'Price: Low to High (CNY)' },
  { value: 'price-desc', label: 'Price: High to Low (CNY)' },
  { value: 'moq-asc',    label: 'MOQ: Low to High' },
  { value: 'moq-desc',   label: 'MOQ: High to Low' },
  { value: 'newest',     label: 'Newest First' },
  { value: 'popular',    label: 'Most Popular' },
  { value: 'name-asc',   label: 'Name: A to Z' },
];

const MOQ_OPTIONS = [
  { key: '<50',     label: 'Under 50 units' },
  { key: '50-100',  label: '50–100 units' },
  { key: '100-500', label: '100–500 units' },
  { key: '500+',    label: '500+ units' },
];

const SHIPPING_OPTIONS = ['Yiwu', 'Guangzhou', 'Shenzhen', 'Shanghai'];
const MATERIAL_OPTIONS = ['Gold Plated', 'Silver Plated', 'Stainless Steel', 'Brass', 'Artificial/Fashion'];

interface Filters {
  priceMin: number;
  priceMax: number;
  moq: string[];
  inStockOnly: boolean;
  newArrivals: boolean;
  onSale: boolean;
  shippingFrom: string[];
  material: string[];
  rating: number;
}

const DEFAULT_FILTERS: Filters = {
  priceMin: 0, priceMax: 500, moq: [],
  inStockOnly: false, newArrivals: false, onSale: false,
  shippingFrom: [], material: [], rating: 0,
};

const SEED_PRODUCTS: Product[] = [
  { id: 'p01', emoji: '🔌', name: 'LED Strip Lights RGB 5m',      category: 'Electronics',           subcategory: 'LED Lights & Strips',    priceCny: '¥35–55', priceCnyMin: 35, priceCnyMax: 55, moq: 50,  bg: 'bg-[#f0eef8]',  inStock: true,  isNew: false, onSale: false, shippingFrom: 'Yiwu',      rating: 4.2 },
  { id: 'p02', emoji: '📱', name: 'Silicone Phone Cases',         category: 'Mobile Accessories',    subcategory: 'Phone Cases & Covers',   priceCny: '¥8–15',  priceCnyMin: 8,  priceCnyMax: 15, moq: 200, bg: 'bg-[#e4eeee]',    inStock: true,  isNew: false, onSale: true,  shippingFrom: 'Guangzhou', rating: 4.5 },
  { id: 'p03', emoji: '🍶', name: 'Stainless Steel Bottles',      category: 'Kitchenware',           subcategory: 'Water Bottles & Flasks', priceCny: '¥18–28', priceCnyMin: 18, priceCnyMax: 28, moq: 100, bg: 'bg-cyan-100',    inStock: true,  isNew: false, onSale: false, shippingFrom: 'Yiwu',      rating: 4.3 },
  { id: 'p04', emoji: '🎧', name: 'Bluetooth Earbuds TWS',        category: 'Mobile Accessories',    subcategory: 'Earphones & Earbuds',    priceCny: '¥45–80', priceCnyMin: 45, priceCnyMax: 80, moq: 50,  bg: 'bg-purple-100',  inStock: true,  isNew: true,  onSale: false, shippingFrom: 'Shenzhen',  rating: 4.7, sampleAvailable: true, samplePrice: '¥120' },
  { id: 'p05', emoji: '🔋', name: 'Power Banks 10000mAh',         category: 'Electronics',           subcategory: 'Batteries & Power Banks',priceCny: '¥65–95', priceCnyMin: 65, priceCnyMax: 95, moq: 30,  bg: 'bg-emerald-100', inStock: true,  isNew: false, onSale: false, shippingFrom: 'Shenzhen',  rating: 4.4 },
  { id: 'p06', emoji: '🖱️', name: 'Wireless Mouse',               category: 'Electronics',           subcategory: 'Cables & Connectors',   priceCny: '¥22–35', priceCnyMin: 22, priceCnyMax: 35, moq: 50,  bg: 'bg-slate-100',   inStock: true,  isNew: false, onSale: false, shippingFrom: 'Guangzhou', rating: 3.9 },
  { id: 'p07', emoji: '💪', name: 'Resistance Bands Set',         category: 'Sports & Fitness',      subcategory: 'Exercise Equipment',     priceCny: '¥15–25', priceCnyMin: 15, priceCnyMax: 25, moq: 100, bg: 'bg-rose-100',    inStock: true,  isNew: false, onSale: true,  shippingFrom: 'Yiwu',      rating: 4.1 },
  { id: 'p08', emoji: '🧴', name: 'Soap Dispenser Pump',          category: 'Kitchenware',           subcategory: 'Kitchen Tools & Gadgets',priceCny: '¥12–20', priceCnyMin: 12, priceCnyMax: 20, moq: 100, bg: 'bg-teal-100',    inStock: true,  isNew: false, onSale: false, shippingFrom: 'Yiwu',      rating: 4.0 },
  { id: 'p09', emoji: '🔌', name: 'USB-C Cables (Braided)',       category: 'Electronics',           subcategory: 'Cables & Connectors',   priceCny: '¥6–12',  priceCnyMin: 6,  priceCnyMax: 12, moq: 200, bg: 'bg-indigo-100',  inStock: true,  isNew: false, onSale: true,  shippingFrom: 'Shenzhen',  rating: 4.6 },
  { id: 'p10', emoji: '📦', name: 'Storage Box Organiser',        category: 'Home & Decor',          subcategory: 'Furniture & Storage',   priceCny: '¥8–15',  priceCnyMin: 8,  priceCnyMax: 15, moq: 50,  bg: 'bg-yellow-100',  inStock: false, isNew: false, onSale: false, shippingFrom: 'Shanghai',  rating: 3.8 },
  { id: 'p11', emoji: '🎒', name: 'Canvas Tote Bags',             category: 'Bags & Luggage',        subcategory: 'Handbags & Purses',      priceCny: '¥10–18', priceCnyMin: 10, priceCnyMax: 18, moq: 100, bg: 'bg-pink-100',    inStock: true,  isNew: true,  onSale: false, shippingFrom: 'Guangzhou', rating: 4.2 },
  { id: 'p12', emoji: '🏮', name: 'Smart Plug WiFi 16A',          category: 'Electronics',           subcategory: 'Smart Home Devices',    priceCny: '¥18–28', priceCnyMin: 18, priceCnyMax: 28, moq: 50,  bg: 'bg-amber-100',   inStock: true,  isNew: true,  onSale: false, shippingFrom: 'Shenzhen',  rating: 4.8 },
  { id: 'p13', emoji: '✨', name: 'Gold Plated Necklace Set',     category: 'Jewellery',             subcategory: 'Necklaces & Chains',    priceCny: '¥25–45', priceCnyMin: 25, priceCnyMax: 45, moq: 50,  bg: 'bg-yellow-100',  inStock: true,  isNew: true,  onSale: false, shippingFrom: 'Yiwu',      rating: 4.3, material: 'Gold Plated' },
  { id: 'p14', emoji: '💎', name: 'Silver Stud Earrings',         category: 'Jewellery',             subcategory: 'Earrings & Studs',      priceCny: '¥12–22', priceCnyMin: 12, priceCnyMax: 22, moq: 100, bg: 'bg-slate-100',   inStock: true,  isNew: false, onSale: true,  shippingFrom: 'Yiwu',      rating: 4.5, material: 'Silver Plated' },
  { id: 'p15', emoji: '👗', name: "Women's Cotton Kurta",         category: 'Clothing & Apparel',    subcategory: "Women's Wear",          priceCny: '¥30–55', priceCnyMin: 30, priceCnyMax: 55, moq: 50,  bg: 'bg-pink-100',    inStock: true,  isNew: true,  onSale: false, shippingFrom: 'Guangzhou', rating: 4.0 },
  { id: 'p16', emoji: '🧸', name: 'Educational Building Blocks',  category: 'Toys & Games',          subcategory: 'Educational Toys',      priceCny: '¥18–35', priceCnyMin: 18, priceCnyMax: 35, moq: 100, bg: 'bg-emerald-100', inStock: true,  isNew: false, onSale: false, shippingFrom: 'Yiwu',      rating: 4.4 },
  { id: 'p17', emoji: '🌿', name: 'Jade Roller Face Massager',    category: 'Beauty & Personal Care',subcategory: 'Skincare Tools',        priceCny: '¥15–28', priceCnyMin: 15, priceCnyMax: 28, moq: 50,  bg: 'bg-green-100',   inStock: true,  isNew: false, onSale: true,  shippingFrom: 'Guangzhou', rating: 4.6 },
  { id: 'p18', emoji: '🧘', name: 'Yoga Mat Premium TPE',         category: 'Sports & Fitness',      subcategory: 'Exercise Equipment',    priceCny: '¥25–45', priceCnyMin: 25, priceCnyMax: 45, moq: 50,  bg: 'bg-violet-100',  inStock: false, isNew: false, onSale: false, shippingFrom: 'Shanghai',  rating: 4.2 },
  { id: 'p19', emoji: '🖼️', name: 'Canvas Wall Art Prints',       category: 'Home & Decor',          subcategory: 'Wall Decor',            priceCny: '¥20–40', priceCnyMin: 20, priceCnyMax: 40, moq: 30,  bg: 'bg-rose-100',    inStock: true,  isNew: true,  onSale: false, shippingFrom: 'Yiwu',      rating: 3.9 },
  { id: 'p20', emoji: '💼', name: 'Business Laptop Backpack',     category: 'Bags & Luggage',        subcategory: 'Backpacks',             priceCny: '¥55–85', priceCnyMin: 55, priceCnyMax: 85, moq: 30,  bg: 'bg-sky-100',     inStock: true,  isNew: false, onSale: false, shippingFrom: 'Guangzhou', rating: 4.7 },
];

const LS_KEY = 'bk-catalog-products';

function countActiveFilters(f: Filters): number {
  return (
    (f.priceMin > 0 || f.priceMax < 500 ? 1 : 0) +
    (f.moq.length > 0 ? 1 : 0) +
    (f.inStockOnly ? 1 : 0) +
    (f.newArrivals ? 1 : 0) +
    (f.onSale ? 1 : 0) +
    (f.shippingFrom.length > 0 ? 1 : 0) +
    (f.material.length > 0 ? 1 : 0) +
    (f.rating > 0 ? 1 : 0)
  );
}

function moqInRange(moq: number, range: string): boolean {
  if (range === '<50')     return moq < 50;
  if (range === '50-100')  return moq >= 50 && moq <= 100;
  if (range === '100-500') return moq > 100 && moq <= 500;
  if (range === '500+')    return moq > 500;
  return false;
}

function mergeWithLocalStorage(seed: Product[]): Product[] {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (!stored) return seed;
    const adminProducts = JSON.parse(stored) as Array<Record<string, unknown>>;
    // Map admin products to client product shape
    const mapped: Product[] = adminProducts.map(ap => {
      // Find existing seed product to preserve client-specific fields
      const existing = seed.find(s => s.id === String(ap.id));
      return {
        id: String(ap.id),
        emoji: String(ap.emoji || '📦'),
        name: String(ap.name || ''),
        category: String(ap.category || ''),
        subcategory: String(ap.subcategory || ''),
        brand: ap.brand ? String(ap.brand) : undefined,
        originCity: ap.originCity ? String(ap.originCity) : undefined,
        sku: ap.sku ? String(ap.sku) : undefined,
        priceCny: String(ap.priceCny || ''),
        priceCnyMin: existing?.priceCnyMin ?? 0,
        priceCnyMax: existing?.priceCnyMax ?? 0,
        moq: Number(ap.moq) || 50,
        sampleAvailable: Boolean(ap.sampleAvailable),
        samplePrice: ap.samplePrice ? String(ap.samplePrice) : undefined,
        shortDescription: ap.shortDescription ? String(ap.shortDescription) : undefined,
        fullDescription: ap.fullDescription ? String(ap.fullDescription) : undefined,
        keyFeatures: Array.isArray(ap.keyFeatures) ? (ap.keyFeatures as string[]).filter(Boolean) : undefined,
        specifications: Array.isArray(ap.specifications) ? ap.specifications as Spec[] : undefined,
        tags: ap.tags ? String(ap.tags) : undefined,
        images: Array.isArray(ap.images) ? ap.images as string[] : [],
        videos: Array.isArray(ap.videos) ? ap.videos as string[] : [],
        bg: String(ap.bg || 'bg-[#e4eeee]'),
        inStock: existing?.inStock ?? true,
        isNew: Boolean(ap.isNew),
        onSale: Boolean(ap.onSale),
        shippingFrom: existing?.shippingFrom ?? (ap.originCity ? String(ap.originCity) : 'Yiwu'),
        material: existing?.material,
        rating: existing?.rating ?? 4.0,
      };
    });
    return mapped.length > 0 ? mapped : seed;
  } catch {
    return seed;
  }
}

const DELIVERY_OPTIONS = ['ASAP', '2–4 weeks', '1–2 months', 'Flexible'];

export default function CatalogPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [subcat, setSubcat] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [tempFilters, setTempFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Product detail modal
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailImgIdx, setDetailImgIdx] = useState(0);

  // Quotation modal
  const [quoteProduct, setQuoteProduct] = useState<Product | null>(null);
  const [quoteQty, setQuoteQty] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteBudget, setQuoteBudget] = useState('');
  const [quoteDelivery, setQuoteDelivery] = useState('Flexible');
  const [submitting, setSubmitting] = useState(false);

  // Custom product request
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [customSubmitting, setCustomSubmitting] = useState(false);

  // Strip category state
  const [stripCategories, setStripCategories] = useState<StripCategory[]>(SEED_STRIP_CATS);
  const [selectedStripCat, setSelectedStripCat] = useState('all');
  const stripRef = useRef<HTMLDivElement>(null);
  const stripPausedRef = useRef(false);
  const permanentlyPaused = useRef(false);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const base = mergeWithLocalStorage(SEED_PRODUCTS);
    setProducts(base);

    // ── Fetch real products from backend (non-blocking) ─────────────────────
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    if (token) {
      productsApi
        .getProducts({ limit: 100 })
        .then((res) => {
          if (!res.data.success) return;
          const backendProducts: Product[] = res.data.data.map((bp: ApiProduct) => ({
            id: `api-${bp.id}`,
            emoji: '📦',
            name: bp.name,
            category: bp.category?.parent?.name || bp.category?.name || 'General',
            subcategory: bp.category?.name || 'General',
            priceCny: `¥${parseFloat(bp.basePrice).toFixed(0)}`,
            priceCnyMin: parseFloat(bp.basePrice),
            priceCnyMax: parseFloat(bp.basePrice) * 1.3,
            moq: bp.moq,
            bg: 'bg-[#e8e4f0]',
            inStock: bp.isActive,
            isNew: false,
            onSale: false,
            shippingFrom: bp.supplier?.city || 'China',
            rating: 4.5,
            images: bp.images || [],
            description: bp.description,
            shortDescription: bp.description,
          }));
          // Prepend backend products, skip any with duplicate slug-based id
          setProducts((prev) => {
            const existingNames = new Set(prev.map((p) => p.name.toLowerCase()));
            const fresh = backendProducts.filter(
              (p) => !existingNames.has(p.name.toLowerCase())
            );
            return [...fresh, ...prev];
          });
        })
        .catch(() => {/* Backend unreachable — show seed products */});
    }

    setTimeout(() => setIsLoading(false), 300);
    // Load strip categories
    try {
      const stored = localStorage.getItem(CAT_LS_KEY);
      const cats = stored ? JSON.parse(stored) as StripCategory[] : null;
      if (cats && cats.length > 0) {
        setStripCategories(cats);
      } else {
        setStripCategories(SEED_STRIP_CATS);
        localStorage.setItem(CAT_LS_KEY, JSON.stringify(SEED_STRIP_CATS));
      }
    } catch {
      setStripCategories(SEED_STRIP_CATS);
    }
    // Read ?category= from URL
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('category');
    if (catParam) {
      setSelectedStripCat(catParam);
      stripPausedRef.current = true; // start paused if a category is pre-selected
    }
  }, []);

  // Auto-scroll the strip — starts immediately on mount ([] dep array)
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;

    let rafId: number;
    const step = () => {
      if (!stripPausedRef.current && !permanentlyPaused.current) {
        el.scrollLeft += 0.8;
        // scrollWidth is 4× one set; reset when first set is done
        const singleSetWidth = el.scrollWidth / 4;
        if (el.scrollLeft >= singleSetWidth) {
          el.scrollLeft = 0;
        }
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const subcats = cat === 'All' ? [] : (SUBCATEGORIES[cat] || []);
  const activeFilterCount = countActiveFilters(filters);

  const filtered = useMemo(() => {
    let result = products.filter(p => {
      if (q) {
        const lq = q.toLowerCase();
        const inName = p.name.toLowerCase().includes(lq);
        const inCat = p.category.toLowerCase().includes(lq);
        const inSubcat = p.subcategory.toLowerCase().includes(lq);
        const inTags = p.tags ? p.tags.toLowerCase().includes(lq) : false;
        if (!inName && !inCat && !inSubcat && !inTags) return false;
      }
      if (cat !== 'All' && p.category !== cat) return false;
      if (subcat && p.subcategory !== subcat) return false;
      if (p.priceCnyMin < filters.priceMin || p.priceCnyMin > filters.priceMax) return false;
      if (filters.moq.length > 0 && !filters.moq.some(r => moqInRange(p.moq, r))) return false;
      if (filters.inStockOnly && !p.inStock) return false;
      if (filters.newArrivals && !p.isNew) return false;
      if (filters.onSale && !p.onSale) return false;
      if (filters.shippingFrom.length > 0 && !filters.shippingFrom.includes(p.shippingFrom)) return false;
      if (filters.material.length > 0 && (!p.material || !filters.material.includes(p.material))) return false;
      if (filters.rating > 0 && p.rating < filters.rating) return false;
      if (selectedStripCat !== 'all') {
        const sc = stripCategories.find(c => c.id === selectedStripCat);
        if (sc && sc.productIds.length > 0 && !sc.productIds.includes(p.id)) return false;
      }
      return true;
    });
    switch (sortBy) {
      case 'price-asc':  return [...result].sort((a, b) => a.priceCnyMin - b.priceCnyMin);
      case 'price-desc': return [...result].sort((a, b) => b.priceCnyMin - a.priceCnyMin);
      case 'moq-asc':    return [...result].sort((a, b) => a.moq - b.moq);
      case 'moq-desc':   return [...result].sort((a, b) => b.moq - a.moq);
      case 'newest':     return [...result].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      case 'popular':    return [...result].sort((a, b) => b.rating - a.rating);
      case 'name-asc':   return [...result].sort((a, b) => a.name.localeCompare(b.name));
      default:           return result;
    }
  }, [q, cat, subcat, filters, sortBy, products, selectedStripCat, stripCategories]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (filters.priceMin > 0 || filters.priceMax < 500)
      chips.push({ key: 'price', label: `¥${filters.priceMin}–${filters.priceMax >= 500 ? '500+' : filters.priceMax}` });
    const moqLabels: Record<string, string> = { '<50': 'MOQ <50', '50-100': 'MOQ 50–100', '100-500': 'MOQ 100–500', '500+': 'MOQ 500+' };
    filters.moq.forEach(m => chips.push({ key: `moq-${m}`, label: moqLabels[m] }));
    if (filters.inStockOnly) chips.push({ key: 'inStock',    label: 'In Stock' });
    if (filters.newArrivals) chips.push({ key: 'newArrivals',label: 'New Arrivals' });
    if (filters.onSale)      chips.push({ key: 'onSale',     label: 'On Sale' });
    filters.shippingFrom.forEach(s => chips.push({ key: `ship-${s}`, label: `From ${s}` }));
    filters.material.forEach(m  => chips.push({ key: `mat-${m}`,  label: m }));
    if (filters.rating > 0) chips.push({ key: 'rating', label: `${filters.rating}★ & above` });
    return chips;
  }, [filters]);

  function removeChip(key: string) {
    if (key === 'price')              setFilters(f => ({ ...f, priceMin: 0, priceMax: 500 }));
    else if (key.startsWith('moq-'))  { const m = key.slice(4); setFilters(f => ({ ...f, moq: f.moq.filter(x => x !== m) })); }
    else if (key === 'inStock')       setFilters(f => ({ ...f, inStockOnly: false }));
    else if (key === 'newArrivals')   setFilters(f => ({ ...f, newArrivals: false }));
    else if (key === 'onSale')        setFilters(f => ({ ...f, onSale: false }));
    else if (key.startsWith('ship-')) { const s = key.slice(5); setFilters(f => ({ ...f, shippingFrom: f.shippingFrom.filter(x => x !== s) })); }
    else if (key.startsWith('mat-'))  { const m = key.slice(4); setFilters(f => ({ ...f, material: f.material.filter(x => x !== m) })); }
    else if (key === 'rating')        setFilters(f => ({ ...f, rating: 0 }));
  }

  function selectCat(c: string) { setCat(c); setSubcat(''); }

  function selectStripCat(id: string) {
    setSelectedStripCat(id);
    // Any click permanently stops the scroll — only a page refresh resets it
    permanentlyPaused.current = true;
    stripPausedRef.current = true;
    const url = new URL(window.location.href);
    if (id === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', id);
    window.history.replaceState({}, '', url.toString());
  }

  function openFilter() { setTempFilters(filters); setFilterOpen(true); }
  function applyFilters() { setFilters(tempFilters); setFilterOpen(false); }

  function toggleTempMoq(k: string) { setTempFilters(f => ({ ...f, moq: f.moq.includes(k) ? f.moq.filter(x => x !== k) : [...f.moq, k] })); }
  function toggleTempShip(s: string) { setTempFilters(f => ({ ...f, shippingFrom: f.shippingFrom.includes(s) ? f.shippingFrom.filter(x => x !== s) : [...f.shippingFrom, s] })); }
  function toggleTempMat(m: string)  { setTempFilters(f => ({ ...f, material: f.material.includes(m) ? f.material.filter(x => x !== m) : [...f.material, m] })); }

  function openDetail(p: Product) { setDetailProduct(p); setDetailImgIdx(0); }
  function closeDetail() { setDetailProduct(null); }

  function openQuote(p: Product) {
    setQuoteProduct(p);
    setQuoteQty(String(p.moq));
    setQuoteNotes('');
    setQuoteBudget('');
    setQuoteDelivery('Flexible');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function closeQuote() { setQuoteProduct(null); }

  function openCustomModal() { setCustomOpen(true); setCustomName(''); setCustomQty(''); setCustomNotes(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function closeCustomModal() { setCustomOpen(false); }

  async function submitRequest() {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    const id = `BK-REQ-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    addToast({ type: 'success', title: 'Quotation request submitted', description: `${id} created for ${quoteProduct?.name}. Our team will contact you within 24 hours.` });
    setSubmitting(false);
    closeQuote();
    closeDetail();
  }

  async function submitCustomRequest() {
    if (!customName.trim()) return;
    setCustomSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    const id = `BK-REQ-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    addToast({ type: 'success', title: 'Product request submitted', description: `${id} created for "${customName}". Our team will contact you within 24 hours.` });
    setCustomSubmitting(false);
    closeCustomModal();
  }

  const selectedSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Sort';

  // Detail product media list
  const detailMedia = detailProduct ? [
    ...(detailProduct.images && detailProduct.images.length > 0 ? detailProduct.images : []),
    ...(detailProduct.videos && detailProduct.videos.length > 0 ? detailProduct.videos : []),
  ] : [];
  const isVideo = (src: string) => src.startsWith('data:video') || src.endsWith('.mp4') || src.endsWith('.mov');

  // Pre-compute 4× display list outside JSX so strip is wide enough
  // the moment RAF starts (no layout delay)
  const stripBase = [
    { id: 'all', name: 'All', image: '', productIds: [] as string[] },
    ...stripCategories,
  ];
  const stripDisplayItems = [
    ...stripBase, ...stripBase, ...stripBase, ...stripBase,
  ];

  return (
    <ClientLayout>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-700">Product Catalog</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse popular products sourced from verified Chinese manufacturers</p>
        </div>
        <button onClick={openCustomModal} className="btn-primary px-4 py-2 text-sm whitespace-nowrap flex-shrink-0 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Product Request
        </button>
      </div>

      {/* Search — Fix 1: absolute icon, pl-10 */}
      <div style={{ position: 'relative' }} className="mb-4">
        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'grey', width: '16px', height: '16px' }} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          className="input-field"
          style={{ paddingLeft: '40px' }}
          placeholder="Search products, categories..."
        />
        {q && (
          <button onClick={() => setQ('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
            <X style={{ width: '14px', height: '14px', color: 'grey' }} />
          </button>
        )}
      </div>

      {/* ── Auto-scrolling Category Strip ── */}
      <div className="mb-5">
        <style>{`.cat-strip::-webkit-scrollbar { display: none }`}</style>
        <div
          ref={stripRef}
          className="cat-strip flex gap-3 overflow-x-auto pb-1"
          style={{
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollBehavior: 'auto',
            cursor: 'grab',
          } as React.CSSProperties}
          onMouseEnter={() => { stripPausedRef.current = true; }}
          onMouseLeave={() => { stripPausedRef.current = false; }}
          onTouchStart={() => { stripPausedRef.current = true; }}
          onTouchEnd={() => {
            if (!permanentlyPaused.current) {
              stripPausedRef.current = false;
            }
          }}
        >
          {stripDisplayItems.map((c, i) => (
            <button
              key={`${c.id}-${i}`}
              onClick={() => selectStripCat(c.id)}
              className={`flex-shrink-0 flex flex-col overflow-hidden rounded-xl border-2 bg-white transition-all text-left
                ${selectedStripCat === c.id
                  ? 'border-[#4A3B52] shadow-[0_0_0_2px_rgba(74,59,82,0.15)]'
                  : 'border-transparent shadow-sm hover:border-[#C8BEE0] hover:shadow-md'}`}
              style={{ width: '110px' }}
            >
              <div className="w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#E8E1F5] to-[#D6CEE8]" style={{ height: '84px' }}>
                {c.image
                  ? <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                  : <span className="text-4xl select-none">{getCategoryEmoji(c.name)}</span>
                }
              </div>
              <div className="py-2 px-1.5 text-center">
                <p className={`text-[10px] font-700 uppercase tracking-wide truncate ${selectedStripCat === c.id ? 'text-[#4A3B52]' : 'text-foreground'}`}>
                  {c.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main category tabs */}
      <div className="flex gap-1 mb-2 overflow-x-auto scrollbar-hide pb-1">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => selectCat(c)}
            className={`px-4 py-2 rounded-full text-sm font-600 whitespace-nowrap transition-colors ${cat === c ? 'bg-[#5c5470] text-white' : 'text-muted-foreground hover:bg-muted'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Subcategory chips */}
      <div className={`overflow-hidden transition-all duration-200 ${subcats.length > 0 ? 'max-h-24' : 'max-h-0'}`}>
        <div className="flex gap-1.5 pb-3 overflow-x-auto scrollbar-hide">
          <button onClick={() => setSubcat('')}
            className={`px-3 py-1.5 rounded-full text-xs font-600 whitespace-nowrap border transition-colors ${subcat === '' ? 'bg-[#5c5470] text-white border-[#5c5470]' : 'border-border text-muted-foreground hover:border-[#5c5470] hover:text-[#5c5470]'}`}>
            All {cat}
          </button>
          {subcats.map(sc => (
            <button key={sc} onClick={() => setSubcat(sc)}
              className={`px-3 py-1.5 rounded-full text-xs font-600 whitespace-nowrap border transition-colors ${subcat === sc ? 'bg-[#5c5470] text-white border-[#5c5470]' : 'border-border text-muted-foreground hover:border-[#5c5470] hover:text-[#5c5470]'}`}>
              {sc}
            </button>
          ))}
        </div>
      </div>

      {/* Filter + Sort + count row */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={openFilter}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-600 transition-colors ${activeFilterCount > 0 ? 'border-[#5c5470] text-[#5c5470] bg-[#f0eef8]' : 'border-border text-muted-foreground hover:border-[#5c5470] hover:text-[#5c5470]'}`}>
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#5c5470] text-white text-[10px] flex items-center justify-center font-700">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button onClick={() => setSortOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-600 transition-colors ${sortBy !== 'relevance' ? 'border-[#5c5470] text-[#5c5470] bg-[#f0eef8]' : 'border-border text-muted-foreground hover:border-[#5c5470] hover:text-[#5c5470]'}`}>
          <ArrowUpDown className="w-4 h-4" />
          {sortBy === 'relevance' ? 'Sort' : selectedSortLabel.split(':')[0].split('(')[0].trim()}
        </button>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {filtered.length === products.length
            ? `${products.length} products`
            : `Showing ${filtered.length} of ${products.length}`}
        </span>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide pb-1">
          {activeChips.map(chip => (
            <button key={chip.key} onClick={() => removeChip(chip.key)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0eef8] border border-[#e8e4f0] text-[#5c5470] text-xs font-600 whitespace-nowrap hover:bg-[#e8e4f0] transition-colors">
              {chip.label} <X className="w-3 h-3" />
            </button>
          ))}
          <button onClick={() => setFilters(DEFAULT_FILTERS)}
            className="px-2.5 py-1 rounded-full text-xs font-600 text-muted-foreground underline whitespace-nowrap hover:text-foreground transition-colors">
            Clear All
          </button>
        </div>
      )}

      {/* Product grid / Empty state */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`sk-prod-${i}`} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="aspect-square bg-[#e8e4f0] animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-[#e8e4f0] animate-pulse rounded w-4/5" />
                <div className="h-3 bg-[#e8e4f0] animate-pulse rounded w-2/5" />
                <div className="h-5 bg-[#e8e4f0] animate-pulse rounded w-3/5 mt-2" />
                <div className="h-8 bg-[#e8e4f0] animate-pulse rounded mt-3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-card rounded-xl border border-border shadow-card overflow-hidden card-hover cursor-pointer"
              onClick={() => router.push(`/catalog/${p.id}`)}>
              <div className={`aspect-square ${p.bg} flex items-center justify-center text-6xl relative`}>
                {p.images && p.images[0]
                  ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  : <><ProductImage productName={p.name} canUpload={false} fill />{p.emoji}</>
                }
                {p.isNew && <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] font-700 rounded-full leading-tight">NEW</span>}
                {p.onSale && <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-700 rounded-full leading-tight">SALE</span>}
                {!p.inStock && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <span className="text-[10px] font-700 text-muted-foreground tracking-wide">OUT OF STOCK</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-600 text-sm leading-tight">{p.name}</p>
                <span className="inline-block mt-1 badge bg-muted text-muted-foreground text-[10px]">{p.subcategory || p.category}</span>
                <div className="flex items-center gap-1 mt-1.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-[11px] text-muted-foreground">{p.rating.toFixed(1)}</span>
                  <span className="text-[11px] text-muted-foreground ml-1">• {p.shippingFrom}</span>
                </div>
                <p className="font-tabular font-700 text-foreground mt-1.5">{p.priceCny} <span className="text-[11px] text-muted-foreground font-500">/ unit</span></p>
                <p className="text-[11px] text-muted-foreground mt-0.5">MOQ: {p.moq} units</p>
                <button
                  onClick={e => { e.stopPropagation(); if (p.inStock) openQuote(p); }}
                  disabled={!p.inStock}
                  className="btn-primary w-full py-2 mt-3 text-xs disabled:opacity-50 disabled:cursor-not-allowed">
                  {p.inStock ? 'Request Quotation' : 'Out of Stock'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="font-700 text-lg mb-1">No products found</h3>
          <p className="text-sm text-muted-foreground mb-5">
            {q ? `No results for "${q}"` : 'Try adjusting your filters or search terms'}
          </p>
          {q ? (
            <button onClick={() => setQ('')} className="btn-primary px-6 py-2.5 text-sm">Clear Search</button>
          ) : (
            <button onClick={() => { setFilters(DEFAULT_FILTERS); setCat('All'); setSubcat(''); }}
              className="btn-primary px-6 py-2.5 text-sm">Clear Filters</button>
          )}
        </div>
      )}

      {/* ── Product Detail Modal (Fix 4) ── */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center fade-in" onClick={closeDetail}>
          <div
            className="bg-card w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: '92vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 md:hidden flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Close button */}
            <div className="flex items-center justify-between px-4 pt-2 pb-1 flex-shrink-0">
              <span className="text-xs text-muted-foreground">{detailProduct.category} / {detailProduct.subcategory}</span>
              <button onClick={closeDetail} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1">

              {/* A) MEDIA SECTION */}
              <div className="relative bg-muted/30">
                {detailMedia.length > 0 ? (
                  <>
                    <div className="aspect-video relative overflow-hidden bg-muted">
                      {isVideo(detailMedia[detailImgIdx]) ? (
                        <video src={detailMedia[detailImgIdx]} controls className="w-full h-full object-contain" />
                      ) : (
                        <img src={detailMedia[detailImgIdx]} alt={detailProduct.name} className="w-full h-full object-contain" />
                      )}
                      {/* nav arrows */}
                      {detailMedia.length > 1 && (
                        <>
                          <button onClick={() => setDetailImgIdx(i => (i - 1 + detailMedia.length) % detailMedia.length)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60">
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDetailImgIdx(i => (i + 1) % detailMedia.length)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                            {detailImgIdx + 1}/{detailMedia.length}
                          </span>
                        </>
                      )}
                    </div>
                    {/* Thumbnail strip */}
                    {detailMedia.length > 1 && (
                      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-hide">
                        {detailMedia.map((src, i) => (
                          <button key={i} onClick={() => setDetailImgIdx(i)}
                            className={`w-12 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${detailImgIdx === i ? 'border-[#4A3B52]' : 'border-transparent'}`}>
                            {isVideo(src) ? (
                              <div className="w-full h-full bg-muted flex items-center justify-center text-base">▶</div>
                            ) : (
                              <img src={src} alt="" className="w-full h-full object-cover" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className={`aspect-video ${detailProduct.bg} flex items-center justify-center text-8xl`}>
                    {detailProduct.emoji}
                  </div>
                )}
              </div>

              {/* B) PRODUCT INFO */}
              <div className="px-4 pt-3 pb-2">
                <h2 className="font-700 text-xl leading-tight">{detailProduct.name}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-600">{detailProduct.rating.toFixed(1)}</span>
                  </div>
                  {detailProduct.originCity && <span className="text-sm text-muted-foreground">• {detailProduct.originCity}</span>}
                  {detailProduct.brand && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{detailProduct.brand}</span>}
                </div>
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-[#f0eef8] border border-[#e8e4f0] text-[#5c5470] text-xs font-600">
                  {detailProduct.subcategory}
                </span>
                <div className="mt-3">
                  <span className="text-2xl font-700 text-foreground">{detailProduct.priceCny}</span>
                  <span className="text-sm text-muted-foreground ml-1">/ unit</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">MOQ: Minimum {detailProduct.moq} units</p>
                {detailProduct.sampleAvailable && (
                  <p className="text-sm text-emerald-600 font-600 mt-0.5">Sample available at {detailProduct.samplePrice}</p>
                )}
                {detailProduct.shortDescription && (
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{detailProduct.shortDescription}</p>
                )}
              </div>

              {/* C) ABOUT THIS PRODUCT */}
              {detailProduct.keyFeatures && detailProduct.keyFeatures.filter(Boolean).length > 0 && (
                <div className="px-4 py-3 border-t border-border">
                  <h3 className="font-700 text-sm mb-2">About this product</h3>
                  <ul className="space-y-1.5">
                    {detailProduct.keyFeatures.filter(Boolean).map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-[#5c5470] mt-0.5 flex-shrink-0">•</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* D) SPECIFICATIONS TABLE */}
              {detailProduct.specifications && detailProduct.specifications.filter(s => s.key).length > 0 && (
                <div className="px-4 py-3 border-t border-border">
                  <h3 className="font-700 text-sm mb-2">Specifications</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {detailProduct.specifications.filter(s => s.key).map((spec, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                          <td className="py-1.5 px-2 font-600 text-muted-foreground w-1/2">{spec.key}</td>
                          <td className="py-1.5 px-2">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* E) FULL DESCRIPTION */}
              {detailProduct.fullDescription && (
                <div className="px-4 py-3 border-t border-border">
                  <h3 className="font-700 text-sm mb-2">Product Description</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{detailProduct.fullDescription}</p>
                </div>
              )}

              {/* Spacer for sticky buttons */}
              <div className="h-24" />
            </div>

            {/* F) STICKY BOTTOM BUTTONS */}
            <div className="flex-shrink-0 border-t border-border bg-card px-4 py-3 flex gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
              <button
                onClick={() => { closeDetail(); }}
                className="flex-1 py-3 text-sm font-600 rounded-xl border-2 border-[#5c5470] text-[#5c5470] hover:bg-[#f5f4f7] transition-colors">
                Add to Request
              </button>
              <button
                onClick={() => openQuote(detailProduct)}
                disabled={!detailProduct.inStock}
                className="btn-primary flex-1 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {detailProduct.inStock ? 'Request Quotation' : 'Out of Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quotation Modal (updated spec) ── */}
      {quoteProduct && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto pt-4 md:pt-8 fade-in" onClick={closeQuote}>
          <div className="bg-card rounded-2xl w-full max-w-md mb-4 mx-4" style={{ display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
              <h3 className="font-700">Request Quotation</h3>
              <button onClick={closeQuote} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
              {/* Pre-filled product */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <div className={`w-14 h-14 rounded-lg ${quoteProduct.bg} flex items-center justify-center text-3xl overflow-hidden flex-shrink-0`}>
                  {quoteProduct.images && quoteProduct.images[0]
                    ? <img src={quoteProduct.images[0]} alt={quoteProduct.name} className="w-full h-full object-cover" />
                    : quoteProduct.emoji}
                </div>
                <div className="min-w-0">
                  <p className="font-600 text-sm truncate">{quoteProduct.name}</p>
                  <p className="text-xs text-muted-foreground">{quoteProduct.priceCny} / unit • MOQ {quoteProduct.moq}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase">Quantity Needed</label>
                <input value={quoteQty} onChange={e => setQuoteQty(e.target.value)} type="number" min={quoteProduct.moq}
                  className="input-field mt-1" />
                <p className="text-[11px] text-muted-foreground mt-1">Minimum order: {quoteProduct.moq} units</p>
              </div>

              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase">Specs / Customization Notes</label>
                <textarea value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)} rows={3}
                  className="input-field mt-1" placeholder="Colour, branding, packaging, material requirements..." />
              </div>

              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase">Target Budget INR <span className="text-muted-foreground/60">(optional)</span></label>
                <input value={quoteBudget} onChange={e => setQuoteBudget(e.target.value)}
                  className="input-field mt-1" placeholder="e.g. ₹50,000" />
              </div>

              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase">Delivery Timeline</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {DELIVERY_OPTIONS.map(opt => (
                    <button key={opt} type="button" onClick={() => setQuoteDelivery(opt)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-600 transition-colors ${quoteDelivery === opt ? 'bg-[#5c5470] text-white border-[#5c5470]' : 'border-border text-muted-foreground hover:border-[#5c5470]'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 pt-3 border-t border-border flex-shrink-0">
              <button onClick={submitRequest} disabled={submitting}
                className="btn-primary w-full py-3 text-sm font-600">
                {submitting ? 'Submitting...' : 'Submit Quotation Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom product request modal */}
      {customOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto pt-4 md:pt-8 fade-in" onClick={closeCustomModal}>
          <div className="bg-card rounded-2xl w-full max-w-md p-5 mb-4 mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-700">Add Product Request</h3>
              <button onClick={closeCustomModal} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Can&apos;t find what you need? Describe the product and we&apos;ll source a quote for you.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase">Product Name / Description</label>
                <input value={customName} onChange={e => setCustomName(e.target.value)} className="input-field mt-1" placeholder="e.g. Custom printed tote bags" />
              </div>
              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase">Estimated Quantity</label>
                <input value={customQty} onChange={e => setCustomQty(e.target.value)} type="number" min={1} className="input-field mt-1" placeholder="e.g. 500" />
              </div>
              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase">Additional Notes</label>
                <textarea value={customNotes} onChange={e => setCustomNotes(e.target.value)} rows={3} className="input-field mt-1" placeholder="Size, colour, material, branding requirements..." />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={closeCustomModal} className="btn-secondary flex-1 py-2 text-sm">Cancel</button>
              <button onClick={submitCustomRequest} disabled={customSubmitting || !customName.trim()} className="btn-primary flex-1 py-2 text-sm">{customSubmitting ? 'Submitting...' : 'Submit Request'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Top Sheet ── */}
      <div className={`fixed inset-0 z-50 ${filterOpen ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${filterOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setFilterOpen(false)} />
        <div className={`absolute top-0 left-0 right-0 bg-card rounded-b-2xl shadow-xl transition-transform duration-300 ${filterOpen ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
            <h3 className="font-700 text-lg">Filters</h3>
            <button onClick={() => setFilterOpen(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
          <div className="overflow-y-auto max-h-[65vh] px-5 py-4 space-y-6">
            {/* Price Range */}
            <div>
              <h4 className="font-700 text-sm mb-4">Price Range (CNY ¥)</h4>
              <div className="relative h-6 mx-2 mb-4">
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 bg-muted rounded-full" />
                <div className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-[#5c5470] rounded-full"
                  style={{ left: `${(tempFilters.priceMin / 500) * 100}%`, right: `${100 - (tempFilters.priceMax / 500) * 100}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-[#5c5470] shadow-md pointer-events-none"
                  style={{ left: `${(tempFilters.priceMin / 500) * 100}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-[#5c5470] shadow-md pointer-events-none"
                  style={{ left: `${(tempFilters.priceMax / 500) * 100}%` }} />
                <input type="range" min={0} max={500} step={5} value={tempFilters.priceMin}
                  onChange={e => setTempFilters(f => ({ ...f, priceMin: Math.min(Number(e.target.value), f.priceMax - 10) }))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" style={{ zIndex: tempFilters.priceMin > 450 ? 5 : 3 }} />
                <input type="range" min={0} max={500} step={5} value={tempFilters.priceMax}
                  onChange={e => setTempFilters(f => ({ ...f, priceMax: Math.max(Number(e.target.value), f.priceMin + 10) }))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" style={{ zIndex: 4 }} />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center border border-border rounded-lg px-2.5 py-1.5 flex-1">
                  <span className="text-xs text-muted-foreground mr-1">¥</span>
                  <input type="number" min={0} max={tempFilters.priceMax - 10} value={tempFilters.priceMin}
                    onChange={e => setTempFilters(f => ({ ...f, priceMin: Math.min(Number(e.target.value), f.priceMax - 10) }))}
                    className="w-full text-sm font-600 bg-transparent outline-none" />
                </div>
                <span className="text-muted-foreground text-sm">to</span>
                <div className="flex items-center border border-border rounded-lg px-2.5 py-1.5 flex-1">
                  <span className="text-xs text-muted-foreground mr-1">¥</span>
                  <input type="number" min={tempFilters.priceMin + 10} max={500} value={tempFilters.priceMax}
                    onChange={e => setTempFilters(f => ({ ...f, priceMax: Math.max(Number(e.target.value), f.priceMin + 10) }))}
                    className="w-full text-sm font-600 bg-transparent outline-none" />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[{ label: 'Under ¥10', min: 0, max: 10 }, { label: '¥10–50', min: 10, max: 50 }, { label: '¥50–200', min: 50, max: 200 }, { label: '¥200+', min: 200, max: 500 }].map(p => (
                  <button key={p.label} onClick={() => setTempFilters(f => ({ ...f, priceMin: p.min, priceMax: p.max }))}
                    className={`px-3 py-1 rounded-full border text-xs font-600 transition-colors ${tempFilters.priceMin === p.min && tempFilters.priceMax === p.max ? 'bg-[#5c5470] text-white border-[#5c5470]' : 'border-border text-muted-foreground hover:border-[#5c5470]'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {/* MOQ */}
            <div>
              <h4 className="font-700 text-sm mb-3">MOQ (Minimum Order Quantity)</h4>
              <div className="space-y-3">
                {MOQ_OPTIONS.map(o => (
                  <label key={o.key} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={tempFilters.moq.includes(o.key)} onChange={() => toggleTempMoq(o.key)} className="w-4 h-4 rounded accent-accent cursor-pointer" />
                    <span className="text-sm">{o.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Availability */}
            <div>
              <h4 className="font-700 text-sm mb-3">Availability</h4>
              <div className="space-y-3">
                {([
                  { key: 'inStockOnly' as const, label: 'In Stock Only' },
                  { key: 'newArrivals' as const, label: 'New Arrivals (last 30 days)' },
                  { key: 'onSale'      as const, label: 'On Sale / Discounted' },
                ]).map(o => (
                  <div key={o.key} className="flex items-center justify-between">
                    <span className="text-sm">{o.label}</span>
                    <button onClick={() => setTempFilters(f => ({ ...f, [o.key]: !f[o.key] }))}
                      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${tempFilters[o.key] ? 'bg-[#5c5470]' : 'bg-muted'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${tempFilters[o.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            {/* Shipping From */}
            <div>
              <h4 className="font-700 text-sm mb-3">Shipping From</h4>
              <div className="flex flex-wrap gap-2">
                {SHIPPING_OPTIONS.map(s => (
                  <button key={s} onClick={() => toggleTempShip(s)}
                    className={`px-3.5 py-1.5 rounded-lg border text-sm font-600 transition-colors ${tempFilters.shippingFrom.includes(s) ? 'bg-[#5c5470] text-white border-[#5c5470]' : 'border-border text-muted-foreground hover:border-[#5c5470]'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {/* Material */}
            <div>
              <h4 className="font-700 text-sm mb-1">Material <span className="text-xs font-500 text-muted-foreground">(for Jewellery)</span></h4>
              <div className="space-y-3 mt-3">
                {MATERIAL_OPTIONS.map(m => (
                  <label key={m} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={tempFilters.material.includes(m)} onChange={() => toggleTempMat(m)} className="w-4 h-4 rounded accent-accent cursor-pointer" />
                    <span className="text-sm">{m}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Rating */}
            <div>
              <h4 className="font-700 text-sm mb-3">Rating</h4>
              <div className="space-y-3">
                {[{ value: 4, label: '4★ & above' }, { value: 3, label: '3★ & above' }, { value: 0, label: 'All ratings' }].map(r => (
                  <label key={r.value} className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="filter-rating" value={r.value} checked={tempFilters.rating === r.value}
                      onChange={() => setTempFilters(f => ({ ...f, rating: r.value }))} className="w-4 h-4 accent-accent cursor-pointer" />
                    <span className="text-sm">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 p-5 border-t border-border">
            <button onClick={() => setTempFilters(DEFAULT_FILTERS)} className="btn-secondary flex-1 py-3 text-sm font-600">Clear All</button>
            <button onClick={applyFilters} className="btn-primary flex-1 py-3 text-sm font-600">
              Apply{countActiveFilters(tempFilters) > 0 ? ` (${countActiveFilters(tempFilters)})` : ''}
            </button>
          </div>
        </div>
      </div>

      {/* ── Sort Top Sheet ── */}
      <div className={`fixed inset-0 z-50 ${sortOpen ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${sortOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setSortOpen(false)} />
        <div className={`absolute top-0 left-0 right-0 bg-card rounded-b-2xl shadow-xl transition-transform duration-300 ${sortOpen ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
            <h3 className="font-700 text-lg">Sort By</h3>
            <button onClick={() => setSortOpen(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
          <div className="py-1">
            {SORT_OPTIONS.map(o => (
              <button key={o.value} onClick={() => { setSortBy(o.value); setSortOpen(false); }}
                className={`w-full flex items-center justify-between px-5 py-3.5 text-sm transition-colors hover:bg-muted/50 ${sortBy === o.value ? 'text-[#5c5470] font-700' : 'text-foreground font-500'}`}>
                {o.label}
                {sortBy === o.value && <Check className="w-4 h-4 text-[#5c5470] flex-shrink-0" />}
              </button>
            ))}
          </div>
          <div className="h-4" />
        </div>
      </div>
    </ClientLayout>
  );
}
