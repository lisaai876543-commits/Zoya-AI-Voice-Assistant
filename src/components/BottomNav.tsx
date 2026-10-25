import React, { useState, useEffect } from 'react';
import { Home, MessageSquare, Wrench, Settings, Smartphone, Zap } from 'lucide-react';
import { NavTab, AppState } from '../types';
import { getActiveTheme, subscribeThemeChange, ZoyaTheme } from '../utils/themeManager';
import { dispatchTaskEnergy } from '../services/taskAnimationService';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isSessionActive: boolean;
  appState: AppState;
}

export default function BottomNav({
  currentTab,
  onSelectTab,
  isSessionActive,
  appState,
}: BottomNavProps) {
  const [theme, setTheme] = useState<ZoyaTheme>(() => getActiveTheme());

  useEffect(() => {
    const unsub = subscribeThemeChange((newTheme) => {
      setTheme(newTheme);
    });
    return () => unsub();
  }, []);

  const tabs = [
    { id: 'home' as NavTab, label: 'Companion', icon: Home },
    { id: 'chat' as NavTab, label: 'Chat', icon: MessageSquare },
    { id: 'studio' as NavTab, label: 'Studio', icon: Zap },
    { id: 'tools' as NavTab, label: 'Tools', icon: Wrench },
    { id: 'android' as NavTab, label: 'Android', icon: Smartphone },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  const getStatusColor = () => {
    switch (appState) {
      case 'speaking': return `shadow-[0_0_8px_${theme.glow}]`;
      case 'listening': return 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse';
      case 'processing': return 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]';
      case 'reconnecting': return 'bg-amber-400 shadow-[0_0_8px_#f59e0b]';
      default: return 'bg-white/20';
    }
  };

  const handleTabClick = (tabId: NavTab, label: string) => {
    dispatchTaskEnergy(
      `task-target-nav-${tabId}`,
      `${label} Nav`,
      `Switching to ${label}`,
      'navigation',
      1200
    );
    onSelectTab(tabId);
  };

  return (
    <nav className="relative z-50 w-full bg-[#0a0c16]/95 backdrop-blur-2xl border-t border-white/10 px-2 sm:px-4 py-2 flex items-center justify-around shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-auto select-none touch-manipulation transition-colors duration-500 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id || 
          (tab.id === 'chat' && currentTab === 'history') || 
          (tab.id === 'settings' && currentTab === 'diagnostics') ||
          (tab.id === 'studio' && currentTab === 'topics');

        return (
          <button
            key={tab.id}
            id={`task-target-nav-${tab.id}`}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTabClick(tab.id, tab.label);
            }}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-200 relative cursor-pointer active:scale-90 select-none pointer-events-auto touch-manipulation ${
              isActive 
                ? 'bg-white/[0.07] shadow-inner' 
                : 'hover:bg-white/[0.03] text-white/50 hover:text-white/80'
            }`}
            style={{
              color: isActive ? theme.primary : undefined,
              boxShadow: isActive ? `0 0 20px rgba(${theme.rgb.primary}, 0.2)` : undefined,
            }}
          >
            <div className="relative">
              <Icon 
                size={20} 
                className={`transition-transform duration-200 ${isActive ? 'stroke-[2.4] scale-110' : 'stroke-[1.8]'}`}
                style={{
                  filter: isActive ? `drop-shadow(0 0 6px rgba(${theme.rgb.glow}, 0.6))` : undefined,
                }}
              />
              
              {/* If companion is in live session and this is Home or Chat, show active status dot */}
              {(tab.id === 'home' || tab.id === 'chat') && isSessionActive && (
                <span
                  className={`absolute -top-1 -right-1.5 w-2 h-2 rounded-full ${getStatusColor()}`}
                  style={{
                    backgroundColor: appState === 'speaking' ? theme.glow : undefined,
                  }}
                />
              )}
            </div>
            
            <span
              className="text-[10px] tracking-wide mt-1 transition-colors"
              style={{
                color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)',
                fontWeight: isActive ? 600 : 400,
                textShadow: isActive ? `0 0 8px rgba(${theme.rgb.glow}, 0.6)` : undefined,
              }}
            >
              {tab.label}
            </span>

            {/* Active Pill Indicator */}
            {isActive && (
              <span
                className="absolute bottom-0 w-8 h-0.5 rounded-full transition-all duration-300"
                style={{
                  background: `linear-gradient(90deg, ${theme.primary}, ${theme.glow})`,
                  boxShadow: `0 0 10px ${theme.primary}`,
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

