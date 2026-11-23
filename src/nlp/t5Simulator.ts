import { QuestionItem, GenerationParams, DatasetSample, QuestionType } from '../types';
import { calculateBleu, calculateRouge } from './metricsCalculator';

export const SQUAD_BENCHMARK_SAMPLES: DatasetSample[] = [
  {
    id: 'squad_1',
    subject: 'History',
    context: 'India gained independence from British rule on August 15, 1947, following the independence movement led by Mahatma Gandhi and the Indian National Congress.',
    answer: 'August 15, 1947',
    referenceQuestion: 'When did India gain independence from British rule?'
  },
  {
    id: 'squad_2',
    subject: 'Biology',
    context: 'Photosynthesis is a biological process used by plants to convert light energy into chemical energy, which is stored in carbohydrate molecules such as glucose.',
    answer: 'light energy into chemical energy',
    referenceQuestion: 'What energy transformation takes place during photosynthesis?'
  },
  {
    id: 'squad_3',
    subject: 'Computer Science',
    context: 'The Turing Machine was conceptualized by Alan Turing in 1936 to provide a formal mathematical model of algorithmic computation.',
    answer: 'Alan Turing',
    referenceQuestion: 'Who conceptualized the Turing Machine in 1936?'
  },
  {
    id: 'squad_4',
    subject: 'Physics',
    context: 'Quantum entanglement is a phenomenon where two or more particles become interconnected such that one particle state instantly influences the other regardless of distance.',
    answer: 'Quantum entanglement',
    referenceQuestion: 'What quantum phenomenon causes instantaneous particle correlation across distances?'
  },
  {
    id: 'squad_5',
    subject: 'Literature',
    context: 'William Shakespeare wrote the tragedy Hamlet between 1599 and 1601, set in the Kingdom of Denmark.',
    answer: 'Kingdom of Denmark',
    referenceQuestion: 'Where is Shakespeare\'s tragedy Hamlet set?'
  }
];

export const RACE_BENCHMARK_SAMPLES: DatasetSample[] = [
  {
    id: 'race_1',
    subject: 'Computer Science',
    context: 'Artificial Intelligence (AI) is intelligence demonstrated by machines, as opposed to intelligence displayed by humans. Leading AI textbooks define the field as the study of intelligent agents.',
    answer: 'Intelligent agents',
    referenceQuestion: 'According to AI textbooks, the field of AI is defined as the study of what?',
    options: [
      'Intelligent agents',
      'Human emotions',
      'Hardware circuits',
      'Relational databases'
    ]
  },
  {
    id: 'race_2',
    subject: 'Environmental Science',
    context: 'Renewable energy is energy derived from natural resources that replenish themselves faster than they are consumed. Solar energy, wind energy, and hydroelectric power are primary examples.',
    answer: 'Solar, wind, and hydroelectric power',
    referenceQuestion: 'Which of the following are primary examples of renewable energy resources?',
    options: [
      'Solar, wind, and hydroelectric power',
      'Coal, petroleum, and natural gas',
      'Nuclear fission and uranium-235',
      'Diesel fuels and heavy crude oil'
    ]
  }
];

const CANDIDATE_BLACKLIST = new Set([
  'the', 'this', 'that', 'these', 'those', 'from', 'when', 'what', 'where', 'with',
  'passage', 'extracted', 'unit', 'chapter', 'page', 'section', 'root', 'info', 'size',
  'xref', 'trailer', 'obj', 'endobj', 'stream', 'document', 'study', 'material',
  'covers', 'topic', 'author', 'title', 'figure', 'table', 'essential', 'analytical',
  'primary', 'secondary', 'context', 'sample', 'using', 'also', 'into', 'over',
  'such', 'been', 'more', 'than', 'will', 'have', 'each', 'they', 'their', 'which',
  'about', 'then', 'some', 'were', 'does', 'only', 'both', 'between', 'given',
  'according', 'first', 'second', 'third', 'equals', 'denoted', 'given by'
]);

/**
 * Validation guard — rejects any candidate that starts with
 * a standalone digit followed by a word fragment (e.g. "3 Li", "61 Measures", "9 QM").
 * Discards pure numbers, single characters, and blacklisted keywords.
 */
export function isValidCandidate(c: string): boolean {
  if (!c) return false;
  const trimmed = c.trim();
  if (trimmed.length <= 2) return false;
  // Reject if starts with digit(s) followed by a space and word fragment (OCR artifact)
  if (/^\d+\s+\w/.test(trimmed)) return false;
  // Reject pure numbers
  if (/^\d+$/.test(trimmed)) return false;
  // Reject blacklisted terms
  if (CANDIDATE_BLACKLIST.has(trimmed.toLowerCase())) return false;
  // Reject starting with prepositions or conjunctions
  if (/^(of|on|in|to|for|with|by|at|from|as|and|or|the|a|an)\b/i.test(trimmed)) return false;
  // Reject trailing prepositions, conjunctions, or verbs
  if (/\b(equals|is|are|were|was|can|will|has|have|had|and|or|for|of|in|to|the|on|with|by|at|from|as)\b$/i.test(trimmed)) return false;
  return true;
}

/**
 * Common technical and mathematical domain concepts to prioritize if present in sentence
 */
const DOMAIN_TERMS_PATTERNS = [
  /\b(Karl Pearson(?:'s)? correlation coefficient)\b/i,
  /\b(Spearman(?:'s)? rank correlation(?: coefficient)?)\b/i,
  /\b(principle of least squares|method of least squares)\b/i,
  /\b(system of normal equations|normal equations?|first normal equation|second normal equation|third normal equation)\b/i,
  /\b(line of regression of Y on X|line of regression of X on Y|lines? of regression)\b/i,
  /\b(regression equations?)\b/i,
  /\b(regression lines?)\b/i,
  /\b(regression coefficient)\b/i,
  /\b(coefficient of determination)\b/i,
  /\b(coefficient of correlation|correlation coefficient)\b/i,
  /\b(scatter diagram)\b/i,
  /\b(curve fitting)\b/i,
  /\b(linear regression)\b/i,
  /\b(non-linear regression)\b/i,
  /\b(sum of squares of residual errors|residual errors)\b/i,
  /\b(perfect positive linear relationship|perfect negative linear relationship|linear relationship)\b/i,
  /\b(positive correlation|negative correlation|zero correlation)\b/i,
  /\b(dependent variable|independent variable)\b/i,
  /\b(geometric mean)\b/i,
  /\b(covariance)\b/i,
  /\b(standard error of estimate)\b/i,
  /\b(parabolic curve fitting|second degree parabola|fitting of a parabola)\b/i,
  /\b(fitting a straight line|straight line)\b/i
];

/** Document Section interface for structure-aware question generation */
export interface DocumentSection {
  title: string;
  sentences: string[];
}

function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length > 80 || trimmed.length < 3) return false;
  return /^(Part\s*[-:]?\s*[A-Z0-9]+|Unit\s*[-:]?\s*[A-Z0-9]+|Chapter\s*[-:]?\s*[A-Z0-9]+|Section\s*[-:]?\s*[A-Z0-9]+|[0-9]+\.\s+[A-Z]|Introduction|Overview|Conclusion)/i.test(trimmed);
}

/**
 * Segments document into logical sections (e.g., "Part A: Correlation", "Part B: Regression", "Part C: Curve Fitting")
 * or creates 3-4 proportional logical sections so questions span the entire source material.
 */
export function segmentDocumentSections(text: string): DocumentSection[] {
  const lines = text.split(/\r?\n+/);
  const detectedSections: DocumentSection[] = [];
  let currentTitle = '';
  let currentSentences: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (isHeadingLine(line)) {
      if (currentSentences.length > 0) {
        detectedSections.push({
          title: currentTitle || 'Introduction & Fundamentals',
          sentences: currentSentences
        });
        currentSentences = [];
      }
      currentTitle = line.replace(/^[#*\s-]+/, '').trim();
    } else {
      // Split line into meaningful sentences
      const lineSentences = line
        .split(/(?<=[.!?])\s+/)
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(s => s.length > 20);

      currentSentences.push(...lineSentences);
    }
  }

  if (currentSentences.length > 0) {
    detectedSections.push({
      title: currentTitle || 'Core Material',
      sentences: currentSentences
    });
  }

  // If explicit sections with sentences were found (at least 2), return them
  const validSections = detectedSections.filter(s => s.sentences.length > 0);
  if (validSections.length >= 2) {
    return validSections;
  }

  // Fallback: If no explicit headers were detected, split all sentences into 3 proportional parts
  const allSentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => s.length > 20 && !isHeadingLine(s));

  const total = allSentences.length;
  if (total <= 3) {
    return [{ title: 'Full Document Content', sentences: allSentences }];
  }

  const s1Count = Math.ceil(total * 0.33);
  const s2Count = Math.ceil(total * 0.33);

  return [
    {
      title: 'Part 1: Fundamental Concepts & Definitions',
      sentences: allSentences.slice(0, s1Count)
    },
    {
      title: 'Part 2: Core Formulations, Types & Methods',
      sentences: allSentences.slice(s1Count, s1Count + s2Count)
    },
    {
      title: 'Part 3: Equations, Applications & Worked Examples',
      sentences: allSentences.slice(s1Count + s2Count)
    }
  ];
}

export type ContentKind = 'definition' | 'classification' | 'formula' | 'numerical' | 'concept';

export interface SentenceAnalysis {
  answer: string;
  contentType: ContentKind;
  subject?: string;
}

function cleanAnswerText(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^(the term|the|a|an|in|when|to|and|by|of|on|for|from|as|with|at)\s+/i, '').trim();
  cleaned = cleaned.replace(/\s+(of|on|in|to|for|with|by|at|from|as|and|or|is|are)$/i, '').trim();
  cleaned = cleaned.replace(/[.,;:!?]+$/, '').trim();
  return cleaned;
}

/**
 * Extracts a real, meaningful target answer DIRECTLY from THAT specific sentence.
 * Guarantees that the answer is an exact substring of the sentence itself.
 */
export function extractSentenceAnswer(sentence: string): SentenceAnalysis {
  const cleanSentence = sentence.trim();

  // 1. Definition pattern: "X is defined as Y" or "X is called Y"
  const defMatch = cleanSentence.match(/^([A-Z][a-zA-Z0-9\s'\-]{2,40}?)\s+(?:is defined as|is called|refers to|is known as|means|is a measure of|is a statistical|is the process of)\b/i);
  if (defMatch && defMatch[1]) {
    const rawSubject = defMatch[1].trim();
    const subject = cleanAnswerText(rawSubject);
    if (isValidCandidate(subject) && cleanSentence.toLowerCase().includes(subject.toLowerCase())) {
      return { answer: subject, contentType: 'definition', subject };
    }
  }

  // 2. Formula / Equation / Method domain patterns
  for (const pattern of DOMAIN_TERMS_PATTERNS) {
    const termMatch = cleanSentence.match(pattern);
    if (termMatch) {
      const term = cleanAnswerText(termMatch[0].trim());
      if (isValidCandidate(term) && cleanSentence.toLowerCase().includes(term.toLowerCase())) {
        return { answer: term, contentType: 'formula', subject: term };
      }
    }
  }

  // Mathematical equation / formula notation inside sentence
  const equationMatch = cleanSentence.match(/\b(y\s*=\s*a\s*\+\s*bx|y\s*=\s*ax\^2\s*\+\s*bx\s*\+\s*c|r\s*=\s*[^.,;]{3,30}|sum\s+xy\s*=\s*[^.,;]+|sum\s+y\s*=\s*[^.,;]+)\b/i);
  if (equationMatch) {
    const eq = cleanAnswerText(equationMatch[0].trim());
    return { answer: eq, contentType: 'formula', subject: 'equation' };
  }

  // 3. Classification patterns: "positive and negative", "linear and non-linear", "simple and multiple"
  const classMatch = cleanSentence.match(/\b(positive and negative|linear and non-linear|simple and multiple|positive, negative, and zero|positive, negative or zero)\b/i);
  if (classMatch) {
    const classTerm = cleanAnswerText(classMatch[0].trim());
    return { answer: classTerm, contentType: 'classification', subject: 'types' };
  }

  const typesListMatch = cleanSentence.match(/(?:types of|classified into|types are|forms of|divided into)\s+([a-zA-Z\s,]+?)(?:\.|\;|\:|\band\b|such as)/i);
  if (typesListMatch && typesListMatch[1].trim().length > 4) {
    const phrase = cleanAnswerText(typesListMatch[1].trim());
    if (isValidCandidate(phrase)) {
      return { answer: phrase, contentType: 'classification', subject: 'classifications' };
    }
  }

  // 4. Numerical range or statistical value (e.g., "-1 and +1", "between -1 and +1")
  const rangeMatch = cleanSentence.match(/\b(between\s+[-+]?\d+(?:\.\d+)?\s+and\s+[-+]?\d+(?:\.\d+)?|[-+]?\d+(?:\.\d+)?\s+to\s+[-+]?\d+(?:\.\d+)?|[-+]?1\s+and\s+[-+]?1)\b/i);
  if (rangeMatch) {
    const numRange = cleanAnswerText(rangeMatch[0].trim());
    return { answer: numRange, contentType: 'numerical', subject: 'range' };
  }

  // 5. Capitalized multi-word noun phrase in this sentence
  const entityMatch = cleanSentence.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)\b/);
  if (entityMatch) {
    const entity = cleanAnswerText(entityMatch[0].trim());
    if (isValidCandidate(entity) && cleanSentence.toLowerCase().includes(entity.toLowerCase())) {
      return { answer: entity, contentType: 'concept', subject: entity };
    }
  }

  // 6. Capitalized single technical term in this sentence
  const singleEntityMatch = cleanSentence.match(/\b([A-Z][a-zA-Z]{3,20})\b/);
  if (singleEntityMatch) {
    const term = cleanAnswerText(singleEntityMatch[0].trim());
    if (isValidCandidate(term) && cleanSentence.toLowerCase().includes(term.toLowerCase())) {
      return { answer: term, contentType: 'concept', subject: term };
    }
  }

  // 7. Informative 2-3 word phrase from the sentence (excluding prepositions)
  const words = cleanSentence.split(/\s+/).filter(w => !CANDIDATE_BLACKLIST.has(w.toLowerCase()));
  for (let i = 0; i < words.length - 1; i++) {
    if (/^(of|on|in|to|for|with|by|at|from|as|and|or|the|a|an|when|where)$/i.test(words[i])) continue;
    const rawCandidate = `${words[i]} ${words[i + 1]}`.replace(/[^a-zA-Z\s]/g, '').trim();
    const candidate = cleanAnswerText(rawCandidate);
    if (candidate.length > 5 && isValidCandidate(candidate) && cleanSentence.toLowerCase().includes(candidate.toLowerCase())) {
      return { answer: candidate, contentType: 'concept', subject: candidate };
    }
  }

  // Fallback: first clean word of sentence
  const fallbackWord = cleanSentence.split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, '') || 'Concept';
  return { answer: fallbackWord, contentType: 'concept', subject: fallbackWord };
}

/**
 * Generates contextually relevant distractors matching the question's content type
 * drawn from sibling questions or realistic domain alternatives.
 */
function generateContextualDistractors(
  answer: string,
  contentType: ContentKind,
  otherSentenceAnswers: string[]
): string[] {
  const cleanAns = answer.trim();

  // Numerical Range Distractors
  if (contentType === 'numerical' || /[-+]?\d+/.test(cleanAns)) {
    if (cleanAns.includes('-1') && cleanAns.includes('+1')) {
      return ['0 and 1', '-∞ and +∞', '-0.5 and +0.5'];
    }
    return ['0 to 100', '1 to 10', '-10 to +10'];
  }

  // Classification Distractors
  if (contentType === 'classification') {
    if (cleanAns.toLowerCase().includes('positive')) {
      return [
        'Primary and secondary',
        'Direct and indirect only',
        'Nominal and ordinal'
      ];
    }
    return [
      'Simple and compound',
      'Constant and variable',
      'Univariate and bivariate'
    ];
  }

  // Formula Distractors
  if (contentType === 'formula') {
    const formulaPool = [
      'Karl Pearson\'s correlation coefficient',
      'Spearman\'s rank correlation',
      'Regression equation of Y on X',
      'Method of least squares',
      'Coefficient of determination'
    ].filter(f => f.toLowerCase() !== cleanAns.toLowerCase());
    return formulaPool.slice(0, 3);
  }

  // Use other real answers extracted from real sentences across the document
  const pool = otherSentenceAnswers.filter(
    c => c.toLowerCase() !== cleanAns.toLowerCase() &&
         c.length > 2 &&
         /^[a-zA-Z\s]+$/.test(c)
  );

  if (pool.length >= 3) {
    return pool.slice(0, 3);
  }

  return [
    `Alternative ${cleanAns}`,
    `Secondary ${cleanAns}`,
    `Modified ${cleanAns}`
  ];
}

/**
 * Builds an exam-ready QuestionItem based on sentence content and content kind
 */
function buildQuestionItem(
  sentence: string,
  analysis: SentenceAnalysis,
  type: QuestionType,
  params: GenerationParams,
  index: number,
  allRealAnswers: string[],
  sectionTitle: string
): QuestionItem {
  const cleanSentence = sanitizeSentence(sentence);
  const cleanAnswer = analysis.answer.trim();
  const { contentType } = analysis;

  const t5Prompt = `generate question: context: ${cleanSentence} answer: ${cleanAnswer}`;
  let questionText = '';
  let options: { id: string; text: string; isCorrect: boolean }[] | undefined = undefined;
  let explanation = `Synthesized directly from "${sectionTitle}": "${cleanSentence}".`;

  // ── 1. OPEN-ENDED QUESTIONS ──
  if (type === 'open_ended') {
    if (contentType === 'definition') {
      questionText = `What is the definition and core significance of "${cleanAnswer}" as presented in ${sectionTitle}?`;
    } else if (contentType === 'classification') {
      questionText = `What are the primary types or classifications associated with "${cleanAnswer}" in the study material?`;
    } else if (contentType === 'formula') {
      questionText = `State the formula, equation, or mathematical method for "${cleanAnswer}" and describe its application.`;
    } else if (contentType === 'numerical') {
      questionText = `What numerical range, value, or limits are established for "${cleanAnswer}" according to the passage?`;
    } else {
      questionText = `Explain the concept of "${cleanAnswer}" based on the following statement: "${cleanSentence.slice(0, 100)}..."`;
    }

  // ── 2. MULTIPLE CHOICE QUESTIONS (MCQ) ──
  } else if (type === 'mcq') {
    const blankRegex = new RegExp(escapeRegExp(cleanAnswer), 'i');
    const blanked = cleanSentence.replace(blankRegex, '__________');

    if (contentType === 'definition') {
      questionText = `Which term is defined in the passage as: "${blanked}"?`;
    } else if (contentType === 'classification') {
      questionText = `According to the study material, which of the following identifies: "${blanked}"?`;
    } else if (contentType === 'formula') {
      if (blanked.includes('__________')) {
        questionText = `Which mathematical concept or formula correctly completes: "${blanked}"?`;
      } else {
        questionText = `Which of the following represents the formula or equation for "${cleanAnswer}"?`;
      }
    } else if (contentType === 'numerical') {
      questionText = `What is the numerical range or value specified for: "${blanked}"?`;
    } else {
      if (blanked.includes('__________')) {
        questionText = `Which term correctly completes the statement: "${blanked}"?`;
      } else {
        questionText = `Which concept is described in the passage: "${cleanSentence.slice(0, 85)}..."?`;
      }
    }

    const distractors = generateContextualDistractors(cleanAnswer, contentType, allRealAnswers);
    const allOptions = [cleanAnswer, ...distractors.slice(0, 3)];
    const shuffled = allOptions.sort(() => 0.5 - Math.random());
    options = shuffled.map((opt, idx) => ({
      id: `opt_${idx + 1}`,
      text: opt,
      isCorrect: opt.toLowerCase() === cleanAnswer.toLowerCase()
    }));

  // ── 3. FILL IN THE BLANK QUESTIONS ──
  } else if (type === 'fill_blank') {
    const blankRegex = new RegExp(escapeRegExp(cleanAnswer), 'i');
    let blanked = cleanSentence.replace(blankRegex, '__________');

    if (!blanked.includes('__________')) {
      const mid = Math.floor(cleanSentence.length / 2);
      blanked = `${cleanSentence.substring(0, mid)} __________ ${cleanSentence.substring(mid)}`;
    }
    questionText = `Fill in the blank: "${blanked}"`;

  // ── 4. TRUE / FALSE QUESTIONS ──
  } else if (type === 'true_false') {
    const isTrue = index % 2 !== 0;
    if (isTrue) {
      questionText = `True or False: ${cleanSentence}`;
      options = [
        { id: 'opt_1', text: 'True', isCorrect: true },
        { id: 'opt_2', text: 'False', isCorrect: false }
      ];
      explanation = `This statement is TRUE — it is directly stated in ${sectionTitle}: "${cleanSentence}".`;
    } else {
      const altTerm = allRealAnswers.find(c => c.toLowerCase() !== cleanAnswer.toLowerCase()) || 'an unrelated property';
      const falseSentence = cleanSentence.replace(new RegExp(escapeRegExp(cleanAnswer), 'i'), altTerm);
      questionText = `True or False: ${falseSentence}`;
      options = [
        { id: 'opt_1', text: 'True', isCorrect: false },
        { id: 'opt_2', text: 'False', isCorrect: true }
      ];
      explanation = `This statement is FALSE. The passage states "${cleanAnswer}", not "${altTerm}".`;
    }
  }

  const refQuestion = buildReferenceQuestion(cleanSentence, cleanAnswer, contentType);
  const bleu = calculateBleu(questionText, refQuestion);
  const rouge = calculateRouge(questionText, refQuestion);

  return {
    id: `q_${Date.now()}_${index}`,
    type,
    context: cleanSentence,
    answer: cleanAnswer,
    question: questionText,
    referenceQuestion: refQuestion,
    options,
    explanation,
    difficulty: params.difficulty,
    bloomsLevel: contentType === 'formula' ? 'Apply' : contentType === 'definition' ? 'Remember' : contentType === 'classification' ? 'Understand' : 'Analyze',
    bleuScore: bleu,
    rougeScore: rouge,
    t5PromptInput: t5Prompt
  };
}

/**
 * Builds a reference question for BLEU/ROUGE comparison
 */
function buildReferenceQuestion(sentence: string, answer: string, contentType: ContentKind): string {
  if (contentType === 'definition') {
    return `What is ${answer}?`;
  }
  if (contentType === 'formula') {
    return `What formula or method represents ${answer}?`;
  }
  if (contentType === 'classification') {
    return `What are the types of ${answer}?`;
  }
  if (contentType === 'numerical') {
    return `What value or range is stated for ${answer}?`;
  }
  return `Explain the meaning of ${answer} in: ${sentence.split(' ').slice(0, 5).join(' ')}?`;
}

/**
 * Direct Sentence-Based Local Question Generator
 * Completely eliminates any intermediate "key terms" extraction.
 * Questions are synthesized directly from complete sentences across the entire document.
 */
export function generateLocalQuestions(text: string, params: GenerationParams): QuestionItem[] {
  const cleanText = sanitizeContextText(text);

  // 1. Segment full document into sections (e.g. Part A, Part B, Part C)
  const sections = segmentDocumentSections(cleanText);

  // Filter sections that have sentences
  const activeSections = sections.filter(sec => sec.sentences.length > 0);
  if (activeSections.length === 0) {
    return [];
  }

  const requestedCount = params.questionCount || 10;
  const questions: QuestionItem[] = [];

  const questionTypes: QuestionType[] = params.questionTypes && params.questionTypes.length > 0
    ? params.questionTypes
    : ['mcq', 'fill_blank', 'true_false', 'open_ended'];

  // 2. Allocate questions proportionally across ALL sections
  const questionsPerSection: number[] = new Array(activeSections.length).fill(Math.floor(requestedCount / activeSections.length));
  let remainder = requestedCount % activeSections.length;
  for (let s = 0; s < remainder; s++) {
    questionsPerSection[s]++;
  }

  // Pre-collect real answers directly from sentences across the document for distractors
  const collectedAnswers: string[] = [];
  for (const sec of activeSections) {
    for (const sent of sec.sentences) {
      const a = extractSentenceAnswer(sent);
      if (a.answer && isValidCandidate(a.answer)) {
        collectedAnswers.push(a.answer);
      }
    }
  }

  let globalQuestionIndex = 1;

  for (let sIdx = 0; sIdx < activeSections.length; sIdx++) {
    const section = activeSections[sIdx];
    const qCountForSec = questionsPerSection[sIdx];
    const secSentences = section.sentences;

    if (secSentences.length === 0 || qCountForSec === 0) continue;

    // Sample sentences across the FULL RANGE of this section (beginning, middle, end)
    const step = Math.max(1, Math.floor(secSentences.length / qCountForSec));

    for (let q = 0; q < qCountForSec; q++) {
      if (questions.length >= requestedCount) break;

      const sentenceIndex = (q * step) % secSentences.length;
      const sentence = secSentences[sentenceIndex];

      // Extract answer DIRECTLY from THAT sentence's actual content
      const analysis = extractSentenceAnswer(sentence);

      // STEP 3: SANITY FILTER — reject if the answer token is not found as a substring within the context sentence
      if (!sentence.toLowerCase().includes(analysis.answer.toLowerCase())) {
        continue;
      }

      // Cycle question types
      const qType = questionTypes[(globalQuestionIndex - 1) % questionTypes.length];

      const item = buildQuestionItem(
        sentence,
        analysis,
        qType,
        params,
        globalQuestionIndex,
        collectedAnswers,
        section.title
      );

      // Additional guarantee: reject if generated item's answer is not in context
      if (item.context.toLowerCase().includes(item.answer.toLowerCase())) {
        questions.push(item);
        globalQuestionIndex++;
      }
    }
  }

  return questions;
}

function sanitizeContextText(text: string): string {
  return text
    .replace(/\[Extracted study material from.*?\]/gi, '')
    .replace(/Passage extracted from.*?:/gi, '')
    .replace(/\b\d{8,}\b/g, '')
    .replace(/\b(0000000000|65535|Root|Info|Size|xref|trailer|startxref)\b/gi, '')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r?\n\s*\r?\n/g, '\n\n')
    .trim();
}

function sanitizeSentence(sentence: string): string {
  return sentence
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
