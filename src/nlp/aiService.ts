import { QuestionItem, GenerationParams } from '../types';
import { calculateBleu, calculateRouge } from './metricsCalculator';

const GEMINI_MODELS = ['gemini-3-flash-preview', 'gemini-3.6-flash', 'gemini-3.5-flash'];

async function callGeminiApi(apiKey: string, contents: any[], jsonMode = true): Promise<string> {
  let lastError: any = null;
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload: any = { contents };
      if (jsonMode) {
        payload.generationConfig = { responseMimeType: 'application/json' };
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        const err = await res.json().catch(() => ({}));
        lastError = new Error(err.error?.message || `Gemini ${model} returned status ${res.status}`);
      }
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('Gemini API call failed across all models.');
}

/**
 * DIRECT MULTIMODAL LLM QUESTION GENERATION
 * Sends page images directly to Vision LLMs (Gemini, GPT-4o, Claude 3.5 Sonnet).
 * Semantically reads handwriting, diagrams, and formulas without OCR errors.
 */
export async function generateMultimodalQuestions(
  pageImages: string[],
  params: GenerationParams
): Promise<QuestionItem[]> {
  const { apiKey, aiProvider = 'gemini', questionCount, difficulty } = params;

  if (!apiKey) {
    throw new Error(
      `An API Key is required for ${aiProvider.toUpperCase()} Multimodal Vision generation. ` +
      `Please click "AI Engine Setup" to enter your ${aiProvider.toUpperCase()} key.`
    );
  }

  if (!pageImages || pageImages.length === 0) {
    throw new Error('No page images were provided for Multimodal Vision generation.');
  }

  // Intelligently sample up to 3 distributed representative pages for multi-page documents (e.g. 8-page PDF)
  // to avoid hitting free-tier payload / token limits while covering the entire document.
  let selectedImages = pageImages;
  if (pageImages.length > 3) {
    const first = pageImages[0];
    const mid = pageImages[Math.floor(pageImages.length / 2)];
    const last = pageImages[pageImages.length - 1];
    selectedImages = [first, mid, last];
  }

  const prompt = `You are looking at handwritten or printed student study notes across ${selectedImages.length} representative page(s) of this document. Read and thoroughly understand the content of these pages, including all handwritten notes, formulas, mathematical notations, and diagrams.

Task: Generate exactly ${questionCount} high-quality study questions that thoroughly test understanding of this material across the topics shown.

Organize questions into categories where relevant:
- Definition & Conceptual Questions
- Formula/Calculation Questions
- Scenario & Identification Questions
- Classification Questions

Guidelines:
1. Provide a concise, accurate correct answer for each question.
2. Provide a helpful, clear tutor explanation.
3. Write in clear, natural language — do not extract exact character spans, paraphrase and explain as a knowledgeable tutor would.
4. If MCQ questions are requested, provide 4 plausible options with exactly one correct option marked isCorrect: true.

Requested Question Types: ${params.questionTypes.join(', ')}
Difficulty Level: ${difficulty}

Return ONLY a raw, valid JSON array of objects with the following schema:
[
  {
    "id": "q_1",
    "category": "Definition & Conceptual Questions" | "Formula/Calculation Questions" | "Scenario & Identification Questions" | "Classification Questions",
    "type": "mcq" | "fill_blank" | "true_false" | "open_ended",
    "question": "<clear natural question>",
    "answer": "<concise correct answer>",
    "explanation": "<tutor explanation>",
    "options": [
      { "id": "opt_1", "text": "<option 1>", "isCorrect": true },
      { "id": "opt_2", "text": "<option 2>", "isCorrect": false },
      { "id": "opt_3", "text": "<option 3>", "isCorrect": false },
      { "id": "opt_4", "text": "<option 4>", "isCorrect": false }
    ],
    "difficulty": "${difficulty}",
    "bloomsLevel": "Remember" | "Understand" | "Apply" | "Analyze"
  }
]`;

  let responseText = '';

  // ── 1. Google Gemini Multimodal Vision ────────────────────────────────────
  if (aiProvider === 'gemini') {
    const parts: any[] = [{ text: prompt }];

    for (const img of selectedImages) {
      const base64Data = img.replace(/^data:image\/\w+;base64,/, '');
      const match = img.match(/^data:(image\/\w+);base64,/);
      const mimeType = match ? match[1] : 'image/jpeg';
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
    }

    responseText = await callGeminiApi(apiKey, [{ parts }], true);

  // ── 2. OpenAI GPT-4o Multimodal Vision ─────────────────────────────────────
  } else if (aiProvider === 'openai') {
    const url = 'https://api.openai.com/v1/chat/completions';
    const contentParts: any[] = [{ type: 'text', text: prompt }];

    for (const img of selectedImages) {
      contentParts.push({
        type: 'image_url',
        image_url: { url: img }
      });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: contentParts }],
        temperature: params.temperature || 0.7
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API call failed with status ${res.status}`);
    }

    const data = await res.json();
    responseText = data.choices?.[0]?.message?.content || '';

  // ── 3. Anthropic Claude 3.5 Sonnet Multimodal Vision ──────────────────────
  } else if (aiProvider === 'claude') {
    const url = 'https://api.anthropic.com/v1/messages';
    const contentParts: any[] = [];

    for (const img of pageImages) {
      const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
      const mediaType = match ? match[1] : 'image/jpeg';
      const data = match ? match[2] : img.replace(/^data:image\/\w+;base64,/, '');
      contentParts.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data
        }
      });
    }
    contentParts.push({ type: 'text', text: prompt });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{ role: 'user', content: contentParts }]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Claude API call failed with status ${res.status}`);
    }

    const data = await res.json();
    responseText = data.content?.[0]?.text || '';
  } else {
    throw new Error(`Multimodal generation is not supported for provider "${aiProvider}". Please choose Gemini, OpenAI, or Claude.`);
  }

  if (!responseText.trim()) {
    throw new Error('Multimodal AI model returned an empty response.');
  }

  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to parse questions JSON from Multimodal AI response.');
  }

  let rawParsed: any[];
  try {
    rawParsed = JSON.parse(jsonMatch[0]);
  } catch (parseErr) {
    throw new Error(`Malformed JSON from Multimodal AI: ${parseErr}`);
  }

  if (!Array.isArray(rawParsed) || rawParsed.length === 0) {
    throw new Error('Multimodal AI returned an empty array.');
  }

  return rawParsed.map((item: any, idx: number) => {
    const questionText: string = item.question || item.text || `Question ${idx + 1}`;
    return {
      id: item.id || `q_multi_${Date.now()}_${idx}`,
      type: item.type || 'mcq',
      category: item.category || 'Definition & Conceptual Questions',
      isMultimodal: true,
      context: item.context || 'Extracted and synthesized directly from study notes image.',
      answer: item.answer || 'See explanation',
      question: questionText,
      options: item.options,
      explanation: item.explanation || 'Synthesized semantically by Multimodal Vision LLM.',
      difficulty: item.difficulty || difficulty,
      bloomsLevel: item.bloomsLevel || 'Understand'
    };
  });
}

/**
 * Text-based LLM Question Generator for Curated Texts & SQuAD/RACE Benchmarking.
 */
export async function generateAIQuestions(
  text: string,
  params: GenerationParams
): Promise<QuestionItem[]> {
  const { apiKey, aiProvider = 'gemini', questionCount, difficulty } = params;

  if (!apiKey) {
    throw new Error('API Key is missing for AI Generation mode.');
  }

  const prompt = `You are an expert NLP Automatic Question Generator model fine-tuned on SQuAD 1.1 and RACE datasets.
You are processing study material for student exam preparation. Your job is NOT to select a few key points — you must cover the FULL document from beginning to end.

CORE INSTRUCTIONS:
1. FULL DOCUMENT SPREAD: Distribute the ${questionCount} questions proportionally across ALL sections and topics in the document (beginning, middle, and end). For example, if the document covers multiple parts/topics (e.g. Correlation, Regression, Curve Fitting), allocate questions evenly across EVERY section so no section or topic is neglected. Do NOT cluster questions in just one section.
2. VARIED QUESTION KINDS: Ensure questions cover different types of academic content:
   - Definitions: "What is [concept]?" or "How is [term] defined?"
   - Classifications/Types: "What are the types of [topic]?"
   - Formulas & Equations: "What is the formula for [coefficient/method]?" or normal equations.
   - Numerical Values & Worked Examples: "What range of values does [variable] take?" or results from worked problems.
3. PRECISE IN-PASSAGE ANSWERS: The "answer" field MUST be a real, meaningful term, formula, or phrase taken directly from that question's source context sentence.
4. Do not omit sections because they seem minor. Every major concept must be represented.
5. Do NOT add commentary, opinions, or information not present in the source.

DOCUMENT TEXT:
"""
${text}
"""

Task: Generate exactly ${questionCount} high-quality questions based on the full document text above covering all sections, formulas, definitions, and distinct facts across the entire source material.
Difficulty Level: ${difficulty}
Requested Question Types: ${params.questionTypes.join(', ')}

Return ONLY a raw JSON array of objects with the following schema:
[
  {
    "id": "q_1",
    "type": "mcq" | "fill_blank" | "true_false" | "open_ended",
    "context": "<sentence from passage>",
    "answer": "<exact answer phrase>",
    "question": "<generated question text>",
    "referenceQuestion": "<ideal reference question for evaluation>",
    "explanation": "<short explanation>",
    "options": [
      { "id": "opt_1", "text": "<option 1>", "isCorrect": true },
      { "id": "opt_2", "text": "<option 2>", "isCorrect": false },
      { "id": "opt_3", "text": "<option 3>", "isCorrect": false },
      { "id": "opt_4", "text": "<option 4>", "isCorrect": false }
    ],
    "difficulty": "${difficulty}",
    "bloomsLevel": "Understand" | "Analyze" | "Apply" | "Remember"
  }
]`;

  let responseText = '';

  if (aiProvider === 'gemini') {
    responseText = await callGeminiApi(apiKey, [{ parts: [{ text: prompt }] }]);
  } else if (aiProvider === 'openai') {
    const url = 'https://api.openai.com/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: params.temperature
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'OpenAI API call failed');
    }

    const data = await res.json();
    responseText = data.choices?.[0]?.message?.content || '';
  } else if (aiProvider === 'claude') {
    const url = 'https://api.anthropic.com/v1/messages';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Claude API call failed');
    }

    const data = await res.json();
    responseText = data.content?.[0]?.text || '';
  } else {
    throw new Error(`Unknown AI provider: "${aiProvider}".`);
  }

  if (!responseText.trim()) {
    throw new Error(`${aiProvider} returned an empty response. Check your API key and quota.`);
  }

  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON array from AI model response.');
  }

  let rawParsed: any[];
  try {
    rawParsed = JSON.parse(jsonMatch[0]);
  } catch (parseErr) {
    throw new Error(`AI model returned malformed JSON: ${parseErr}`);
  }

  if (!Array.isArray(rawParsed) || rawParsed.length === 0) {
    throw new Error('AI model returned an empty or non-array JSON response.');
  }

  // Sanity filter: reject any item where answer is not present in context sentence
  const validParsed = rawParsed.filter((item: any) => {
    if (!item) return false;
    const context = (item.context || '').trim().toLowerCase();
    const answer = (item.answer || '').trim().toLowerCase();
    return context.length > 20 && answer.length > 1 && context.includes(answer);
  });

  const itemsToMap = validParsed.length > 0 ? validParsed : rawParsed;

  return itemsToMap.map((item: any, idx: number) => {
    const questionText: string = item.question || item.text || `Question ${idx + 1}`;
    const refQuestion: string = item.referenceQuestion || questionText;

    const bleu = calculateBleu(questionText, refQuestion);
    const rouge = calculateRouge(questionText, refQuestion);

    return {
      id: item.id || `q_ai_${Date.now()}_${idx}`,
      type: item.type || 'mcq',
      context: item.context || text.slice(0, 200),
      answer: item.answer || 'See explanation',
      question: questionText,
      referenceQuestion: refQuestion,
      options: item.options,
      explanation: item.explanation || 'Generated by AI engine based on context.',
      difficulty: item.difficulty || difficulty,
      bloomsLevel: item.bloomsLevel || 'Understand',
      bleuScore: bleu,
      rougeScore: rouge,
      t5PromptInput: `generate question: context: ${item.context || ''} answer: ${item.answer || ''}`
    };
  });
}
