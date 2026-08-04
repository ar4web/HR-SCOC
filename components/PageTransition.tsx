'use client';

import React from 'react';

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in motion-reduce:animate-none">
      {children}
    </div>
  );
}
