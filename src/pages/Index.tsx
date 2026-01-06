import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";
import { LanguageSelector } from "@/components/LanguageSelector";
import loadingLogo from '@/assets/dingleup-loading-logo.png';

const Index = () => {
  // Landing page now accessible on all devices (mobile, tablet, desktop)
  return (
    <main className="fixed inset-0 w-full h-[100dvh] overflow-x-hidden overflow-y-auto">
      {/* Full-screen deep purple/blue background extending behind status bar */}
      <div 
        className="fixed z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, #1a0033 0%, #2d1b69 50%, #0f0033 100%)',
          left: 'calc(-1 * env(safe-area-inset-left, 0px))',
          right: 'calc(-1 * env(safe-area-inset-right, 0px))',
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
          width: 'calc(100vw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))',
          height: 'calc(100dvh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))',
        }}
      />
      
      {/* Language selector - top right corner */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>
      
      <div className="relative z-10">
        <div data-tutorial="hero">
          <Hero />
        </div>
        <div data-tutorial="features">
          <Features />
        </div>
        <Newsletter />
        
        <Footer />
      </div>
    </main>
  );
};

export default Index;
