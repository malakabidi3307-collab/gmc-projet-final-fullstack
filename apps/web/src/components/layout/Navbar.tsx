"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Accueil", href: "/" },
  { label: "Formations", href: "/formations" },
  { label: "À propos", href: "/a-propos" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"
        aria-label="Navigation principale"
      >
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-extrabold tracking-wide text-blue-900"
          onClick={() => setIsOpen(false)}
        >
          IFAG
          <span className="ml-2 text-sm font-medium text-gray-500">
            Formation
          </span>
        </Link>

        {/* Navigation desktop */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-700 transition-colors hover:text-blue-800"
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="/connexion"
            className="rounded-lg bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
          >
            Connexion
          </Link>
        </div>

        {/* Bouton menu mobile */}
        <button
          type="button"
          className="rounded-md p-2 text-gray-700 hover:bg-gray-100 md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Navigation mobile */}
      {isOpen && (
        <div className="border-t border-gray-200 bg-white px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="font-medium text-gray-700 hover:text-blue-800"
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/connexion"
              onClick={() => setIsOpen(false)}
              className="rounded-lg bg-blue-900 px-5 py-3 text-center font-semibold text-white hover:bg-blue-800"
            >
              Connexion
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
