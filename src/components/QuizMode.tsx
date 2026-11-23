import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Trophy, RefreshCw, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuestionItem } from '../types';

interface QuizModeProps {
  questions: QuestionItem[];
  onExit: () => void;
}

export const QuizMode: React.FC<QuizModeProps> = ({ questions, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [secondsSpent, setSecondsSpent] = useState(0);

  const currentQ = questions[currentIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSpent(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectOption = (optionText: string) => {
    setSelectedOption(optionText);
    setUserAnswers(prev => ({ ...prev, [currentQ.id]: optionText }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(userAnswers[questions[currentIndex + 1]?.id] || null);
    } else {
      setShowResult(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  if (showResult) {
    let score = 0;
    questions.forEach(q => {
      const userAns = userAnswers[q.id];
      if (q.options) {
        const correctOpt = q.options.find(o => o.isCorrect)?.text;
        if (userAns === correctOpt) score++;
      } else {
        if (userAns && userAns.toLowerCase().includes(q.answer.toLowerCase())) score++;
      }
    });

    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: '650px', margin: '2rem auto' }}>
        <Trophy size={56} color="#f59e0b" style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Quiz Completed!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Completed in {Math.floor(secondsSpent / 60)}m {secondsSpent % 60}s
        </p>

        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border-glow)' }}>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: percentage >= 70 ? '#34d399' : '#f87171' }}>
            {score} / {questions.length}
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{percentage}% Score</div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button onClick={() => { setShowResult(false); setCurrentIndex(0); setUserAnswers({}); setSecondsSpent(0); }} className="btn-secondary">
            <RefreshCw size={16} /> Retake Quiz
          </button>
          <button onClick={onExit} className="btn-primary">
            Return to Generator Workbench
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '2rem', maxWidth: '750px', margin: '1rem auto' }}>
      
      {/* Quiz Progress & Timer Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <span className="badge badge-indigo" style={{ fontSize: '0.85rem' }}>
          Question {currentIndex + 1} of {questions.length}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <Clock size={16} />
          {Math.floor(secondsSpent / 60)}:{String(secondsSpent % 60).padStart(2, '0')}
        </div>
      </div>

      {/* Context Badge */}
      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
        <strong>Passage Context: </strong>"{currentQ.context}"
      </div>

      {/* Question Text */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        {currentQ.question}
      </h3>

      {/* MCQ Options */}
      {currentQ.options && currentQ.options.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {currentQ.options.map((opt, idx) => {
            const isSelected = selectedOption === opt.text;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelectOption(opt.text)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${isSelected ? 'var(--accent-indigo)' : 'var(--border-color)'}`,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.95rem',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: isSelected ? 'var(--accent-indigo)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                  {String.fromCharCode(65 + idx)}
                </span>
                {opt.text}
              </button>
            );
          })}
        </div>
      ) : (
        /* Fill in / Open Ended Text Input */
        <div style={{ marginBottom: '1.5rem' }}>
          <input
            type="text"
            value={selectedOption || ''}
            onChange={(e) => handleSelectOption(e.target.value)}
            placeholder="Type your answer here..."
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
        </div>
      )}

      {/* Footer Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <button onClick={onExit} className="btn-secondary">
          Exit Test
        </button>
        <button onClick={handleNext} className="btn-primary">
          {currentIndex === questions.length - 1 ? 'Finish & Submit' : 'Next Question'}
          <ArrowRight size={16} />
        </button>
      </div>

    </div>
  );
};
