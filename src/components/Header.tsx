"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <svg
              width="50"
              height="24"
              viewBox="0 0 50 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-black"
            >
              <path
                d="M0 0.5H5.5V23.5H0V0.5Z"
                fill="currentColor"
              />
              <path
                d="M8.5 0.5H14V9.5L22 0.5H29L19 11.5L30 23.5H23L14 13.5V23.5H8.5V0.5Z"
                fill="currentColor"
              />
              <path
                d="M32 5.5C32 2.74 34.24 0.5 37 0.5C39.76 0.5 42 2.74 42 5.5C42 8.26 39.76 10.5 37 10.5C34.24 10.5 32 8.26 32 5.5Z"
                fill="currentColor"
              />
              <path
                d="M34 12.5H40V23.5H34V12.5Z"
                fill="currentColor"
              />
              <path
                d="M44 5.5H50V8.5H44V5.5Z"
                fill="currentColor"
              />
              <path
                d="M44 12.5H50V23.5H44V12.5Z"
                fill="currentColor"
              />
            </svg>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm text-gray-700 hover:text-black transition-colors py-4">
                Features
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm text-gray-700 hover:text-black transition-colors py-4">
                Use Cases
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm text-gray-700 hover:text-black transition-colors py-4">
                Resources
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </nav>

          {/* Right side buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              href="#"
              className="text-sm text-gray-700 hover:text-black transition-colors"
            >
              Log in
            </Link>
            <Link
              href="#"
              className="text-sm text-gray-700 hover:text-black transition-colors"
            >
              Request a demo
            </Link>
            <Link
              href="#"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-black bg-[#5CC5DE] hover:bg-[#4AB5CE] rounded-full transition-colors"
            >
              Start free trial
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100">
          <div className="px-4 py-4 space-y-3">
            <button className="flex items-center justify-between w-full text-sm text-gray-700 py-2">
              Features
              <ChevronDown className="w-4 h-4" />
            </button>
            <button className="flex items-center justify-between w-full text-sm text-gray-700 py-2">
              Use Cases
              <ChevronDown className="w-4 h-4" />
            </button>
            <button className="flex items-center justify-between w-full text-sm text-gray-700 py-2">
              Resources
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <Link href="#" className="block text-sm text-gray-700 py-2">
                Log in
              </Link>
              <Link href="#" className="block text-sm text-gray-700 py-2">
                Request a demo
              </Link>
              <Link
                href="#"
                className="block text-center px-4 py-2 text-sm font-medium text-black bg-[#5CC5DE] hover:bg-[#4AB5CE] rounded-full transition-colors"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
