import React from 'react';
import { Smartphone, Tablet, Monitor } from 'lucide-react';
import type { ViewToggleProps, ViewMode } from '../types';

export function ViewToggle({ viewMode, setViewMode }: ViewToggleProps) {
  const views: { mode: ViewMode; Icon: React.ElementType; label: string }[] = [
    { mode: 'desktop', Icon: Monitor, label: 'Desktop' },
    { mode: 'tablet', Icon: Tablet, label: 'Tablet' },
    { mode: 'phone', Icon: Smartphone, label: 'Phone' },
  ];

  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-md p-2 flex gap-2">
      {views.map(({ mode, Icon, label }) => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          className={`p-2 rounded-md flex items-center gap-2 transition-colors
            ${viewMode === mode 
              ? 'bg-blue-500 text-white' 
              : 'hover:bg-gray-100'
            }`}
          title={label}
        >
          <Icon size={20} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}