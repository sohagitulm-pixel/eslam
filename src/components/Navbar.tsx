import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Navbar: React.FC = () => {
  const { t, lang, toggleLang, navigate, user, isAdmin } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F6]/95 border-b border-stone-200/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <a
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
          className="font-display text-2xl font-semibold tracking-tight text-stone-900 whitespace-nowrap shrink-0"
        >
          {t.brand}
        </a>

        {/* Zone 2: 4–5 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
          <a
            href="#/templates"
            onClick={(e) => {
              e.preventDefault();
              navigate('/templates');
            }}
            className="hover:text-stone-950 transition-colors whitespace-nowrap shrink-0"
          >
            {t.nav.templates}
          </a>
          <a
            href="#/b/sample-layla-romantic"
            onClick={(e) => {
              e.preventDefault();
              navigate(lang === 'ar' ? '/b/sample-omar-golden-ar' : '/b/sample-layla-romantic');
            }}
            className="hover:text-stone-950 transition-colors whitespace-nowrap shrink-0"
          >
            {t.nav.examples}
          </a>
          <a
            href="#/dashboard"
            onClick={(e) => {
              e.preventDefault();
              navigate('/dashboard');
            }}
            className="hover:text-stone-950 transition-colors whitespace-nowrap shrink-0"
          >
            {user ? t.nav.dashboard : t.nav.signIn}
          </a>
          {isAdmin && (
            <a
              href="#/admin"
              onClick={(e) => {
                e.preventDefault();
                navigate('/admin');
              }}
              className="hover:text-stone-950 transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.admin}
            </a>
          )}
          <button
            type="button"
            onClick={toggleLang}
            className="hover:text-[#C83E5B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.nav.langSwitch}
          </button>
        </nav>

        {/* Zone 3: 1 primary CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/create')}
            className="px-4 py-2 rounded-lg bg-[#C83E5B] text-white text-xs sm:text-sm font-medium hover:bg-[#b0324d] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.nav.create}
          </button>
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg border border-stone-200 text-stone-700"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 py-4 flex flex-col gap-3 text-sm font-medium text-stone-700">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              navigate('/templates');
            }}
            className="text-start py-2"
          >
            {t.nav.templates}
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              navigate(lang === 'ar' ? '/b/sample-omar-golden-ar' : '/b/sample-layla-romantic');
            }}
            className="text-start py-2"
          >
            {t.nav.examples}
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              navigate('/dashboard');
            }}
            className="text-start py-2"
          >
            {user ? t.nav.dashboard : t.nav.signIn}
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                navigate('/admin');
              }}
              className="text-start py-2"
            >
              {t.nav.admin}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              toggleLang();
              setMobileOpen(false);
            }}
            className="text-start py-2 text-[#C83E5B]"
          >
            {t.nav.langSwitch}
          </button>
        </div>
      )}
    </header>
  );
};
