import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { DocumentUploader } from './components/DocumentUploader';
import { QuestionWorkbench } from './components/QuestionWorkbench';
import { EvaluationDashboard } from './components/EvaluationDashboard';
import { QuizMode } from './components/QuizMode';
import { VivaGuide } from './components/VivaGuide';
import { ExportModal } from './components/ExportModal';
import { QuestionItem, GenerationParams, DatasetSource, QuestionType, Difficulty } from './types';
import { generateLocalQuestions, SQUAD_BENCHMARK_SAMPLES, RACE_BENCHMARK_SAMPLES } from './nlp/t5Simulator';
import { generateAIQuestions, generateMultimodalQuestions } from './nlp/aiService';
import { Sparkles, Play, BarChart3, Download, Key, Cpu, Zap, Layers, Loader2, AlertCircle, SlidersHorizontal } from 'lucide-react';

export const App: React.FC = () => {
  const [dataset, setDataset] = useState<DatasetSource>('squad_1_1');
  const [themeMode, setThemeMode] = useState<'dark' | 'cyber' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<'workbench' | 'evaluation' | 'quiz'>('workbench');

  const [inputText, setInputText] = useState<string>(SQUAD_BENCHMARK_SAMPLES[0].context);
  const [questions, setQuestions] = useState<QuestionItem[]>(() => 
    generateLocalQuestions(SQUAD_BENCHMARK_SAMPLES[0].context, {
      dataset: 'squad_1_1',
      questionTypes: ['mcq', 'fill_blank', 'open_ended'],
      questionCount: 5,
      difficulty: 'medium',
      temperature: 0.7
    })
  );

  // Generation Controls
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(['mcq', 'fill_blank', 'open_ended']);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Multimodal Page Images (Rendered from PDF/Images via PDF.js)
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [isScannedDoc, setIsScannedDoc] = useState<boolean>(false);

  // API Key Settings Modal
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('aqg_api_key') || '';
  });
  const [aiProvider, setAiProvider] = useState<'local' | 'gemini' | 'openai' | 'claude'>(() => {
    const stored = localStorage.getItem('aqg_ai_provider');
    if (stored && stored !== 'local') return stored as any;
    return 'gemini'; // Default to active Gemini engine!
  });
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);

  // Modals
  const [showVivaModal, setShowVivaModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  const handleDatasetChange = (newDs: DatasetSource) => {
    setDataset(newDs);
    if (newDs === 'squad_1_1') {
      setInputText(SQUAD_BENCHMARK_SAMPLES[0].context);
      setSelectedTypes(['open_ended', 'fill_blank', 'mcq']);
    } else if (newDs === 'race') {
      setInputText(RACE_BENCHMARK_SAMPLES[0].context);
      setSelectedTypes(['mcq']);
    }
  };

  const handleLoadPreset = (text: string, subject: string) => {
    setInputText(text);
    setPageImages([]);
    setIsScannedDoc(false);
  };

  const handleToggleQuestionType = (type: QuestionType) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter(t => t !== type));
      }
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const handleGenerate = async () => {
    setGenerationError(null);

    // ── Direct Multimodal Vision Pipeline for Uploaded Page Images ─────────
    if (pageImages.length > 0) {
      const activeKey = apiKey;
      const activeProvider = aiProvider === 'local' ? 'gemini' : aiProvider;
      if (aiProvider === 'local') {
        setAiProvider('gemini');
        localStorage.setItem('aqg_ai_provider', 'gemini');
      }

      if (!activeKey) {
        alert('Please configure your Gemini API Key in AI Engine Setup.');
        setShowApiKeyModal(true);
        return;
      }

      setIsGenerating(true);
      try {
        const params: GenerationParams = {
          dataset,
          questionTypes: selectedTypes,
          questionCount,
          difficulty,
          temperature: 0.7,
          apiKey: activeKey,
          aiProvider: activeProvider,
          pageImages
        };

        const newQuestions = await generateMultimodalQuestions(pageImages, params);
        setQuestions(newQuestions);
        setActiveTab('workbench');
      } catch (err: any) {
        console.error('Multimodal Generation Error:', err);
        setGenerationError(err.message || 'Failed to generate questions from images.');
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // ── Academic Text & Benchmark SQuAD/RACE Pipeline ─────────────────────
    if (!inputText || inputText.trim().length < 20) {
      alert('Please provide context passage or study material with at least 20 characters.');
      return;
    }

    setIsGenerating(true);

    try {
      const params: GenerationParams = {
        dataset,
        questionTypes: selectedTypes,
        questionCount,
        difficulty,
        temperature: 0.7,
        apiKey,
        aiProvider
      };

      let newQuestions: QuestionItem[] = [];

      if (aiProvider !== 'local' && apiKey) {
        newQuestions = await generateAIQuestions(inputText, params);
      } else {
        newQuestions = generateLocalQuestions(inputText, params);
      }

      setQuestions(newQuestions);
      setActiveTab('workbench');
    } catch (err: any) {
      alert(`Generation Error: ${err.message || 'Failed to generate questions'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateQuestion = (id: string, updated: QuestionItem) => {
    setQuestions(questions.map(q => q.id === id ? updated : q));
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleRegenerateQuestion = (id: string) => {
    const single = generateLocalQuestions(inputText, {
      dataset,
      questionTypes: selectedTypes,
      questionCount: 1,
      difficulty,
      temperature: 0.8
    });
    if (single[0]) {
      setQuestions(questions.map(q => q.id === id ? { ...single[0], id } : q));
    }
  };

  const themeClass = themeMode === 'light' ? 'light-theme' : themeMode === 'cyber' ? 'theme-cyber' : '';

  return (
    <div className={`app-container ${themeClass}`}>
      <div className="bg-mesh" />

      {/* Header Navbar */}
      <Navbar
        dataset={dataset}
        onDatasetChange={handleDatasetChange}
        themeMode={themeMode}
        onThemeChange={setThemeMode}
        onOpenApiKeyModal={() => setShowApiKeyModal(true)}
        onOpenVivaModal={() => setShowVivaModal(true)}
        hasApiKey={Boolean(apiKey)}
        activeProvider={aiProvider}
      />

      {/* Top Workspace: Modern 2-Column Layout (60% Ingestion / 40% Settings) */}
      <div className="workspace-grid">
        
        {/* Left Column (~60%): Study Material Ingestion */}
        <div className="workspace-left">
          <DocumentUploader
            inputText={inputText}
            onTextChange={setInputText}
            onLoadPreset={handleLoadPreset}
            pageImages={pageImages}
            onPageImagesChange={setPageImages}
            isScannedOrImage={isScannedDoc}
            onIsScannedChange={setIsScannedDoc}
          />
        </div>

        {/* Right Column (~40%): Question Generation Settings */}
        <div className="workspace-right">
          <div className="slate-card">
            
            {/* Step 2 Header */}
            <div className="step-header" style={{ marginBottom: '1.25rem' }}>
              <span className="step-number">2</span>
              <div>
                <h3 className="step-title">Generation Settings</h3>
                <p className="step-subtitle">Customize formats, difficulty level & count</p>
              </div>
            </div>

            {/* Question Formats Selection (Clean 2x2 Grid) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="control-group-label" style={{ marginBottom: '0.45rem' }}>
                <Layers size={13} color="var(--accent-indigo)" />
                <span>Question Formats</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {(['mcq', 'fill_blank', 'true_false', 'open_ended'] as QuestionType[]).map((t) => {
                  const isActive = selectedTypes.includes(t);
                  const label = t === 'mcq' ? 'MCQ Options' : t === 'fill_blank' ? 'Fill in Blanks' : t === 'true_false' ? 'True / False' : 'Open-Ended QA';
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleToggleQuestionType(t)}
                      className={`format-pill ${isActive ? 'active' : ''}`}
                      style={{ width: '100%', justifyContent: 'center', padding: '0.45rem 0.5rem' }}
                      title={isActive ? 'Click to deselect format' : 'Click to include format'}
                    >
                      <span style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: isActive ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        color: '#fff',
                        flexShrink: 0
                      }}>
                        {isActive ? '✓' : ''}
                      </span>
                      <span style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Difficulty (Segmented Switcher) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="control-group-label" style={{ marginBottom: '0.45rem' }}>
                <SlidersHorizontal size={13} color="var(--accent-indigo)" />
                <span>Target Difficulty</span>
              </div>
              <div style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '0.25rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                gap: '0.25rem'
              }}>
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => {
                  const isSelected = difficulty === d;
                  const activeBg = d === 'easy' ? 'rgba(16, 185, 129, 0.25)' : d === 'medium' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(244, 63, 94, 0.25)';
                  const activeColor = d === 'easy' ? '#34d399' : d === 'medium' ? '#fbbf24' : '#f87171';
                  const activeBorder = d === 'easy' ? 'rgba(16, 185, 129, 0.5)' : d === 'medium' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(244, 63, 94, 0.5)';
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      style={{
                        flex: 1,
                        padding: '0.4rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        border: `1px solid ${isSelected ? activeBorder : 'transparent'}`,
                        cursor: 'pointer',
                        background: isSelected ? activeBg : 'transparent',
                        color: isSelected ? activeColor : 'var(--text-muted)',
                        boxShadow: isSelected ? `0 2px 10px ${activeBorder}` : 'none',
                        transition: 'all 0.2s ease',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Batch Volume / Question Count */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="control-group-label" style={{ justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={13} color="var(--accent-indigo)" />
                  <span>Batch Volume</span>
                </div>
                <span className="badge badge-cyan" style={{ fontSize: '0.75rem', padding: '0.15rem 0.6rem' }}>
                  {questionCount} Questions
                </span>
              </div>
              <div className="stepper-container" style={{ width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  type="button"
                  className="stepper-btn"
                  disabled={questionCount <= 1}
                  onClick={() => setQuestionCount(prev => Math.max(1, prev - 1))}
                  title="Decrease question count"
                >
                  -
                </button>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                  style={{ flex: 1, accentColor: 'var(--accent-indigo)', cursor: 'pointer' }}
                />
                <button
                  type="button"
                  className="stepper-btn"
                  disabled={questionCount >= 10}
                  onClick={() => setQuestionCount(prev => Math.min(10, prev + 1))}
                  title="Increase question count"
                >
                  +
                </button>
              </div>
            </div>

            {/* Synthesize / Generate Primary Action Button */}
            <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="btn-primary btn-pill"
                style={{
                  padding: '0.85rem 1.5rem',
                  fontSize: '0.92rem',
                  width: '100%',
                  justifyContent: 'center',
                  boxShadow: isGenerating ? 'none' : '0 4px 25px rgba(99, 102, 241, 0.45)'
                }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Synthesizing Questions...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>
                      {pageImages.length > 0 
                        ? `Generate from ${pageImages.length} Pgs` 
                        : `Generate Questions (${questionCount})`}
                    </span>
                  </>
                )}
              </button>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.45rem', textAlign: 'center' }}>
                {pageImages.length > 0 ? '✨ Direct Multimodal Vision Analysis' : '⚡ SQuAD & RACE Benchmark Pipeline'}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Main Navigation Tabs */}
      <div className="tab-navigation">
        <button
          onClick={() => setActiveTab('workbench')}
          className={`tab-button ${activeTab === 'workbench' ? 'active' : ''}`}
        >
          <Cpu size={18} />
          Questions Workbench ({questions.length})
        </button>

        <button
          onClick={() => setActiveTab('evaluation')}
          className={`tab-button ${activeTab === 'evaluation' ? 'active' : ''}`}
        >
          <BarChart3 size={18} />
          BLEU & ROUGE Evaluator
        </button>

        <button
          onClick={() => setActiveTab('quiz')}
          className={`tab-button ${activeTab === 'quiz' ? 'active' : ''}`}
        >
          <Play size={18} />
          Interactive Quiz Mode
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowExportModal(true)} className="btn-secondary btn-pill" style={{ fontSize: '0.85rem' }}>
            <Download size={16} color="var(--accent-cyan)" />
            Export Paper / PDF
          </button>
        </div>
      </div>

      {/* Live Generation Progress Banner */}
      {isGenerating && (
        <div className="glass-card" style={{ padding: '1.25rem 1.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(6, 182, 212, 0.12)', borderColor: 'rgba(6, 182, 212, 0.4)' }}>
          <Loader2 size={24} color="var(--accent-cyan)" className="animate-spin" />
          <div>
            <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-cyan)' }}>
              {pageImages.length > 0 ? 'Analyzing Notes & Generating Questions with Gemini Vision...' : 'Synthesizing Questions...'}
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Reading handwritten text, diagrams, and mathematical formulas semantically. This takes ~5-10 seconds.
            </p>
          </div>
        </div>
      )}

      {/* Generation Error Banner with Retry */}
      {generationError && (
        <div className="glass-card" style={{ padding: '1.25rem 1.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={22} color="#f87171" />
            <div>
              <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f87171' }}>Generation Status Notice</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{generationError}</p>
            </div>
          </div>
          <button onClick={handleGenerate} className="btn-primary btn-pill" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
            Retry Now
          </button>
        </div>
      )}

      {/* Main Active View */}
      {activeTab === 'workbench' && (
        <QuestionWorkbench
          questions={questions}
          onUpdateQuestion={handleUpdateQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          onRegenerateQuestion={handleRegenerateQuestion}
        />
      )}

      {activeTab === 'evaluation' && (
        <EvaluationDashboard questions={questions} />
      )}

      {activeTab === 'quiz' && (
        <QuizMode questions={questions} onExit={() => setActiveTab('workbench')} />
      )}

      {/* Viva Guide Modal */}
      {showVivaModal && <VivaGuide onClose={() => setShowVivaModal(false)} />}

      {/* Export Modal */}
      {showExportModal && <ExportModal questions={questions} onClose={() => setShowExportModal(false)} />}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
        }}>
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={20} color="var(--accent-cyan)" />
              Multimodal Vision AI Engine Setup
            </h3>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Select AI Engine:
              </label>
              <select
                value={aiProvider}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setAiProvider(val);
                  localStorage.setItem('aqg_ai_provider', val);
                }}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="gemini">Google Gemini 3.6 / 3.5 Flash</option>
                <option value="openai">OpenAI GPT-4o (Multimodal Vision)</option>
                <option value="claude">Anthropic Claude 3.5 Sonnet (Multimodal Vision)</option>
                <option value="local">Local T5 Simulator (Offline Academic Benchmark Only)</option>
              </select>
            </div>

            {aiProvider !== 'local' ? (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {aiProvider === 'gemini' ? 'Google Gemini' : aiProvider === 'openai' ? 'OpenAI' : 'Anthropic Claude'} API Key:
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    localStorage.setItem('aqg_api_key', e.target.value);
                  }}
                  placeholder={`Paste your ${aiProvider.toUpperCase()} API Key...`}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
                />
                <div style={{ marginTop: '0.6rem', padding: '0.75rem', background: 'rgba(6, 182, 212, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(6, 182, 212, 0.2)', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--accent-cyan)' }}>Multimodal Vision Advantage:</strong> Directly understands handwriting, mathematical formulas, and diagrams from page renders without fragile OCR errors or broken exact-match sentence chunking.
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(234, 179, 8, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Offline Local T5 mode uses extractive text heuristic modeling for SQuAD 1.1 / RACE benchmark evaluation. For scanned PDFs or handwritten notes, please switch to a Multimodal Vision provider above.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  localStorage.setItem('aqg_api_key', apiKey);
                  localStorage.setItem('aqg_ai_provider', aiProvider);
                  setShowApiKeyModal(false);
                }}
                className="btn-primary btn-pill"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
