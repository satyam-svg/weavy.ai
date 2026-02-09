"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      setIsScrolled(scrollY > 20);
      setIsHidden(scrollY + windowHeight > documentHeight - 400);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Navbar white (dark theme) sirf ExploreWorkflows section me; baaki page pe nahi
  useEffect(() => {
    const section = document.getElementById("explore-workflows");
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsDarkTheme(entry.isIntersecting),
      { threshold: 0.1, rootMargin: "0px" }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const navTextColor = isDarkTheme ? "text-white hover:text-gray-300" : "text-black hover:text-gray-600";
  const logoBrightness = isDarkTheme ? "brightness-0 invert" : "brightness-0";
  const menuIconColor = isDarkTheme ? "text-white" : "text-black";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 transform ${isHidden ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}>
      {/* Top Black Strip */}
      <div className="bg-black text-white py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-3">
            <Image
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/2f5fd82e-0e64-4bc1-b8bd-486911a2d083-weavy-ai/assets/images/69032e91ec29a8f27508fa9c_Image-Figma_acc-1.avif"
              alt="Weavy is now a part of Figma"
              width={80}
              height={20}
              className="h-5 w-auto"
              priority
            />
            <span className="text-sm font-medium">Weavy is now a part of Figma</span>
          </div>
        </div>
      </div>

      {/* Main Navbar - transparent, body bg shows through */}
      <div className="bg-transparent min-h-16">
        <div className="flex items-center justify-between h-16 pr-0">
          {/* Logo Section - Extreme Left */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo_weavy_black.svg"
              alt="Weavy Logo"
              width={235}
              height={40}
              className={`h-10 w-auto transition-all duration-300 mb-6 ${logoBrightness}`}
              priority
            />
          </Link>

          {/* Right side content: Navigation + CTA */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            {/* Desktop Navigation */}
            <div className="flex items-center gap-6 mb-8 ">
              <Link
                href="/collective"
                className={`text-[10px] font-bold transition-colors tracking-widest ${navTextColor}`}
              >
                COLLECTIVE
              </Link>
              <Link
                href="/enterprise"
                className={`text-[10px] font-bold transition-colors tracking-widest ${navTextColor}`}
              >
                ENTERPRISE
              </Link>
              <Link
                href="/pricing"
                className={`text-[10px] font-bold transition-colors tracking-widest ${navTextColor}`}
              >
                PRICING
              </Link>
              <Link
                href="/demo"
                className={`text-[10px] font-bold transition-colors tracking-widest ${navTextColor}`}
              >
                REQUEST A DEMO
              </Link>
              <Link
                href="/signin"
                className={`text-[10px] font-bold transition-colors tracking-widest ${navTextColor}`}
              >
                SIGN IN
              </Link>
            </div>

            {/* CTA Buttons */}
            <div className={`transition-all duration-1000 ease-in-out ${isScrolled ? "mb-7" : "mt-6"}`}>
              <Link
                href="/signin"
                className={`transition-all duration-1000 ease-in-out bg-[#F0FF80] text-black  flex rounded-bl-xl hover:bg-[#e2f07d] leading-none will-change-[width,height,transform,font-size] ${
                  isScrolled 
                    ? "w-[100px] h-[35px] text-[10px] uppercase items-center justify-center p-0" 
                    : "w-[220px] h-[88px] text-4xl items-end justify-start pl-2 pb-2"
                }`}
              >
                {isScrolled ? "START NOW" : "Start Now"}
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className={`w-6 h-6 transition-colors ${menuIconColor}`}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 px-4 sm:px-6 border-t border-gray-300">
            <div className="flex flex-col gap-4">
              <Link
                href="/collective"
                className="text-sm font-medium text-black hover:text-gray-600 transition-colors tracking-wide"
                onClick={() => setIsMenuOpen(false)}
              >
                COLLECTIVE
              </Link>
              <Link
                href="/enterprise"
                className="text-sm font-medium text-black hover:text-gray-600 transition-colors tracking-wide"
                onClick={() => setIsMenuOpen(false)}
              >
                ENTERPRISE
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-black hover:text-gray-600 transition-colors tracking-wide"
                onClick={() => setIsMenuOpen(false)}
              >
                PRICING
              </Link>
              <Link
                href="/demo"
                className="text-sm font-medium text-black hover:text-gray-600 transition-colors tracking-wide"
                onClick={() => setIsMenuOpen(false)}
              >
                REQUEST A DEMO
              </Link>
              <div className="flex flex-col gap-3 pt-4 border-t border-gray-300">
                <Link
                  href="/signin"
                  className="px-4 py-2 text-sm font-medium text-center text-black hover:text-gray-600 transition-colors tracking-wide"
                  onClick={() => setIsMenuOpen(false)}
                >
                  SIGN IN
                </Link>
                <Link
                  href="/signin"
                  className="px-8 py-3 bg-[#E8FF3C] text-black text-base font-semibold text-center hover:bg-[#d4eb35] transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Start Now
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
