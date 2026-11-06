import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { gsap } from 'gsap';

export const MainLayout: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Reset scroll position to top on page navigation
    el.scrollTop = 0;

    // 1. GSAP Route Transition: smooth fade and subtle lift on content inner wrapper
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 12, scale: 0.995 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          duration: 0.35, 
          ease: 'power2.out'
        }
      );
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 overflow-hidden">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main
          ref={scrollRef}
          className="flex-1 campusflow-scroll-area p-6 md:p-8 bg-slate-950/90 relative"
        >
          <div className="max-w-7xl mx-auto min-h-full">
            <div ref={contentRef}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
