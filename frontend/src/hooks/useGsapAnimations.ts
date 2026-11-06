import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export const useGsapAnimations = (deps: any[] = []) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      // 1. Smooth Fade-in for main container (avoid double-translating children)
      gsap.fromTo(
        el,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: 'power2.out' }
      );

      // 2. Staggered Entrance Animation for cards, stats, and list items
      const elements = el.querySelectorAll(
        '.gsap-animate-card, .gsap-animate-item, [data-gsap="card"]'
      );

      if (elements.length > 0) {
        gsap.fromTo(
          elements,
          {
            opacity: 0,
            y: 24,
            scale: 0.97,
            rotate: -0.5,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            rotate: 0,
            duration: 0.45,
            stagger: 0.06,
            ease: 'power3.out',
          }
        );
      }

      // 3. Header & Title move + fade animation
      const headers = el.querySelectorAll(
        '.gsap-animate-header, [data-gsap="header"]'
      );
      if (headers.length > 0) {
        gsap.fromTo(
          headers,
          { opacity: 0, x: -20, scale: 0.97 },
          { opacity: 1, x: 0, scale: 1, duration: 0.5, ease: 'power2.out', stagger: 0.1 }
        );
      }

      // 4. Card Hover micro-interaction (scale & lift smoothly)
      elements.forEach((card) => {
        const handleEnter = () => {
          gsap.to(card, { y: -3, scale: 1.012, duration: 0.25, ease: 'power2.out' });
        };
        const handleLeave = () => {
          gsap.to(card, { y: 0, scale: 1, duration: 0.25, ease: 'power2.out' });
        };
        card.addEventListener('mouseenter', handleEnter);
        card.addEventListener('mouseleave', handleLeave);
      });
    }, el);

    return () => ctx.revert();
  }, deps);

  return containerRef;
};
