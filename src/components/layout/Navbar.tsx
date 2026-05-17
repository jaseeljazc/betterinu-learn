"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { clientAuth } from "@/lib/firebase-client";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  async function handleSignOut() {
    await clientAuth.signOut();
    document.cookie = "__session=; path=/; max-age=0";
    window.location.href = "/login";
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-[64px] border-b border-default bg-white/98 backdrop-blur-xl">
      <nav
        className="mx-auto relative flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Primary navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center focus-ring rounded group h-9"
        >
          <Image
            src="/new-logo.svg"
            alt="Betterinu Logo"
            width={120}
            height={36}
            unoptimized
            className="h-full w-auto object-contain transition-transform group-hover:scale-105"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-8 font-medium text-[13px] text-secondary">
          <Link href="/" className="transition-colors hover:text-primary">
            Home
          </Link>
          <Link href="/assignments" className="transition-colors hover:text-primary">
            My Tasks
          </Link>
          <Link href="/about" className="transition-colors hover:text-primary">
            About
          </Link>
          <Link
            href="/support"
            className="transition-colors hover:text-primary"
          >
            Support
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            className="hidden md:flex items-center gap-2 rounded-sm border border-default bg-white py-1.5 pl-2 pr-3.5 text-xs font-bold text-foreground transition-all hover:bg-subtle focus-ring"
            aria-label="Sign out"
          >
            <span className="grid size-6 place-items-center rounded-sm bg-subtle">
              <LogOut className="size-3.5 text-muted" aria-hidden />
            </span>
            <span className="hidden sm:inline text-muted">Sign out</span>
          </button>
          
          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden flex items-center justify-center p-2 ml-1 rounded-md text-secondary hover:text-primary hover:bg-subtle transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-[64px] left-0 right-0 border-b border-default bg-white shadow-lg shadow-black/5 animate-in slide-in-from-top-2">
          <div className="flex flex-col px-4 py-4 space-y-4 font-medium text-[15px] text-secondary">
            <Link 
              href="/" 
              className="block w-full transition-colors hover:text-primary"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/assignments" 
              className="block w-full transition-colors hover:text-primary"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              My Tasks
            </Link>
            <Link 
              href="/about" 
              className="block w-full transition-colors hover:text-primary"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link 
              href="/support" 
              className="block w-full transition-colors hover:text-primary"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Support
            </Link>
            <div className="pt-2 mt-2 border-t border-default">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="flex w-full items-center gap-2 py-2 text-foreground transition-colors hover:text-red-600 font-bold"
              >
                <LogOut className="size-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
