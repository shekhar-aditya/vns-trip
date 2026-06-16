'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', icon: '🏠', label: 'Home' },
  { href: '/expenses', icon: '📋', label: 'Expenses' },
  { href: '/add', icon: '+', label: 'Add', isFab: true },
  { href: '/settle', icon: '💰', label: 'Settle' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" id="main-navigation">
      <div className="bottom-nav__inner">
        {navItems.map(item => {
          const isActive = pathname === item.href;

          if (item.isFab) {
            return (
              <Link key={item.href} href={item.href} className="fab" id="nav-add-expense">
                <div className="fab__button">+</div>
                <span className="fab__label">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
              id={`nav-${item.label.toLowerCase()}`}
            >
              <span className="bottom-nav__icon">{item.icon}</span>
              <span className="bottom-nav__label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
