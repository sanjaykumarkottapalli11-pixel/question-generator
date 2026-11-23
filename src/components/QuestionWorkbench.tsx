import React, { useState } from 'react';
import { Sparkles, Trash2, CheckCircle2, Cpu, Tag, BookOpen, HelpCircle, Copy, Check, Search, Filter } from 'lucide-react';
import { QuestionItem } from '../types';

interface QuestionWorkbenchProps {
  questions: QuestionItem[];
  onUpdateQuestion: (id: string, updated: QuestionItem) => void;
  onDeleteQuestion: (id: string) => void;
  onRegenerateQuestion: (id: string) => void;
}

export const QuestionWorkbench: React.FC<QuestionWorkbenchProps> = ({
  questions,
  onUpdateQuestion,
  onDeleteQuestion
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [diffFilter, setDiffFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  if (questions.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '3.5rem', textAlign: 'center' }}>
        <Cpu size={52} color="var(--accent-cyan)" style={{ opacity: 0.6, marginBottom: '1rem' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Questions Synthesized Yet</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '480px', margin: '0.6rem auto 1.75rem' }}>
          Upload study notes/PDF or choose an academic preset sample, then click <strong>"Generate Questions"</strong>.
        </p>
      </div>
    );
  }

  const isMultimodalSet = questions.some(q => q.isMultimodal || q.category);

  // Filtered list
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = !searchQuery.trim() || 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.category && q.category.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || q.type === typeFilter;
    const matchesDiff = diffFilter === 'all' || q.difficulty === diffFilter;

    return matchesSearch && matchesType && matchesDiff;
  });

  const handleCopySingle = (item: QuestionItem, idx: number) => {
    let text = `Q${idx + 1}. ${item.question}\n`;
    if (item.options && item.options.length > 0) {
      item.options.forEach((opt, oIdx) => {
        text += `  ${String.fromCharCode(65 + oIdx)}. ${opt.text}\n`;
      });
    }
    text += `Answer: ${item.answer}\n`;
    if (item.explanation) {
      text += `Explanation: ${item.explanation}\n`;
    }

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    let fullText = `=== SYNTHESIZED STUDY QUESTIONS (${questions.length}) ===\n\n`;
    questions.forEach((item, idx) => {
      fullText += `Q${idx + 1}. ${item.question}\n`;
      if (item.options && item.options.length > 0) {
        item.options.forEach((opt, oIdx) => {
          fullText += `  ${String.fromCharCode(65 + oIdx)}. ${opt.text}\n`;
        });
      }
      fullText += `Answer: ${item.answer}\n`;
      if (item.explanation) {
        fullText += `Explanation: ${item.explanation}\n`;
      }
      fullText += `\n----------------------------------------\n\n`;
    });

    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Header & Overview Bar */}
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <Sparkles size={20} color="var(--accent-indigo)" />
              {isMultimodalSet ? 'Multimodal Study Workbench' : 'Synthesized Benchmark Workbench'}
              <span className="badge badge-purple" style={{ fontSize: '0.72rem', padding: '0.15rem 0.6rem' }}>
                {questions.length} Generated
              </span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Review, edit, copy, or export tailored study questions with complete tutor answer explanations
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={handleCopyAll}
              className="btn-secondary btn-pill"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
              title="Copy all questions and answers to clipboard"
            >
              {copiedAll ? <Check size={14} color="#34d399" /> : <Copy size={14} color="var(--accent-cyan)" />}
              <span>{copiedAll ? 'All Copied!' : 'Copy All Questions'}</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by keyword, topic, or question text..."
              className="filter-search-input"
            />
          </div>

          {/* Type Filter Buttons */}
          <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(0,0,0,0.25)', padding: '0.2rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
            {[
              { id: 'all', label: 'All Formats' },
              { id: 'mcq', label: 'MCQs' },
              { id: 'fill_blank', label: 'Fill Blanks' },
              { id: 'open_ended', label: 'Open QA' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id)}
                style={{
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: typeFilter === f.id ? 'var(--gradient-primary)' : 'transparent',
                  color: typeFilter === f.id ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Difficulty Filter */}
          <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(0,0,0,0.25)', padding: '0.2rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
            {[
              { id: 'all', label: 'All Levels' },
              { id: 'easy', label: 'Easy' },
              { id: 'medium', label: 'Med' },
              { id: 'hard', label: 'Hard' }
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setDiffFilter(d.id)}
                style={{
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: diffFilter === d.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: diffFilter === d.id ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredQuestions.length === 0 && (
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No questions matched your filter: <strong>"{searchQuery}"</strong>
          </p>
          <button
            onClick={() => { setSearchQuery(''); setTypeFilter('all'); setDiffFilter('all'); }}
            className="btn-secondary btn-pill"
            style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}
          >
            Reset Filters
          </button>
        </div>
      )}

      {filteredQuestions.map((item, index) => {
        const typeClass = item.type === 'mcq' ? 'type-mcq' : item.type === 'fill_blank' ? 'type-fill' : item.type === 'true_false' ? 'type-tf' : 'type-open';
        const isCopied = copiedId === item.id;

        return (
        <div key={item.id} className={`question-card ${typeClass}`}>
          
          {/* Top Bar Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{
                background: 'var(--gradient-primary)',
                color: '#fff',
                padding: '0.25rem 0.75rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.85rem',
                boxShadow: '0 2px 10px rgba(6, 182, 212, 0.3)'
              }}>
                Q{index + 1}
              </span>

              {/* Multimodal Category Badge */}
              {item.category && (
                <span className="badge badge-purple" style={{
                  background: 'rgba(139, 92, 246, 0.18)',
                  borderColor: 'rgba(139, 92, 246, 0.45)',
                  color: '#c084fc',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <Tag size={11} /> {item.category}
                </span>
              )}
              
              <span className={`badge ${item.type === 'mcq' ? 'badge-purple' : item.type === 'fill_blank' ? 'badge-cyan' : item.type === 'true_false' ? 'badge-blue' : 'badge-emerald'}`}>
                {item.type === 'mcq' ? 'MCQ' : item.type === 'fill_blank' ? 'Fill-in-Blank' : item.type === 'true_false' ? 'True/False' : 'Open Question'}
              </span>

              <span className={`badge ${item.difficulty === 'easy' ? 'badge-emerald' : item.difficulty === 'medium' ? 'badge-amber' : 'badge-rose'}`}>
                {item.difficulty.toUpperCase()}
              </span>

              {item.bloomsLevel && (
                <span className="badge badge-cyan">
                  Bloom: {item.bloomsLevel}
                </span>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => handleCopySingle(item, index)}
                className="btn-secondary btn-pill"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                title="Copy Question to Clipboard"
              >
                {isCopied ? <Check size={13} color="#34d399" /> : <Copy size={13} color="var(--accent-indigo)" />}
                <span>{isCopied ? 'Copied!' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteQuestion(item.id)}
                className="btn-outline-danger btn-pill"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                title="Delete Question"
              >
                <Trash2 size={13} /> Remove
              </button>
            </div>
          </div>

          {/* Benchmark T5 Prompt Inspector (Only for benchmark mode) */}
          {!item.isMultimodal && !item.category && item.t5PromptInput && (
            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.6rem 0.9rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '0.82rem'
            }}>
              <Cpu size={15} color="var(--accent-cyan)" />
              <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>T5 Input Prompt:</span>
              <span className="mono-code" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.t5PromptInput}
              </span>
            </div>
          )}

          {/* Question Title */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Question Title:
            </label>
            <input
              type="text"
              value={item.question}
              onChange={(e) => onUpdateQuestion(item.id, { ...item, question: e.target.value })}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '1.05rem',
                fontWeight: 700,
                outline: 'none'
              }}
            />
          </div>

          {/* MCQ Options */}
          {item.options && item.options.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Multiple Choice Options:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.65rem' }}>
                {item.options.map((opt, optIdx) => (
                  <div
                    key={opt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      background: opt.isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-input)',
                      border: `1px solid ${opt.isCorrect ? 'rgba(16, 185, 129, 0.45)' : 'var(--border-color)'}`,
                      padding: '0.65rem 0.9rem',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <span style={{
                      fontWeight: 800,
                      color: opt.isCorrect ? '#34d399' : 'var(--text-muted)',
                      fontSize: '0.85rem',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: opt.isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const newOptions = [...item.options!];
                        newOptions[optIdx].text = e.target.value;
                        onUpdateQuestion(item.id, { ...item, options: newOptions });
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        width: '100%',
                        fontSize: '0.92rem',
                        fontWeight: opt.isCorrect ? 700 : 400,
                        outline: 'none'
                      }}
                    />
                    {opt.isCorrect && <CheckCircle2 size={18} color="#34d399" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Multimodal Study Answer & Tutor Explanation Card */}
          {item.isMultimodal || item.category ? (
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem 1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
                <CheckCircle2 size={17} color="#34d399" />
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Correct Answer:
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {item.answer}
                </span>
              </div>
              {item.explanation && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Tutor Explanation: </strong>
                  {item.explanation}
                </div>
              )}
            </div>
          ) : (
            /* Benchmark Target Answer & Metrics Box (for SQuAD/RACE evaluation mode only) */
            <div style={{
              background: 'rgba(6, 182, 212, 0.06)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              padding: '0.85rem 1.1rem',
              borderRadius: 'var(--radius-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Target Answer Token: </span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 800 }}>"{item.answer}"</span>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {item.bleuScore && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>BLEU Avg: </span>
                      <span style={{ color: '#34d399', fontWeight: 800 }}>{item.bleuScore.bleu_avg}%</span>
                    </div>
                  )}
                  {item.rougeScore && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>ROUGE-L: </span>
                      <span style={{ color: '#38bdf8', fontWeight: 800 }}>{item.rougeScore.rouge_l}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
        );
      })}

    </div>
  );
};
