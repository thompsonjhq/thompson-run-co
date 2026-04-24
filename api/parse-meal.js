export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { text } = req.body;
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 150,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: 'Extract macros from food descriptions. Respond ONLY with valid JSON, no other text: {"protein":number,"carbs":number,"fat":number,"kcal":number}. Use realistic gram estimates. Never include markdown or explanation.'
          },
          { role: 'user', content: text }
        ]
      })
    });
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const clean = raw.replace(/```json|```/g, '').trim();
    const macros = JSON.parse(clean);
    macros.kcal = macros.kcal || Math.round((macros.protein||0)*4 + (macros.carbs||0)*4 + (macros.fat||0)*9);
    res.status(200).json(macros);
  } catch (err) {
    res.status(500).json({ error: err.message, protein: 0, carbs: 0, fat: 0, kcal: 0 });
  }
}
