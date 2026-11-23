import React, { useState } from 'react';
import { Upload, FileText, BookOpen, Loader2, Eye, Image as ImageIcon, CheckCircle2, RefreshCw, X, Sparkles } from 'lucide-react';
import { parseDocument, createSampleStudyNotesImage } from '../utils/documentParser';

interface DocumentUploaderProps {
  inputText: string;
  onTextChange: (text: string) => void;
  onLoadPreset: (context: string, subject: string) => void;
  pageImages: string[];
  onPageImagesChange: (images: string[]) => void;
  isScannedOrImage: boolean;
  onIsScannedChange: (val: boolean) => void;
}

const PRESET_SAMPLES = [
  {
    title: 'History: Indian Independence',
    subject: 'History',
    text: 'India gained independence from British rule on August 15, 1947, following the nationwide independence movement led by Mahatma Gandhi and the Indian National Congress. The landmark Indian Independence Act 1947 was passed by the Parliament of the United Kingdom.'
  },
  {
    title: 'Biology: Photosynthesis Cycle',
    subject: 'Biology',
    text: 'Photosynthesis is a vital biological process used by green plants and certain organisms to convert light energy into chemical energy. This chemical energy is stored in carbohydrate molecules such as glucose, synthesized from carbon dioxide and water.'
  },
  {
    title: 'Computer Science: Alan Turing',
    subject: 'Computer Science',
    text: 'The Turing machine was conceptualized by English mathematician Alan Turing in 1936 to provide a formal mathematical model of a computing device. It manipulates symbols on a strip of tape according to a table of rules.'
  },
  {
    title: 'AI: Intelligent Agents (RACE)',
    subject: 'AI & CS',
    text: 'Artificial Intelligence (AI) is intelligence demonstrated by machines, as opposed to intelligence displayed by humans. Leading AI textbooks define the field as the study of intelligent agents, which perceive their environment and take actions to maximize chance of success.'
  }
];

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  inputText,
  onTextChange,
  onLoadPreset,
  pageImages,
  onPageImagesChange,
  isScannedOrImage,
  onIsScannedChange
}) => {
  const [ingestionMode, setIngestionMode] = useState<'upload' | 'text'>(
    pageImages.length > 0 ? 'upload' : 'upload'
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseStatus, setParseStatus] = useState<string>('Processing Document...');
  const [parseError, setParseError] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const processFile = async (file: File) => {
    setFileName(file.name);
    setParseError(null);
    setIsParsing(true);
    setParseStatus('Rendering Pages for Multimodal AI...');
    setIngestionMode('upload');

    try {
      const result = await parseDocument(file, (status) => setParseStatus(status));
      onTextChange(result.text);
      onPageImagesChange(result.pageImages);
      onIsScannedChange(result.isScannedOrImage);
    } catch (err: any) {
      setParseError(err.message || 'Could not process the uploaded file.');
      setFileName(null);
      onTextChange('');
      onPageImagesChange([]);
      onIsScannedChange(false);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleLoadSampleNotes = () => {
    const sampleImg = createSampleStudyNotesImage();
    setFileName('sample_handwritten_notes.jpg');
    onTextChange('[Sample Handwritten Study Notes: Correlation & Linear Regression Analysis]');
    onPageImagesChange([sampleImg]);
    onIsScannedChange(true);
    setIngestionMode('upload');
    setParseError(null);
  };

  const handleClearUpload = () => {
    setFileName(null);
    onPageImagesChange([]);
    onIsScannedChange(false);
    onTextChange('');
  };

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const charCount = inputText.length;

  return (
    <div className="slate-card">
      
      {/* Header with Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="step-header" style={{ marginBottom: 0 }}>
          <span className="step-number">1</span>
          <div>
            <h2 className="step-title">Study Material Ingestion</h2>
            <p className="step-subtitle">Upload notes/PDF or choose academic benchmark text</p>
          </div>
        </div>

        {/* Ingestion Mode Toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '0.2rem',
          borderRadius: 'var(--radius-full)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          gap: '0.2rem'
        }}>
          <button
            onClick={() => setIngestionMode('upload')}
            style={{
              border: 'none',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              padding: '0.35rem 0.85rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: ingestionMode === 'upload' ? 'var(--gradient-primary)' : 'transparent',
              color: ingestionMode === 'upload' ? '#fff' : 'var(--text-secondary)',
              boxShadow: ingestionMode === 'upload' ? '0 2px 10px rgba(99, 102, 241, 0.35)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <ImageIcon size={13} />
            <span>Upload Notes / PDF</span>
            {pageImages.length > 0 && (
              <span style={{ background: '#ffffff', color: '#1e1b4b', borderRadius: '50%', width: '16px', height: '16px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                {pageImages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setIngestionMode('text')}
            style={{
              border: 'none',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              padding: '0.35rem 0.85rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: ingestionMode === 'text' ? 'var(--gradient-primary)' : 'transparent',
              color: ingestionMode === 'text' ? '#fff' : 'var(--text-secondary)',
              boxShadow: ingestionMode === 'text' ? '0 2px 10px rgba(99, 102, 241, 0.35)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <BookOpen size={13} />
            <span>Text & Presets</span>
          </button>
        </div>
      </div>

      {/* MODE 1: MULTIMODAL VISION UPLOAD */}
      {ingestionMode === 'upload' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {pageImages.length === 0 ? (
            /* Empty Upload Dropzone */
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `1.5px dashed ${isDragOver ? 'var(--accent-indigo)' : 'rgba(255, 255, 255, 0.14)'}`,
                background: isDragOver ? 'rgba(99, 102, 241, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem 1.25rem',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '230px',
                flex: 1
              }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}>
                {isParsing ? (
                  <Loader2 size={26} color="var(--accent-indigo)" className="animate-spin" />
                ) : (
                  <Upload size={26} color="var(--accent-indigo)" />
                )}
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                {isParsing ? parseStatus : 'Drag & Drop your Study Notes or PDF Document here'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto 1.25rem' }}>
                Understands handwritten notes, formulas, and diagrams using Gemini Vision without fragile OCR text extraction.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <label className="btn-primary btn-pill" style={{ cursor: isParsing ? 'not-allowed' : 'pointer', fontSize: '0.85rem', padding: '0.65rem 1.4rem' }}>
                  <Upload size={16} />
                  <span>Choose File to Upload</span>
                  <input
                    type="file"
                    disabled={isParsing}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt,.md"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleLoadSampleNotes}
                  className="btn-secondary btn-pill"
                  style={{ fontSize: '0.82rem' }}
                  title="Test Gemini Vision immediately with sample handwritten notes"
                >
                  <Sparkles size={14} color="var(--accent-cyan)" />
                  <span>Try Sample Notes (1-Click)</span>
                </button>
              </div>

              <div style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Supported Formats: PDF, PNG, JPG, JPEG, WEBP • Max 8 rendered pages
              </div>
            </div>
          ) : (
            /* Uploaded File Summary & Page Gallery */
            <div>
              {/* File Info Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.85rem 1.25rem',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircle2 size={20} color="#34d399" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {fileName || 'Document Loaded'}
                      </strong>
                      <span className="badge badge-emerald" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                        {pageImages.length} Pages Ready
                      </span>
                      <span className="badge badge-purple" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                        Multimodal Vision Active
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Ready to synthesize conceptual, formula, and classification questions directly from images.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <label className="btn-secondary btn-pill" style={{ cursor: 'pointer', fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}>
                    <RefreshCw size={13} />
                    <span>Upload New File</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt,.md"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button onClick={handleClearUpload} className="btn-outline-danger btn-pill" style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}>
                    <X size={13} />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Page Thumbnails Gallery */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Rendered Page Images ({pageImages.length}):
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Click any page to inspect full view
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '0.75rem'
                }}>
                  {pageImages.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActivePreview(imgUrl)}
                      style={{
                        position: 'relative',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)',
                        background: '#000',
                        cursor: 'pointer',
                        aspectRatio: '3/4',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.borderColor = 'var(--accent-indigo)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt={`Page ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                        padding: '0.5rem 0.5rem 0.3rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>
                          Page {idx + 1}
                        </span>
                        <Eye size={13} color="#fff" style={{ opacity: 0.8 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: TEXT & BENCHMARK PRESETS */}
      {ingestionMode === 'text' && (
        <div>
          {/* Preset Chips Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Academic Benchmark Presets:
            </span>
            <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
              {PRESET_SAMPLES.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setFileName(null);
                    onPageImagesChange([]);
                    onIsScannedChange(false);
                    onLoadPreset(preset.text, preset.subject);
                  }}
                  className="btn-secondary btn-pill"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                >
                  <BookOpen size={12} color="var(--accent-indigo)" />
                  <span>{preset.title.split(':')[1] || preset.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div style={{ position: 'relative' }}>
            <textarea
              value={inputText}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Paste study material text, textbook excerpts, or lecture transcripts here..."
              rows={6}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.025)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.85rem 1rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.9rem',
                lineHeight: '1.6',
                resize: 'vertical',
                outline: 'none',
                minHeight: '170px',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-indigo)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'; }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '0.4rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}>
              {wordCount} words • {charCount} characters
            </div>
          </div>
        </div>
      )}

      {/* Parse Error Notification */}
      {parseError && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          color: '#f87171',
          fontSize: '0.82rem'
        }}>
          <X size={16} />
          <span>{parseError}</span>
        </div>
      )}

      {/* Full-Screen Page Inspection Modal */}
      {activePreview && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)',
          zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '850px', marginBottom: '0.75rem' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
              Full Page Visual Inspection (Multimodal Vision Input)
            </span>
            <button onClick={() => setActivePreview(null)} className="btn-secondary btn-pill" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
              <X size={14} /> Close Preview
            </button>
          </div>
          <div style={{ maxWidth: '850px', maxHeight: '82vh', overflow: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.15)', background: '#fff' }}>
            <img src={activePreview} alt="Full Page Preview" style={{ width: '100%', display: 'block' }} />
          </div>
        </div>
      )}

    </div>
  );
};
