'use client';
import React from 'react';
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell,
} from 'recharts';

// recharts is a large dependency. These charts are split into their own module so
// the admin dashboard can dynamically import them (next/dynamic, ssr:false),
// keeping recharts out of the dashboard's initial bundle.

interface RevenuePoint { month: string; revenue: number }
interface StatusPoint { name: string; value: number; color: string }

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} style={{ fontSize: 11 }} />
        <Tooltip formatter={(v: any) => `₹${(v / 100000).toFixed(2)}L`} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }} />
        <Line type="monotone" dataKey="revenue" stroke="#4A3B52" strokeWidth={3} dot={{ fill: '#4A3B52', r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function OrdersByStatusChart({ data }: { data: StatusPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <XAxis type="number" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
        <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
