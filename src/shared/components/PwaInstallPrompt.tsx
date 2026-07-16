import React, { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    // Detect Mobile/Tablet
    const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(checkMobile);

    // Detect iOS
    const checkIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIos(checkIos);

    // Listen for Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Prevent the mini-infobar from appearing on mobile
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Only show if it's mobile
      if (checkMobile) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, there is no event. We just show it after a small delay if on mobile
    if (checkIos && checkMobile) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      // Just close it, they have to use the share menu (instructions shown in UI)
      setShowPrompt(false);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
  };

  if (isInstalled || !showPrompt || !isMobile) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex flex-col gap-3 animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#F37021]/10 p-2 rounded-lg">
            <Download className="w-6 h-6 text-[#F37021]" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Install App</h3>
            <p className="text-xs text-gray-500">For a faster, better experience.</p>
          </div>
        </div>
        <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50">
          <X className="w-5 h-5" />
        </button>
      </div>

      {isIos ? (
        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col gap-2">
          <p className="font-semibold text-gray-800">To install on iOS:</p>
          <div className="flex items-center gap-2">
            <span>1. Tap the Share button</span>
            <Share className="w-4 h-4 text-blue-500 inline" />
          </div>
          <p>2. Scroll down and tap <strong>Add to Home Screen</strong></p>
        </div>
      ) : (
        <button
          onClick={handleInstallClick}
          className="w-full bg-[#F37021] hover:bg-[#d9611b] text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
        >
          Install Now
        </button>
      )}
    </div>
  );
}
