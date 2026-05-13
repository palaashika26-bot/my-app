'use client';
import React from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockAdminOrders, mockRequests, adminKpis, recentActivity, pendingActions, mockClients } from '@/lib/adminMockData';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { ShoppingBag, Users, Truck, Clock, IndianRupee, AlertTriangle, ArrowRight, Sun, Plus, Download, MapPin, Eye, Camera } from 'lucide-react';

function Kpi({ icon: Icon, label, value, sub, accent, color }: any) {
  return (
    <div className={`bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border card-hover border-l-4 ${accent}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-4 h-4" /></div>
      </div>
      <p className="text-2xl sm:text-3xl font-700 font-tabular text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground font-500 mt-1">{sub}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const recentOrders = mockAdminOrders.slice(0, 5);
  const recentRequestsList = mockRequests.slice(0, 5);
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const pipelineNodes = [
    { label: 'China Warehouse',          count: 12, color: 'bg-cyan-500',     ring: 'ring-cyan-100' },
    { label: 'Consolidation Warehouse',  count: 5,  color: 'bg-indigo-500',   ring: 'ring-indigo-100' },
    { label: 'In Transit',               count: 23, color: 'bg-orange-500',   ring: 'ring-orange-100' },
    { label: 'India Warehouse',          count: 4,  color: 'bg-emerald-500',  ring: 'ring-emerald-100' },
    { label: 'Out for Delivery',         count: 2,  color: 'bg-green-500',    ring: 'ring-green-100' },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-700">Welcome back, Admin 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
            <span>{today}</span><span>•</span><span className="inline-flex items-center gap-1"><Sun className="w-3.5 h-3.5 text-yellow-500" /> 33°C Sunny in Mumbai</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/all-orders" className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> View All Orders</Link>
          <Link href="/admin/requests" className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> View All Requests</Link>
          <Link href="/admin/suppliers" className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Supplier</Link>
          <button className="btn-primary px-3 py-2 text-xs inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export Reports</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <Kpi icon={ShoppingBag} label="Total Orders"      value="247"        sub="+12 this month"  accent="border-orange-500" color="bg-orange-50 text-orange-600" />
        <Kpi icon={Users}       label="Total Clients"     value="156"        sub="+8 this month"   accent="border-blue-500"   color="bg-blue-50 text-blue-600" />
        <Kpi icon={Truck}       label="Active Shipments"  value="23"         sub="in pipeline"     accent="border-cyan-500"   color="bg-cyan-50 text-cyan-600" />
        <Kpi icon={Clock}       label="Pending Approvals" value="8"          sub="need attention"  accent="border-yellow-500" color="bg-yellow-50 text-yellow-600" />
        <Kpi icon={IndianRupee} label="Revenue (MTD)"     value="₹45.2L"    sub="+18% vs last"    accent="border-emerald-500" color="bg-emerald-50 text-emerald-600" />
        <Kpi icon={AlertTriangle} label="Exceptions"       value="3"          sub="to resolve"      accent="border-red-500"    color="bg-red-50 text-red-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-3"><h3 className="font-700">Monthly Revenue</h3><span className="text-xs text-muted-foreground">Last 6 months</span></div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={adminKpis.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} style={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => `₹${(v/100000).toFixed(2)}L`} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }} />
              <Line type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={3} dot={{ fill: '#F97316', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-3"><h3 className="font-700">Orders by Status</h3></div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={adminKpis.ordersByStatus} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {adminKpis.ordersByStatus.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4"><h3 className="font-700">China → India Pipeline</h3><Link href="/admin/logistics" className="text-xs text-accent font-600 hover:underline inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Open logistics</Link></div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
          <span className="text-2xl flex-shrink-0">🇨🇳</span>
          {pipelineNodes.map((n, i) => (
            <React.Fragment key={n.label}>
              <div className="flex-shrink-0 text-center">
                <div className={`w-14 h-14 rounded-2xl ${n.color} ${n.ring} ring-4 text-white flex items-center justify-center text-xl font-700 mx-auto shadow-card`}>{n.count}</div>
                <p className="text-[10px] font-600 text-muted-foreground mt-2 max-w-[88px]">{n.label}</p>
              </div>
              {i < pipelineNodes.length - 1 && <div className="flex-1 min-w-[24px] h-0.5 bg-gradient-to-r from-border to-border relative"><div className="absolute inset-y-0 -top-0.5 left-1/2 -translate-x-1/2 text-muted-foreground"><ArrowRight className="w-3.5 h-3.5" /></div></div>}
            </React.Fragment>
          ))}
          <span className="text-2xl flex-shrink-0">🇮🇳</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-3"><h3 className="font-700">Pending Actions</h3><span className="badge bg-orange-100 text-orange-700">{pendingActions.length} items</span></div>
          <div className="space-y-2">
            {pendingActions.map(a => (
              <Link key={a.id} href={a.href} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                <div><p className="text-sm font-600 text-foreground">{a.title}</p><p className="text-xs text-muted-foreground">{a.desc}</p></div>
                <span className="text-xs text-accent font-600 inline-flex items-center gap-1">{a.action} <ArrowRight className="w-3 h-3" /></span>
              </Link>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-700 mb-3">Recent Activity</h3>
          <ol className="space-y-3 max-h-72 overflow-y-auto">
            {recentActivity.map(a => (
              <li key={a.id} className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">{a.icon}</span>
                <div className="flex-1 min-w-0"><p className="text-sm text-foreground">{a.text}</p><p className="text-[10px] text-muted-foreground mt-0.5">{a.time}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border"><h3 className="font-700">Recent Orders</h3><Link href="/admin/all-orders" className="text-xs text-accent font-600">View all →</Link></div>
          <div className="divide-y divide-border">
            {recentOrders.map(o => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors">
                <div className="flex-1 min-w-0"><p className="font-tabular font-600 text-sm truncate">{o.orderId}</p><p className="text-xs text-muted-foreground truncate">{o.client} • {o.itemNames}</p></div>
                <span className="font-tabular font-600 text-sm flex-shrink-0">{o.amount}</span>
                <StatusBadge status={o.status as any} />
              </Link>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border"><h3 className="font-700">Recent Requests</h3><Link href="/admin/requests" className="text-xs text-accent font-600">View all →</Link></div>
          <div className="divide-y divide-border">
            {recentRequestsList.map(r => (
              <Link key={r.id} href={`/admin/requests/${r.id}`} className={`flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors ${r.status === 'Exception' ? 'bg-red-50/40' : ''}`}>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-1.5">{r.source === 'photo_scan' && <Camera className="w-3 h-3 text-accent" />}<p className="font-tabular font-600 text-sm">{r.requestId}</p></div><p className="text-xs text-muted-foreground truncate">{r.client} • {r.itemNames}</p></div>
                <span className="font-tabular font-600 text-sm flex-shrink-0">{r.totalBudget}</span>
                <StatusBadge status={r.status as any} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
