'use client';
import React, { useState } from 'react';
import ClientShell from '@/components/ClientShell';
import { useToast } from '@/components/ui/Toast';
import { MessageCircle, Mail, Phone, ChevronDown, MessageSquare } from 'lucide-react';

const faqs = [
  { q: 'How long does sourcing take?', a: 'Typically 7–12 days from quotation acceptance until the goods reach our China warehouse.' },
  { q: 'What payment methods do you accept?', a: 'Bank transfer (NEFT/RTGS), UPI for advance, and payment gateways for amounts under ₹5L.' },
  { q: 'How is customs duty calculated?', a: 'Customs duty is based on the HSN code and CIF value. We provide an estimate upfront.' },
  { q: 'Can I cancel an order?', a: 'Yes, before payment confirmation. After sourcing begins, cancellation policies apply.' },
  { q: 'What is the minimum order value?', a: 'No minimum order value, but MOQs may apply per product based on supplier requirements.' },
  { q: 'Do you handle GST invoicing?', a: 'Yes, GST-compliant invoices are issued for all transactions.' },
  { q: 'How does shipment tracking work?', a: 'Real-time tracking is available in your dashboard with live map updates.' },
  { q: 'What if items get damaged?', a: 'We have insurance coverage and a strict QC process at our China warehouse.' },
];

export default function SupportPage() {
  const { addToast } = useToast();
  const [open, setOpen] = useState<number | null>(0);
  const [form, setForm] = useState({ subject: '', category: 'General', desc: '' });

  return (
    <ClientShell>
      <h1 className="text-2xl font-700 mb-1">Help & Support</h1>
      <p className="text-sm text-muted-foreground mb-5">We're here to help 24/7</p>
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {[{icon: MessageCircle, l: 'WhatsApp', v: '+91 98765 43210', bg: 'bg-green-50', c: 'text-green-600'}, {icon: Mail, l: 'Email', v: 'support@elioswholesale.in', bg: 'bg-blue-50', c: 'text-blue-600'}, {icon: Phone, l: 'Call', v: '+91 22 4567 8900', bg: 'bg-orange-50', c: 'text-orange-600'}].map(c => (
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
                  <span className="text-sm font-500">{f.q}</span><ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open === i ? 'rotate-180' : ''}`} />
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
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input-field"><option>General</option><option>Order Issue</option><option>Payment</option><option>Account</option></select>
              <textarea value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} className="input-field" rows={4} placeholder="Describe your issue..." />
              <button onClick={() => { addToast({ type: 'success', title: 'Ticket submitted', description: 'Our team will respond within 4 hours.' }); setForm({ subject: '', category: 'General', desc: '' }); }} className="btn-primary w-full py-2 text-sm">Submit Ticket</button>
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-card rounded-xl border border-border shadow-card p-5 flex items-center gap-3">
            <MessageSquare className="w-10 h-10 text-accent" />
            <div className="flex-1"><p className="font-700">Chat with our team</p><p className="text-xs text-muted-foreground">Live chat (English / Hindi)</p></div>
            <span className="badge bg-yellow-100 text-yellow-700">Coming soon</span>
          </div>
        </div>
      </div>
    </ClientShell>
  );
}
