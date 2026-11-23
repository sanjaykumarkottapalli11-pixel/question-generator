import React from 'react';
import { Sparkles, Key, HelpCircle, BookOpenCheck, Zap } from 'lucide-react';
import { DatasetSource } from '../types';

interface NavbarProps {
  dataset: DatasetSource;
  onDatasetChange: (ds: DatasetSource) => void;
  themeMode: 'dark' | 'cyber' | 'light';
  onThemeChange: (theme: 'dark' | 'cyber' | 'light') => void;
  onOpenApiKeyModal: () => void;
  onOpenVivaModal: () => void;
  hasApiKey?: boolean;
  activeProvider?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  dataset,
  onDatasetChange,
  themeMode,
  onThemeChange,
  onOpenApiKeyModal,
  onOpenVivaModal,
  hasApiKey,
  activeProvider
}) => {
  return (
    <header className="glass-card" style={{ padding: '0.9rem 1.6rem', marginBottom: '1.75rem', marginTop: '0.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
        
        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 18px rgba(99, 102, 241, 0.45)',
            flexShrink: 0
          }}>
            <BookOpenCheck size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                StudyGen <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span>
              </h1>
              <span className="badge badge-purple" style={{ fontSize: '0.68rem', padding: '0.15rem 0.55rem' }}>
                <Zap size={10} /> Multimodal Vision + NLP
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Generate exam & study questions from handwritten notes, PDFs & academic texts
            </p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {/* Dataset Switcher Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.25)',
            padding: '0.2rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => onDatasetChange('squad_1_1')}
              style={{
                border: 'none',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                padding: '0.35rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: dataset === 'squad_1_1' ? 'var(--gradient-primary)' : 'transparent',
                color: dataset === 'squad_1_1' ? '#fff' : 'var(--text-secondary)',
                boxShadow: dataset === 'squad_1_1' ? '0 2px 10px rgba(99, 102, 241, 0.35)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              SQuAD 1.1
            </button>
            <button
              onClick={() => onDatasetChange('race')}
              style={{
                border: 'none',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                padding: '0.35rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: dataset === 'race' ? 'var(--gradient-purple)' : 'transparent',
                color: dataset === 'race' ? '#fff' : 'var(--text-secondary)',
                boxShadow: dataset === 'race' ? '0 2px 10px rgba(168, 85, 247, 0.35)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              RACE MCQ
            </button>
          </div>

          {/* AI Connection Status & Key Modal Button */}
          <button
            onClick={onOpenApiKeyModal}
            className="btn-secondary btn-pill"
            style={{
              borderColor: hasApiKey ? 'rgba(16, 185, 129, 0.45)' : undefined,
              background: hasApiKey ? 'rgba(16, 185, 129, 0.08)' : undefined,
              fontSize: '0.8rem',
              padding: '0.45rem 0.95rem'
            }}
            title="Configure Multimodal AI Engine & API Key"
          >
            {hasApiKey ? (
              <>
                <span className="status-dot-pulse" />
                <span style={{ color: '#34d399', fontWeight: 700 }}>
                  {(activeProvider || 'Gemini').toUpperCase()} Connected
                </span>
              </>
            ) : (
              <>
                <Key size={14} color="var(--accent-cyan)" />
                <span>Configure API Key</span>
              </>
            )}
          </button>

          {/* Viva Defense Guide Button */}
          <button
            onClick={onOpenVivaModal}
            className="btn-secondary btn-pill"
            style={{
              borderColor: 'rgba(99, 102, 241, 0.35)',
              background: 'rgba(99, 102, 241, 0.08)',
              fontSize: '0.8rem',
              padding: '0.45rem 0.95rem'
            }}
            title="Open Viva Prep & Project Defense Guide"
          >
            <HelpCircle size={14} color="var(--accent-indigo)" />
            <span style={{ color: '#a5b4fc', fontWeight: 700 }}>Viva Prep</span>
          </button>

          {/* Theme Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.25)',
            padding: '0.2rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-color)',
            gap: '0.2rem'
          }}>
            <button
              onClick={() => onThemeChange('dark')}
              title="Midnight Obsidian Theme"
              style={{
                border: 'none',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                cursor: 'pointer',
                background: themeMode === 'dark' ? 'rgba(99, 102, 241, 0.4)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#818cf8' }} />
            </button>
            <button
              onClick={() => onThemeChange('cyber')}
              title="Cyber Emerald Theme"
              style={{
                border: 'none',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                cursor: 'pointer',
                background: themeMode === 'cyber' ? 'rgba(16, 185, 129, 0.4)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#34d399' }} />
            </button>
            <button
              onClick={() => onThemeChange('light')}
              title="Light Executive Theme"
              style={{
                border: 'none',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                cursor: 'pointer',
                background: themeMode === 'light' ? '#ffffff' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#64748b' }} />
            </button>
          </div>

        </div>

      </div>
    </header>
  );
};
