import React from 'react';
import { BookOpen, CheckCircle, HelpCircle, Sparkles, Layers, Cpu, Award, FileText } from 'lucide-react';

interface VivaGuideProps {
  onClose: () => void;
}

export const VivaGuide: React.FC<VivaGuideProps> = ({ onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div className="glass-card" style={{
        maxWidth: '850px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        border: '1px solid var(--border-glow)'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Award size={28} color="var(--accent-indigo)" />
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Project Viva Defense & Q&A Guide</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                T5 Automatic Question Generator • SQuAD 1.1 & RACE Benchmark
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '0.4rem 0.8rem' }}>
            Close
          </button>
        </div>

        {/* Section 1: SQuAD vs Previous Hardcoded Method */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Cpu size={18} /> 1. Why SQuAD 1.1 instead of Arbitrary Text Extraction?
          </h3>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <p>
              In our previous method, we passed arbitrary text to T5 and extracted answers without reference questions. 
              <strong> The problem was that we had no ground-truth reference questions to evaluate quality.</strong>
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              With <strong>SQuAD 1.1</strong>, each sample contains:
              <br />• <code>Context</code> (Passage) + <code>Answer</code> (Target phrase) + <code>Reference Question</code> (Human written).
            </p>
            <p style={{ marginTop: '0.5rem', color: '#34d399', fontWeight: 600 }}>
              ✓ SQuAD 1.1 allows objective quantitative evaluation using BLEU and ROUGE scores!
            </p>
          </div>
        </div>

        {/* Section 2: SQuAD 1.1 vs RACE */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#22d3ee', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Layers size={18} /> 2. SQuAD 1.1 vs. RACE Dataset Comparison
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <h4 style={{ fontWeight: 700, color: '#818cf8', marginBottom: '0.4rem' }}>SQuAD 1.1 Dataset</h4>
              <p>• <strong>Best for:</strong> Open-ended / Normal QA questions.</p>
              <p>• <strong>Format:</strong> Context + Answer $\rightarrow$ Question.</p>
              <p>• <strong>Size:</strong> 87,599 training + 10,570 validation pairs.</p>
            </div>

            <div style={{ background: 'rgba(139, 92, 246, 0.08)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <h4 style={{ fontWeight: 700, color: '#c084fc', marginBottom: '0.4rem' }}>RACE Dataset</h4>
              <p>• <strong>Best for:</strong> Multiple Choice Questions (MCQs).</p>
              <p>• <strong>Format:</strong> Passage $\rightarrow$ Question + 4 Options (A, B, C, D).</p>
              <p>• <strong>Full Form:</strong> ReAding Comprehension from Examinations.</p>
            </div>
          </div>
        </div>

        {/* Section 3: Evaluation Metrics (BLEU & ROUGE) */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Sparkles size={18} /> 3. Quantitative Evaluation Metrics
          </h3>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', lineHeight: '1.6' }}>
            <p>• <strong>BLEU (Bilingual Evaluation Understudy):</strong> Measures N-gram precision (1-gram to 4-gram) with a brevity penalty to prevent short truncated outputs.</p>
            <p style={{ marginTop: '0.3rem' }}>• <strong>ROUGE (Recall-Oriented Understudy for Gisting Evaluation):</strong> Measures recall and overlap. ROUGE-1 evaluates unigrams, ROUGE-2 evaluates bigrams, and ROUGE-L measures Longest Common Subsequence (LCS).</p>
          </div>
        </div>

        {/* Section 4: Real-World Ingestion */}
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FileText size={18} /> 4. Real-World Application Pipeline
          </h3>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
            <code style={{ color: '#a5b4fc' }}>
              Study Material (PDF/DOCX/PPTX) $\rightarrow$ Text Extraction $\rightarrow$ Candidate Answer Extractor (NER/POS) $\rightarrow$ T5 Question Generator $\rightarrow$ Distractor Generator $\rightarrow$ Interactive Test & PDF Export
            </code>
          </div>
        </div>

        <div style={{ textAlign: 'right', marginTop: '1.5rem' }}>
          <button onClick={onClose} className="btn-primary">
            Got it, return to App
          </button>
        </div>

      </div>
    </div>
  );
};
