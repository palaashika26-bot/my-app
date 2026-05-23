'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, FileText, BookOpen, Truck } from 'lucide-react'

const navItems = [
  { href: '/client-dashboard', icon: Home, label: 'Home' },
  { href: '/client-dashboard/orders', icon: ShoppingBag, label: 'Orders' },
  { href: '/client-dashboard/requests', icon: FileText, label: 'Requests' },
  { href: '/catalog', icon: BookOpen, label: 'Catalog' },
  { href: '/client-dashboard/logistics', icon: Truck, label: 'Logistics' },
]

export default function ClientBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#F8F9F9] border-t border-[#C8BEE0] safe-area-inset-bottom">
      <div className="flex items-center justify-around" style={{ minHeight: '56px', height: '4rem' }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === '/client-dashboard'
              ? pathname === '/client-dashboard'
              : pathname?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 min-w-0 px-1 ${
                isActive ? 'text-[#4A3B52]' : 'text-gray-500'
              }`}
              style={{ minHeight: '44px' }}
            >
              <Icon size={20} className="flex-shrink-0" />
              <span className="text-[10px] leading-tight truncate w-full text-center">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
