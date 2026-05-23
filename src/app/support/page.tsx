'use client';
import React, { useState, useRef } from 'react';
import ClientLayout from '@/components/ClientLayout';
import { useToast } from '@/components/ui/Toast';
import { MessageCircle, Mail, Phone, ChevronDown, MessageSquare, Paperclip, X, FileText, Play } from 'lucide-react';

const faqs = [
  { q: 'How long does sourcing take?',         a: 'Typically 7–12 days from quotation acceptance until the goods reach our China warehouse.' },
  { q: 'What payment methods do you accept?',  a: 'Bank transfer (NEFT/RTGS), UPI for advance, and payment gateways for amounts under ₹5L.' },
  { q: 'How is customs duty calculated?',      a: 'Customs duty is based on the HSN code and CIF value. We provide an estimate upfront.' },
  { q: 'Can I cancel an order?',               a: 'Yes, before payment confirmation. After sourcing begins, cancellation policies apply.' },
  { q: 'What is the minimum order value?',     a: 'No minimum order value, but MOQs may apply per product based on supplier requirements.' },
  { q: 'Do you handle GST invoicing?',         a: 'Yes, GST-compliant invoices are issued for all transactions.' },
  { q: 'How does shipment tracking work?',     a: 'Real-time tracking is available in your dashboard with live map updates.' },
  { q: 'What if items get damaged?',           a: 'We have insurance coverage and a strict QC process at our China warehouse.' },
];

interface Attachment {
  name: string;
  type: 'image' | 'video' | 'pdf';
  base64: string;
  size: number;
}

function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

export default function SupportPage() {
  const { addToast } = useToast();
  const [open, setOpen] = useState<number | null>(0);
  const [form, setForm] = useState({ subject: '', category: 'General', desc: '' });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (attachments.length + picked.length > 3) {
      addToast({ type: 'warning', title: 'Max 3 attachments per ticket' });
      e.target.value = '';
      return;
    }
    const results: Attachment[] = [];
    for (const file of picked) {
      if (file.size > 5 * 1024 * 1024) {
        addToast({ type: 'warning', title: `"${file.name}" exceeds 5 MB and was skipped` });
        continue;
      }
      const base64 = await toBase64(file);
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'pdf';
      results.push({ name: file.name, type, base64, size: file.size });
    }
    setAttachments(prev => [...prev, ...results].slice(0, 3));
    e.target.value = '';
  }

  function submitTicket() {
    const ticketId = `TKT-${Date.now()}`;
    if (attachments.length > 0) {
      localStorage.setItem(`support-client-attachments-${ticketId}`, JSON.stringify(attachments));
    }
    addToast({ type: 'success', title: 'Ticket submitted', description: 'Our team will respond within 4 hours.' });
    setForm({ subject: '', category: 'General', desc: '' });
    setAttachments([]);
  }

  return (
    <ClientLayout>
      <h1 className="text-2xl font-700 mb-1">Help &amp; Support</h1>
      <p className="text-sm text-muted-foreground mb-5">We're here to help 24/7</p>
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {[
          { icon: MessageCircle, l: 'WhatsApp', v: '+91 98765 43210',        bg: 'bg-green-50',  c: 'text-green-600' },
          { icon: Mail,          l: 'Email',    v: 'support@elioswholesale.in', bg: 'bg-[#e4f4f4]',   c: 'text-[#4a9e9f]' },
          { icon: Phone,         l: 'Call',     v: '+91 22 4567 8900',        bg: 'bg-[#f0eef8]', c: 'text-[#5c5470]' },
        ].map(c => (
          <div key={c.l} className="bg-card rounded-xl border border-border shadow-card p-4 flex items-center gap-3 card-hover">
            <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.c} flex items-center justify-center`}><c.icon className="w-5 h-5" /></div>
            <div><p className="text-xs text-muted-foreground">{c.l}</p><p className="font-600 text-sm font-tabular">{c.v}</p></div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-700 mb-3">Frequently Asked Questions</h3>
          <div className="divide-y divide-border">
            {faqs.map((f, i) => (
              <div key={i} className="py-3">
                <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between text-left">
                  <span className="text-sm font-500">{f.q}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open === i ? 'rotate-180' : ''}`} />
                </button>
                {open === i && <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Submit a Ticket</h3>
            <div className="space-y-2">
              <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="input-field" placeholder="Subject" />
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input-field">
                <option>General</option><option>Order Issue</option><option>Payment</option><option>Account</option>
              </select>
              <textarea value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} className="input-field" rows={4} placeholder="Describe your issue..." />

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {attachments.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-2 py-1 border border-border">
                      {a.type === 'image' ? (
                        <button type="button" onClick={() => setLightbox(a.base64)}>
                          <img src={a.base64} alt={a.name} className="w-8 h-8 object-cover rounded cursor-zoom-in" />
                        </button>
                      ) : a.type === 'video' ? (
                        <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center"><Play className="w-4 h-4 text-slate-600" /></div>
                      ) : (
                        <div className="w-8 h-8 bg-red-50 rounded flex items-center justify-center"><FileText className="w-4 h-4 text-red-500" /></div>
                      )}
                      <span className="text-[10px] text-muted-foreground max-w-[90px] truncate">{a.name}</span>
                      <button type="button" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept="image/*,video/*,.pdf" multiple onChange={handleFiles} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={attachments.length >= 3}
                  title="Attach files (max 3, up to 5 MB each)"
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 disabled:opacity-40 border border-border"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                {attachments.length > 0 && <span className="text-xs text-muted-foreground">{attachments.length}/3</span>}
                <button onClick={submitTicket} className="btn-primary flex-1 py-2 text-sm">Submit Ticket</button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#E8E1F5] to-card rounded-xl border border-border shadow-card p-5 flex items-center gap-3">
            <MessageSquare className="w-10 h-10 text-[#4A3B52]" />
            <div className="flex-1"><p className="font-700">Chat with our team</p><p className="text-xs text-muted-foreground">Live chat (English / Hindi)</p></div>
            <span className="badge bg-yellow-100 text-yellow-700">Coming soon</span>
          </div>
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="attachment" className="max-w-full max-h-[90vh] rounded-xl shadow-xl" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"><X className="w-5 h-5" /></button>
        </div>
      )}
    </ClientLayout>
  );
}
