'use client';
import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useToast } from '@/components/ui/Toast';
import { Plus, Pencil, Trash2, X, Search, Tag, ImageIcon, Download, Upload } from 'lucide-react';
import ImportProductsModal from '@/components/ImportProductsModal';
import { productsApi } from '@/lib/api/products.api';
import type { CreateProductPayload } from '@/lib/api/products.api';
import type { ApiProduct } from '@/lib/types/api.types';
import { uploadFiles } from '@/lib/upload';

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

const CATEGORIES = Object.keys(SUBCATEGORIES);
const ORIGIN_CITIES = ['Yiwu', 'Guangzhou', 'Shenzhen', 'Shanghai', 'Other'];

const BG_OPTIONS = [
  'bg-[#f0eef8]','bg-[#e4eeee]','bg-cyan-100','bg-indigo-50','bg-emerald-100',
  'bg-slate-100','bg-rose-100','bg-teal-100','bg-indigo-100','bg-yellow-100',
  'bg-pink-100','bg-amber-100','bg-green-100','bg-red-100','bg-sky-100',
];

interface StripCategory {
  id: string;
  name: string;
  image: string;
  productIds: string[];
}

const CATEGORIES_LS_KEY = 'catalog-categories';
const CAT_IMG_PREFIX   = 'catalog-category-image-';

const ADMIN_SEED_CATS: StripCategory[] = [
  { id: 'sc-electronics', name: 'Electronics',   image: '', productIds: [] },
  { id: 'sc-fashion',     name: 'Fashion',        image: '', productIds: [] },
  { id: 'sc-home',        name: 'Home & Kitchen', image: '', productIds: [] },
  { id: 'sc-beauty',      name: 'Beauty',         image: '', productIds: [] },
  { id: 'sc-sports',      name: 'Sports',         image: '', productIds: [] },
  { id: 'sc-toys',        name: 'Toys',           image: '', productIds: [] },
];

function adminCatEmoji(name: string): string {
  const l = name.toLowerCase();
  if (l === 'all') return '\u{1F6CD}\uFE0F';
  if (l.includes('electron')) return '\u26A1';
  if (l.includes('fashion') || l.includes('cloth')) return '\u{1F457}';
  if (l.includes('home') || l.includes('kitchen')) return '\u{1F3E0}';
  if (l.includes('beauty')) return '\u{1F484}';
  if (l.includes('sport')) return '\u26BD';
  if (l.includes('toy')) return '\u{1F9F8}';
  if (l.includes('mobile') || l.includes('phone')) return '\u{1F4F1}';
  if (l.includes('jewel')) return '\u{1F48E}';
  if (l.includes('bag') || l.includes('luggage')) return '\u{1F392}';
  return '\u{1F4E6}';
}

interface Spec { key: string; value: string; }

interface CatalogProduct {
  id: string;
  emoji: string;
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  originCity: string;
  sku: string;
  priceCny: string;
  moq: number;
  sampleAvailable: boolean;
  samplePrice: string;
  shortDescription: string;
  fullDescription: string;
  keyFeatures: string[];
  specifications: Spec[];
  weight: string;
  material: string;
  origin: string;
  tags: string;
  images: string[];
  videos: string[];
  bg: string;
  active: boolean;
  isNew: boolean;
  onSale: boolean;
  categoryId: string;
}

function emptyForm(): Omit<CatalogProduct, 'id'> {
  return {
    emoji: '\u{1F4E6}', name: '', category: 'Electronics', subcategory: 'LED Lights & Strips',
    brand: '', originCity: 'Yiwu', sku: '',
    priceCny: '', moq: 50,
    sampleAvailable: false, samplePrice: '',
    shortDescription: '', fullDescription: '',
    keyFeatures: [''], specifications: [{ key: '', value: '' }],
    weight: '', material: '', origin: '', tags: '',
    images: [], videos: [],
    bg: 'bg-[#e4eeee]', active: true, isNew: false, onSale: false,
    categoryId: '',
  };
}

function mapApiToCatalog(p: ApiProduct): CatalogProduct {
  const specs = (p.specifications ?? []) as Spec[];
  return {
    id: p.id,
    emoji: p.emoji || '\u{1F4E6}',
    name: p.name,
    category: p.category?.name || '',
    subcategory: p.category?.parent?.name || p.category?.name || '',
    brand: p.brand || '',
    originCity: p.originCity || '',
    sku: p.sku || '',
    priceCny: p.priceRange || `\u00A5${p.basePrice}`,
    moq: p.moq,
    sampleAvailable: p.sampleAvailable,
    samplePrice: p.samplePrice ? `\u00A5${p.samplePrice}` : '',
    shortDescription: p.shortDescription || '',
    fullDescription: p.fullDescription || '',
    keyFeatures: (p.keyFeatures || []).length > 0 ? p.keyFeatures : [''],
    specifications: specs.length > 0 ? specs : [{ key: '', value: '' }],
    weight: p.weight || '',
    material: p.material || '',
    origin: p.originCity || '',
    tags: p.tags || '',
    images: p.images || [],
    videos: p.videos || [],
    bg: p.bgColor || 'bg-[#e4eeee]',
    active: p.isActive,
    isNew: p.isNew,
    onSale: p.onSale,
    categoryId: p.category?.id || '',
  };
}

function formToPayload(form: Omit<CatalogProduct, 'id'>): CreateProductPayload {
  const samplePriceNum = form.samplePrice ? parseFloat(form.samplePrice.replace('\u00A5', '')) : undefined;
  const basePrice = parseFloat(form.priceCny.replace(/[^\d.]/g, '')) || 0;
  return {
    name: form.name.trim(),
    emoji: form.emoji || null,
    brand: form.brand || null,
    sku: form.sku || null,
    originCity: form.originCity || null,
    priceRange: form.priceCny || null,
    moq: form.moq,
    basePrice,
    sampleAvailable: form.sampleAvailable,
    samplePrice: samplePriceNum || null,
    shortDescription: form.shortDescription || null,
    fullDescription: form.fullDescription || null,
    keyFeatures: form.keyFeatures.filter(f => f.trim()),
    specifications: form.specifications.filter(s => s.key || s.value).length > 0 ? form.specifications.filter(s => s.key || s.value) : null,
    weight: form.weight || null,
    material: form.material || null,
    tags: form.tags || null,
    images: form.images,
    videos: form.videos,
    bgColor: form.bg || null,
    isNew: form.isNew,
    onSale: form.onSale,
    isActive: form.active,
    categoryId: form.categoryId || null,
  };
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${on ? 'bg-[#4A3B52]' : 'bg-muted'}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function AdminCatalogPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [q, setQ] = useState('');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<CatalogProduct, 'id'>>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<CatalogProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);
  const catImgRef   = useRef<HTMLInputElement>(null);
  // Map storage-path → local object URL for previewing freshly-uploaded media
  // (existing media already arrives as displayable signed URLs).
  const mediaPreview = useRef<Map<string, string>>(new Map());
  const previewSrc = (val: string) => mediaPreview.current.get(val) ?? val;

  const [categories, setCategories] = useState<StripCategory[]>([]);
  const [catsLoaded, setCatsLoaded] = useState(false);
  const [catModalMode, setCatModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<{ name: string; image: string; productIds: string[] }>({ name: '', image: '', productIds: [] });
  const [deleteCatTarget, setDeleteCatTarget] = useState<StripCategory | null>(null);
  const [savingCat, setSavingCat] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    productsApi.getProducts({ limit: 100 })
      .then(res => {
        if (!cancelled) {
          const data = res.data?.data || [];
          setProducts(data.map(mapApiToCatalog));
        }
      })
      .catch(() => { if (!cancelled) setProducts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CATEGORIES_LS_KEY);
      const cats = stored ? JSON.parse(stored) as StripCategory[] : null;
      if (cats && cats.length > 0) {
        setCategories(cats);
      } else {
        setCategories(ADMIN_SEED_CATS);
        localStorage.setItem(CATEGORIES_LS_KEY, JSON.stringify(ADMIN_SEED_CATS));
      }
    } catch {
      setCategories(ADMIN_SEED_CATS);
    }
    setCatsLoaded(true);
  }, []);

  useEffect(() => {
    if (!catsLoaded) return;
    try { localStorage.setItem(CATEGORIES_LS_KEY, JSON.stringify(categories)); } catch { /* quota */ }
  }, [categories, catsLoaded]);

  const filtered = products.filter(p => {
    if (!q) return true;
    const lq = q.toLowerCase();
    return p.name.toLowerCase().includes(lq) ||
      p.category.toLowerCase().includes(lq) ||
      p.subcategory.toLowerCase().includes(lq) ||
      p.tags.toLowerCase().includes(lq);
  });

  function openAddCat() {
    setCatForm({ name: '', image: '', productIds: [] });
    setEditingCatId(null);
    setCatModalMode('add');
  }
  function openEditCat(cat: StripCategory) {
    const storedImg = localStorage.getItem(CAT_IMG_PREFIX + cat.id) || cat.image;
    setCatForm({ name: cat.name, image: storedImg, productIds: [...cat.productIds] });
    setEditingCatId(cat.id);
    setCatModalMode('edit');
  }
  function closeCatModal() { setCatModalMode(null); setEditingCatId(null); }

  function toggleCatProduct(pid: string) {
    setCatForm(f => ({
      ...f,
      productIds: f.productIds.includes(pid) ? f.productIds.filter(x => x !== pid) : [...f.productIds, pid],
    }));
  }

  function handleCatImgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCatForm(f => ({ ...f, image: ev.target?.result as string }));
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function saveCat() {
    if (!catForm.name.trim()) return;
    setSavingCat(true);
    await new Promise(r => setTimeout(r, 400));
    if (catModalMode === 'add') {
      const newId = `cat-${Date.now()}`;
      if (catForm.image) {
        try { localStorage.setItem(CAT_IMG_PREFIX + newId, catForm.image); } catch { /* quota */ }
      }
      const newCat: StripCategory = { id: newId, name: catForm.name.trim(), image: catForm.image, productIds: catForm.productIds };
      setCategories(prev => [...prev, newCat]);
      addToast({ type: 'success', title: 'Category added', description: `"${catForm.name}" created.` });
    } else if (catModalMode === 'edit' && editingCatId) {
      if (catForm.image) {
        try { localStorage.setItem(CAT_IMG_PREFIX + editingCatId, catForm.image); } catch { /* quota */ }
      }
      setCategories(prev => prev.map(c =>
        c.id === editingCatId
          ? { ...c, name: catForm.name.trim(), image: catForm.image, productIds: catForm.productIds }
          : c
      ));
      addToast({ type: 'success', title: 'Category updated', description: `"${catForm.name}" updated.` });
    }
    setSavingCat(false);
    closeCatModal();
  }

  async function confirmDeleteCat() {
    if (!deleteCatTarget) return;
    setSavingCat(true);
    await new Promise(r => setTimeout(r, 400));
    try { localStorage.removeItem(CAT_IMG_PREFIX + deleteCatTarget.id); } catch { /* noop */ }
    setCategories(prev => prev.filter(c => c.id !== deleteCatTarget.id));
    addToast({ type: 'success', title: 'Category deleted', description: `"${deleteCatTarget.name}" removed.` });
    setSavingCat(false);
    setDeleteCatTarget(null);
  }

  function setF<K extends keyof Omit<CatalogProduct, 'id'>>(key: K, val: Omit<CatalogProduct, 'id'>[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function openAdd() { setForm(emptyForm()); setEditingId(null); setModalMode('add'); }
  function openEdit(p: CatalogProduct) {
    setForm({
      emoji: p.emoji, name: p.name, category: p.category, subcategory: p.subcategory,
      brand: p.brand, originCity: p.originCity, sku: p.sku,
      priceCny: p.priceCny, moq: p.moq, sampleAvailable: p.sampleAvailable, samplePrice: p.samplePrice,
      shortDescription: p.shortDescription, fullDescription: p.fullDescription,
      keyFeatures: p.keyFeatures.length ? p.keyFeatures : [''],
      specifications: p.specifications.length ? p.specifications : [{ key: '', value: '' }],
      weight: p.weight || '', material: p.material || '', origin: p.origin || '',
      tags: p.tags, images: p.images, videos: p.videos,
      bg: p.bg, active: p.active, isNew: p.isNew, onSale: p.onSale,
      categoryId: p.categoryId || '',
    });
    setEditingId(p.id); setModalMode('edit');
  }
  function closeModal() { setModalMode(null); setEditingId(null); }

  function handleCategoryChange(cat: string) {
    const subcats = SUBCATEGORIES[cat] || [];
    setForm(f => ({ ...f, category: cat, subcategory: subcats[0] || '' }));
  }

  function addFeature() { setF('keyFeatures', [...form.keyFeatures, '']); }
  function removeFeature(i: number) { setF('keyFeatures', form.keyFeatures.filter((_, idx) => idx !== i)); }
  function setFeature(i: number, val: string) { const arr = [...form.keyFeatures]; arr[i] = val; setF('keyFeatures', arr); }

  function addSpec() { setF('specifications', [...form.specifications, { key: '', value: '' }]); }
  function removeSpec(i: number) { setF('specifications', form.specifications.filter((_, idx) => idx !== i)); }
  function setSpec(i: number, field: 'key' | 'value', val: string) { const arr = [...form.specifications]; arr[i] = { ...arr[i], [field]: val }; setF('specifications', arr); }

  // Upload media straight to object storage; persist only the returned paths and
  // keep a local object URL for in-form preview (raw paths aren't displayable).
  async function uploadMedia(files: File[], key: 'images' | 'videos') {
    if (files.length === 0) return;
    setMediaUploading(true);
    try {
      const uploaded = await uploadFiles(files, 'catalog');
      uploaded.forEach((u, i) => mediaPreview.current.set(u.url, URL.createObjectURL(files[i])));
      setForm(f => ({ ...f, [key]: [...f[key], ...uploaded.map(u => u.url)] }));
    } catch {
      addToast({ type: 'error', title: 'Upload failed', description: 'Please check your connection and try again.' });
    } finally {
      setMediaUploading(false);
    }
  }

  function handleImgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 8 - form.images.length);
    e.target.value = '';
    uploadMedia(files, 'images');
  }

  function handleVidUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 2 - form.videos.length);
    e.target.value = '';
    uploadMedia(files, 'videos');
  }

  async function handleSave() {
    if (!form.name.trim() || !form.priceCny.trim()) return;
    setSaving(true);
    try {
      const payload = formToPayload(form);
      if (modalMode === 'add') {
        const res = await productsApi.createProduct(payload);
        const saved = res.data?.data;
        if (saved) {
          setProducts(prev => [...prev, mapApiToCatalog(saved)]);
          addToast({ type: 'success', title: 'Product added', description: `"${form.name}" has been added to the catalog.` });
        }
      } else if (modalMode === 'edit' && editingId) {
        const res = await productsApi.updateProduct(editingId, payload);
        const saved = res.data?.data;
        if (saved) {
          setProducts(prev => prev.map(p => p.id === editingId ? mapApiToCatalog(saved) : p));
          addToast({ type: 'success', title: 'Product updated', description: `"${form.name}" has been updated.` });
        }
      }
      closeModal();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to save product. Please try again.';
      addToast({ type: 'error', title: 'Error', description: msg });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await productsApi.deleteProduct(deleteTarget.id);
      setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
      addToast({ type: 'success', title: 'Product deleted', description: `"${deleteTarget.name}" has been removed.` });
      setDeleteTarget(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to delete product. Please try again.';
      addToast({ type: 'error', title: 'Error', description: msg });
    } finally {
      setSaving(false);
    }
  }

  const subcatOptions = SUBCATEGORIES[form.category] || [];

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-700">Product Catalog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage products visible to clients in the catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { const l = document.createElement('a'); l.href = '/sample-products.csv'; l.download = 'sample-products.csv'; l.click(); }}
            className="px-3 py-2 text-sm border border-border rounded-lg flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Download className="w-4 h-4" /> Sample CSV
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 text-sm bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg flex items-center gap-1.5 hover:bg-indigo-100 transition-colors">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={openAdd} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#4A3B52]" />
            <h2 className="font-700 text-base">Manage Categories</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{categories.length}</span>
          </div>
          <button onClick={openAddCat} className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add Category
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No categories yet. Click &ldquo;Add Category&rdquo; to create your first one.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categories.map(cat => (
              <div key={cat.id} className="bg-muted/30 rounded-xl border border-border overflow-hidden">
                <div className="h-20 flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#E8E1F5] to-[#D6CEE8]">
                  {cat.image
                    ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                    : <span className="text-3xl select-none">{adminCatEmoji(cat.name)}</span>
                  }
                </div>
                <div className="p-2">
                  <p className="font-600 text-xs truncate">{cat.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{cat.productIds.length} product{cat.productIds.length !== 1 ? 's' : ''}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <button
                      onClick={() => openEditCat(cat)}
                      className="flex-1 py-1 text-[10px] font-600 border border-border rounded-lg hover:bg-muted transition-colors">
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteCatTarget(cat)}
                      className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative mb-4 max-w-sm" style={{ position: 'relative' }}>
        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'grey', width: '16px', height: '16px' }} />
        <input value={q} onChange={e => setQ(e.target.value)} className="input-field" style={{ paddingLeft: '40px' }} placeholder="Search products, categories..." />
        {q && (
          <button onClick={() => setQ('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
            <X style={{ width: '14px', height: '14px', color: 'grey' }} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border shadow-card p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#4A3B52] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading products...</p>
        </div>
      ) : (
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 font-600 text-muted-foreground text-xs uppercase">Product</th>
              <th className="text-left px-4 py-3 font-600 text-muted-foreground text-xs uppercase hidden sm:table-cell">Category</th>
              <th className="text-left px-4 py-3 font-600 text-muted-foreground text-xs uppercase hidden md:table-cell">Price (CNY)</th>
              <th className="text-left px-4 py-3 font-600 text-muted-foreground text-xs uppercase hidden md:table-cell">MOQ</th>
              <th className="text-left px-4 py-3 font-600 text-muted-foreground text-xs uppercase">Status</th>
              <th className="text-right px-4 py-3 font-600 text-muted-foreground text-xs uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${p.bg} flex items-center justify-center text-xl flex-shrink-0 overflow-hidden`}>
                      {p.images[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : p.emoji}
                    </div>
                    <div>
                      <span className="font-500 text-sm">{p.name}</span>
                      {(p.isNew || p.onSale) && (
                        <div className="flex gap-1 mt-0.5">
                          {p.isNew && <span className="px-1 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-700 rounded">NEW</span>}
                          {p.onSale && <span className="px-1 py-0.5 bg-red-100 text-red-700 text-[9px] font-700 rounded">SALE</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                  <div className="text-sm">{p.category}</div>
                  {p.subcategory && <div className="text-xs text-muted-foreground/70">{p.subcategory}</div>}
                </td>
                <td className="px-4 py-3 font-tabular hidden md:table-cell">{p.priceCny}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.moq}</td>
                <td className="px-4 py-3">
                  <span className={`badge text-xs font-600 ${p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}>
                    {p.active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(p)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-muted-foreground hover:text-red-600" aria-label="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No products found{q ? ` for "${q}"` : ''}</p>
                  {q && <button onClick={() => setQ('')} className="btn-primary px-4 py-1.5 text-xs">Clear Search</button>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto pt-4 md:pt-8 fade-in" onClick={closeModal}>
          <div className="bg-card rounded-2xl w-full max-w-2xl flex flex-col mb-4 mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
              <h3 className="font-700 text-lg">{modalMode === 'add' ? 'Add Product' : 'Edit Product'}</h3>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
              <div>
                <h4 className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-3">Basic Info</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-600 text-muted-foreground uppercase">Product Name *</label>
                    <input value={form.name} onChange={e => setF('name', e.target.value)} className="input-field mt-1" placeholder="e.g. Wireless Earbuds" />
                  </div>
                  <div>
                    <label className="text-xs font-600 text-muted-foreground uppercase">Emoji</label>
                    <input value={form.emoji} onChange={e => setF('emoji', e.target.value)} className="input-field mt-1 text-2xl" maxLength={4} />
                  </div>
                  <div>
                    <label className="text-xs font-600 text-muted-foreground uppercase">Category</label>
                    <select value={form.category} onChange={e => handleCategoryChange(e.target.value)} className="input-field mt-1">
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-600 text-muted-foreground uppercase">Subcategory</label>
                    <select value={form.subcategory} onChange={e => setF('subcategory', e.target.value)} className="input-field mt-1">
                      {subcatOptions.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-600 text-muted-foreground uppercase">Strip Category <span className="text-muted-foreground/60">(optional — used for the client category strip)</span></label>
                    <select value={form.categoryId} onChange={e => setF('categoryId', e.target.value)} className="input-field mt-1">
                      <option value="">— None —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-600 text-muted-foreground uppercase">Brand / Manufacturer</label>
                    <input value={form.brand} onChange={e => setF('brand', e.target.value)} className="input-field mt-1" placeholder="e.g. Generic / Brand name" />
                  </div>
                  <div>
                    <label className="text-xs font-600 text-muted-foreground uppercase">Origin City</label>
                    <select value={form.originCity} onChange={e => setF('originCity', e.target.value)} className="input-field mt-1">
                      {ORIGIN_CITIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-600 text-muted-foreground uppercase">SKU / Model Number <span className="text-muted-foreground/60">(optional)</span></label>
                    <input value={form.sku} onChange={e => setF('sku', e.target.value)} className="input-field mt-1" placeholder="e.g. TWS-BT-2025" />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-3">Pricing</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-600 text-muted-foreground uppercase">Price Range CNY *</label>
                    <input value={form.priceCny} onChange={e => setF('priceCny', e.target.value)} className="input-field mt-1" placeholder="\u00A510\u201320" />
                  </div>
                  <div>
                    <label className="text-xs font-600 text-muted-foreground uppercase">MOQ Units</label>
                    <input value={form.moq} onChange={e => setF('moq', Number(e.target.value))} type="number" min={1} className="input-field mt-1" />
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-600 text-muted-foreground uppercase">Sample Available</label>
                      <Toggle on={form.sampleAvailable} onToggle={() => setF('sampleAvailable', !form.sampleAvailable)} />
                    </div>
                  </div>
                  {form.sampleAvailable && (
                    <div className="col-span-2">
                      <label className="text-xs font-600 text-muted-foreground uppercase">Sample Price \u00A5 CNY</label>
                      <input value={form.samplePrice} onChange={e => setF('samplePrice', e.target.value)} className="input-field mt-1" placeholder="e.g. \u00A5150" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-3">Product Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-600 text-muted-foreground uppercase">Short Description <span className="text-muted-foreground/60">(1\u20132 lines, shown on card)</span></label>
                    <input value={form.shortDescription} onChange={e => setF('shortDescription', e.target.value)} className="input-field mt-1" placeholder="Brief product summary..." />
                  </div>
                  <div>
                    <label className="text-xs font-600 text-muted-foreground uppercase">Full Description <span className="text-muted-foreground/60">(shown on detail page)</span></label>
                    <textarea value={form.fullDescription} onChange={e => setF('fullDescription', e.target.value)} rows={3} className="input-field mt-1" placeholder="Detailed product description..." />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-600 text-muted-foreground uppercase">Key Features <span className="text-muted-foreground/60">(up to 6)</span></label>
                      {form.keyFeatures.length < 6 && (
                        <button type="button" onClick={addFeature} className="text-xs text-[#4A3B52] font-600 flex items-center gap-0.5 hover:underline">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {form.keyFeatures.map((feat, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4 flex-shrink-0">\u2022</span>
                          <input value={feat} onChange={e => setFeature(i, e.target.value)} className="input-field flex-1 py-1.5 text-sm" placeholder={`Feature ${i + 1}`} />
                          <button type="button" onClick={() => removeFeature(i)} className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-red-500 flex-shrink-0">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-600 text-muted-foreground uppercase">Specifications</label>
                      <button type="button" onClick={addSpec} className="text-xs text-[#4A3B52] font-600 flex items-center gap-0.5 hover:underline">
                        <Plus className="w-3 h-3" /> Add Row
                      </button>
                    </div>
                    <div className="space-y-2">
                      {form.specifications.map((spec, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input value={spec.key} onChange={e => setSpec(i, 'key', e.target.value)} className="input-field flex-1 py-1.5 text-sm" placeholder="Property (e.g. Material)" />
                          <input value={spec.value} onChange={e => setSpec(i, 'value', e.target.value)} className="input-field flex-1 py-1.5 text-sm" placeholder="Value (e.g. Stainless Steel)" />
                          <button type="button" onClick={() => removeSpec(i)} className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-red-500 flex-shrink-0">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-600 text-muted-foreground uppercase">Tags <span className="text-muted-foreground/60">(comma separated)</span></label>
                    <input value={form.tags} onChange={e => setF('tags', e.target.value)} className="input-field mt-1" placeholder="e.g. wireless, earbuds, bluetooth" />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-3">Product Specifications</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-600 text-muted-foreground uppercase">Weight (e.g. 0.5 kg)</label>
                    <input value={form.weight} onChange={e => setF('weight', e.target.value)} className="input-field mt-1" placeholder="e.g. 0.5 kg" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-600 text-muted-foreground uppercase">Material</label>
                    <input value={form.material} onChange={e => setF('material', e.target.value)} className="input-field mt-1" placeholder="e.g. Stainless Steel" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-600 text-muted-foreground uppercase">Origin (e.g. Yiwu, China)</label>
                    <input value={form.origin} onChange={e => setF('origin', e.target.value)} className="input-field mt-1" placeholder="e.g. Yiwu, China" />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-3">Media</h4>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-600 text-muted-foreground uppercase">Images <span className="text-muted-foreground/60">(up to 8, first = main)</span></label>
                    {form.images.length < 8 && (
                      <button type="button" disabled={mediaUploading} onClick={() => imgInputRef.current?.click()} className="text-xs text-[#4A3B52] font-600 flex items-center gap-0.5 hover:underline disabled:opacity-50">
                        <Plus className="w-3 h-3" /> {mediaUploading ? 'Uploading…' : 'Upload'}
                      </button>
                    )}
                  </div>
                  <input ref={imgInputRef} type="file" accept="image/*" multiple onChange={handleImgUpload} className="hidden" />
                  {form.images.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {form.images.map((img, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                          <img src={previewSrc(img)} alt={`img${i}`} className="w-full h-full object-cover" />
                          {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center py-0.5">MAIN</span>}
                          <button type="button" onClick={() => setF('images', form.images.filter((_, idx) => idx !== i))}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button type="button" onClick={() => imgInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-border rounded-lg py-4 text-sm text-muted-foreground hover:border-[#4A3B52] hover:text-[#4A3B52] transition-colors">
                      Click to upload images
                    </button>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-600 text-muted-foreground uppercase">Videos <span className="text-muted-foreground/60">(up to 2, mp4/mov)</span></label>
                    {form.videos.length < 2 && (
                      <button type="button" disabled={mediaUploading} onClick={() => vidInputRef.current?.click()} className="text-xs text-[#4A3B52] font-600 flex items-center gap-0.5 hover:underline disabled:opacity-50">
                        <Plus className="w-3 h-3" /> {mediaUploading ? 'Uploading…' : 'Upload'}
                      </button>
                    )}
                  </div>
                  <input ref={vidInputRef} type="file" accept="video/mp4,video/quicktime" multiple onChange={handleVidUpload} className="hidden" />
                  {form.videos.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {form.videos.map((vid, i) => (
                        <div key={i} className="relative w-24 h-16 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center">
                          <video src={previewSrc(vid)} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <span className="text-white text-lg">\u25B6</span>
                          </div>
                          <button type="button" onClick={() => setF('videos', form.videos.filter((_, idx) => idx !== i))}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button type="button" onClick={() => vidInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-border rounded-lg py-4 text-sm text-muted-foreground hover:border-[#4A3B52] hover:text-[#4A3B52] transition-colors">
                      Click to upload videos
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-3">Settings</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-600 text-muted-foreground uppercase">Card Colour</label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {BG_OPTIONS.map(bg => (
                        <button key={bg} type="button" onClick={() => setF('bg', bg)} className={`w-7 h-7 rounded-lg ${bg} border-2 transition-all ${form.bg === bg ? 'border-[#4A3B52] scale-110' : 'border-transparent'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-500">Visible to clients</span>
                    <Toggle on={form.active} onToggle={() => setF('active', !form.active)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-500">NEW badge</span>
                    <Toggle on={form.isNew} onToggle={() => setF('isNew', !form.isNew)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-500">SALE badge</span>
                    <Toggle on={form.onSale} onToggle={() => setF('onSale', !form.onSale)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-6 py-4 border-t border-border flex-shrink-0">
              <button onClick={closeModal} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving || mediaUploading || !form.name.trim() || !form.priceCny.trim()} className="btn-primary flex-1 py-2.5 text-sm">
                {saving ? 'Saving...' : modalMode === 'add' ? 'Add Product' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {catModalMode && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto pt-4 md:pt-8 fade-in" onClick={closeCatModal}>
          <div className="bg-card rounded-2xl w-full max-w-lg flex flex-col mb-4 mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
              <h3 className="font-700 text-lg">{catModalMode === 'add' ? 'Add Category' : 'Edit Category'}</h3>
              <button onClick={closeCatModal} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase">Category Name *</label>
                <input
                  value={catForm.name}
                  onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                  className="input-field mt-1"
                  placeholder="e.g. Electronics"
                />
              </div>

              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase">Category Image</label>
                <input ref={catImgRef} type="file" accept="image/*" onChange={handleCatImgUpload} className="hidden" />
                {catForm.image ? (
                  <div className="relative w-28 h-20 mt-2 rounded-xl overflow-hidden border border-border">
                    <img src={catForm.image} alt="category" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCatForm(f => ({ ...f, image: '' }))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => catImgRef.current?.click()}
                    className="mt-2 flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-[#4A3B52] hover:text-[#4A3B52] transition-colors w-full justify-center">
                    <ImageIcon className="w-4 h-4" /> Upload image
                  </button>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">Stored as base64 in localStorage key: catalog-category-image-{'{categoryId}'}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-600 text-muted-foreground uppercase">Products in this category</label>
                  <span className="text-xs text-muted-foreground">{catForm.productIds.length} selected</span>
                </div>
                <div className="border border-border rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-border">
                  {products.map(p => (
                    <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={catForm.productIds.includes(p.id)}
                        onChange={() => toggleCatProduct(p.id)}
                        className="w-4 h-4 rounded accent-accent cursor-pointer"
                      />
                      <div className={`w-7 h-7 rounded-lg ${p.bg} flex items-center justify-center text-sm overflow-hidden flex-shrink-0`}>
                        {p.images[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : p.emoji}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-500 truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.category}</p>
                      </div>
                    </label>
                  ))}
                  {products.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No products yet</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-6 py-4 border-t border-border flex-shrink-0">
              <button onClick={closeCatModal} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
              <button onClick={saveCat} disabled={savingCat || !catForm.name.trim()} className="btn-primary flex-1 py-2.5 text-sm">
                {savingCat ? 'Saving...' : catModalMode === 'add' ? 'Add Category' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteCatTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto pt-4 md:pt-8 fade-in" onClick={() => setDeleteCatTarget(null)}>
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 mb-4 mx-4" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-700 text-center mb-1">Delete Category?</h3>
            <p className="text-sm text-muted-foreground text-center mb-1">
              &ldquo;{deleteCatTarget.name}&rdquo; will be permanently removed.
            </p>
            <p className="text-xs text-muted-foreground text-center mb-5">Products in this category will <strong>not</strong> be deleted.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteCatTarget(null)} className="btn-secondary flex-1 py-2 text-sm">Cancel</button>
              <button onClick={confirmDeleteCat} disabled={savingCat} className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-600 transition-colors">
                {savingCat ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto pt-4 md:pt-8 fade-in" onClick={() => setDeleteTarget(null)}>
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 mb-4 mx-4" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-700 text-center mb-1">Delete Product?</h3>
            <p className="text-sm text-muted-foreground text-center mb-5">
              &ldquo;{deleteTarget.name}&rdquo; will be permanently removed from the catalog.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1 py-2 text-sm">Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-600 transition-colors">
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ImportProductsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => setShowImportModal(false)}
      />
    </AdminLayout>
  );
}
