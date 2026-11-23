export type QuestionType = 'mcq' | 'fill_blank' | 'true_false' | 'open_ended';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type DatasetSource = 'custom' | 'squad_1_1' | 'race' | 'study_notes';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export type QuestionCategory =
  | 'Definition & Conceptual'
  | 'Formula/Calculation'
  | 'Scenario & Identification'
  | 'Classification'
  | string;

export interface QuestionItem {
  id: string;
  type: QuestionType;
  context: string;
  answer: string;
  question: string;
  referenceQuestion?: string; // SQuAD ground truth question (benchmark mode only)
  options?: QuestionOption[]; // RACE / MCQ options
  explanation: string;
  difficulty: Difficulty;
  subject?: string;
  category?: QuestionCategory;
  isMultimodal?: boolean;
  bloomsLevel?: 'Remember' | 'Understand' | 'Apply' | 'Analyze';
  bleuScore?: {
    bleu_1: number;
    bleu_2: number;
    bleu_3: number;
    bleu_4: number;
    bleu_avg: number;
  };
  rougeScore?: {
    rouge_1: number;
    rouge_2: number;
    rouge_l: number;
  };
  t5PromptInput?: string; // SQuAD/T5 extractive prompt (benchmark mode only)
}

export interface GenerationParams {
  dataset: DatasetSource;
  questionTypes: QuestionType[];
  questionCount: number;
  difficulty: Difficulty;
  temperature: number;
  apiKey?: string;
  aiProvider?: 'local' | 'gemini' | 'openai' | 'claude';
  pageImages?: string[];
}

export interface MetricEvaluationResult {
  sampleId: string;
  context: string;
  answer: string;
  referenceQuestion: string;
  generatedQuestion: string;
  bleu1: number;
  bleu2: number;
  bleu3: number;
  bleu4: number;
  bleuAvg: number;
  rouge1: number;
  rouge2: number;
  rougeL: number;
}

export interface DatasetSample {
  id: string;
  context: string;
  answer: string;
  referenceQuestion?: string;
  subject: string;
  options?: string[];
}

export interface QuizAnswerRecord {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
}
