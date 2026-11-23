const fs = require('fs');
const path = require('path');

const key = process.env.GEMINI_API_KEY;
const dir = process.env.TEST_IMAGE_DIR;

if (!key || !dir) {
  throw new Error('Set GEMINI_API_KEY and TEST_IMAGE_DIR to run this integration test.');
}

const allFiles = fs.readdirSync(dir).filter(f => f.endsWith('.png'));

// Simulate 8 uploaded page images
const pageImages = allFiles.slice(0, 8).map(f => {
  const buf = fs.readFileSync(path.join(dir, f));
  return `data:image/png;base64,${buf.toString('base64')}`;
});

console.log('Input has', pageImages.length, 'page images');

// Sampling logic
let selectedImages = pageImages;
if (pageImages.length > 4) {
  const step = (pageImages.length - 1) / 3;
  const indices = [0, Math.round(step), Math.round(2 * step), pageImages.length - 1];
  selectedImages = Array.from(new Set(indices)).map(i => pageImages[i]);
}

console.log('Selected', selectedImages.length, 'distributed pages for Gemini Vision');

const GEMINI_MODELS = ['gemini-3-flash-preview', 'gemini-3.6-flash', 'gemini-3.5-flash'];

async function testCall() {
  const prompt = `You are an educational tutor analyzing study notes.
Task: Generate 3 high-quality study questions testing understanding of this material.
Organize questions into categories where relevant:
- Definition & Conceptual Questions
- Formula/Calculation Questions
- Scenario & Identification Questions
- Classification Questions

Return ONLY a raw, valid JSON array of objects with the schema:
[
  {
    "id": "q_1",
    "category": "Definition & Conceptual Questions",
    "type": "mcq",
    "question": "...",
    "answer": "...",
    "explanation": "...",
    "options": [
      { "id": "opt_1", "text": "...", "isCorrect": true },
      { "id": "opt_2", "text": "...", "isCorrect": false },
      { "id": "opt_3", "text": "...", "isCorrect": false },
      { "id": "opt_4", "text": "...", "isCorrect": false }
    ],
    "difficulty": "medium",
    "bloomsLevel": "Understand"
  }
]`;

  const parts = [{ text: prompt }];
  for (const img of selectedImages) {
    const base64Data = img.replace(/^data:image\/\w+;base64,/, '');
    const match = img.match(/^data:(image\/\w+);base64,/);
    const mimeType = match ? match[1] : 'image/jpeg';
    parts.push({
      inlineData: { mimeType, data: base64Data }
    });
  }

  for (const model of GEMINI_MODELS) {
    console.log('Trying model:', model);
    try {
      const start = Date.now();
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      const d = await res.json();
      console.log(model, 'Status:', res.status, 'in', (Date.now() - start), 'ms');
      if (res.ok) {
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(text);
        console.log('🎉 Successfully parsed', parsed.length, 'questions!');
        console.log('Sample question 1:', parsed[0].question);
        console.log('Answer:', parsed[0].answer);
        return;
      } else {
        console.log(model, 'Error:', d.error?.message);
      }
    } catch (e) {
      console.log(model, 'Exception:', e.message);
    }
  }
}

testCall();
