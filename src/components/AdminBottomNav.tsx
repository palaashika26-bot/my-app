'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, FileText, Truck, BookOpen } from 'lucide-react'

const navItems = [
  { href: '/admin', icon: Home, label: 'Dashboard' },
  { href: '/admin/all-orders', icon: ShoppingBag, label: 'Orders' },
  { href: '/admin/requests', icon: FileText, label: 'Requests' },
  { href: '/admin/logistics', icon: Truck, label: 'Logistics' },
  { href: '/admin/catalog', icon: BookOpen, label: 'Catalog' },
]

export default function AdminBottomNav() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY < 10) {
        setVisible(true)
      } else if (currentScrollY > lastScrollY) {
        setVisible(false)
      } else {
        setVisible(true)
      }
      setLastScrollY(currentScrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#F8F9F9] border-t border-[#C8BEE0] transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="flex items-center justify-around" style={{ minHeight: '56px', height: '4rem' }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/admin' ? pathname === '/admin' : pathname?.startsWith(href)
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
