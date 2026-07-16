import React from 'react';
import { cn } from '@/src/shared/lib/utils.js';
import { useSettings } from './SettingsProvider';

interface LogoProps {
  variant?: 'primary' | 'white' | 'charcoal' | 'orange' | 'olive';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export default function Logo({ variant = 'primary', className, size = 'md', showText = false }: LogoProps) {
  const { settings } = useSettings();

  const sizeClasses = {
    sm: 'h-10 w-auto',
    md: 'h-20 w-auto',
    lg: 'h-28 w-auto',
    xl: 'h-40 w-auto',
  };

  // Determine which image file to use based on the variant
  // Fall back to public directory files if no custom logo is uploaded
  let src = settings?.logo_primary || '/logo-primary.png'; 

  if (variant === 'white' || variant === 'charcoal' || variant === 'olive') {
    src = settings?.logo_white || settings?.logo_primary || '/logo-white.png';
  }

  const textClasses = {
    sm: 'text-base font-bold',
    md: 'text-2xl font-bold tracking-tight',
    lg: 'text-3xl font-bold tracking-tight',
    xl: 'text-5xl font-extrabold tracking-tight',
  };

  const textColor = (variant === 'white' || variant === 'charcoal' || variant === 'olive') 
    ? 'text-white' 
    : 'text-brand-charcoal';

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img 
        src={src} 
        alt="Brand Logo" 
        className={cn("object-contain", sizeClasses[size])}
      />
      {showText && (
        <span className={cn("whitespace-nowrap", textColor, textClasses[size])}>
          SLI ERP
        </span>
      )}
    </div>
  );
}
