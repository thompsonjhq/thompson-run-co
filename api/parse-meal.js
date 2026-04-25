module.exports = async function handler(req, res) {
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
        max_tokens: 200,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: `You are an Australian nutrition database. Extract accurate macros from food descriptions using realistic Australian serving sizes and products.

CRITICAL RULES:
- Be conservative and accurate — do NOT overestimate
- Use Australian café and supermarket standards
- For drinks: only count milk/cream macros, not water
- For coffee with milk: a flat white (200ml full cream milk) = 7g protein, 10g carbs, 8g fat, 140kcal
- For whole foods: banana (medium, 120g) = 1g protein, 25g carbs, 0g fat, 105kcal
- For nuts: almonds (small handful, 30g) = 6g protein, 5g carbs, 15g fat, 175kcal  
- For bread: 1 slice sourdough = 4g protein, 20g carbs, 1g fat, 110kcal
- Peanut butter (1 tbsp, 20g) = 4g protein, 3g carbs, 10g fat, 120kcal
- Protein bar (average) = 20g protein, 25g carbs, 8g fat, 250kcal
- Greek yoghurt (200g, full fat) = 12g protein, 8g carbs, 10g fat, 170kcal
- Chicken breast (150g cooked) = 42g protein, 0g carbs, 4g fat, 200kcal
- Rice (1 cup cooked, 185g) = 4g protein, 45g carbs, 0g fat, 200kcal

If multiple items, sum them all. Respond ONLY with valid JSON, no other text:
{"protein":number,"carbs":number,"fat":number,"kcal":number}`
          },
          { role: 'user', content: text }
        ]
      })
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const clean = raw.replace(/```json|```/g, '').trim();
    const macros = JSON.parse(clean);
    // Recalculate kcal from macros as a sanity check
    const calculatedKcal = Math.round((macros.protein||0)*4 + (macros.carbs||0)*4 + (macros.fat||0)*9);
    // Use whichever is more conservative
    macros.kcal = Math.min(macros.kcal || calculatedKcal, calculatedKcal * 1.1);
    macros.kcal = Math.round(macros.kcal);
    res.status(200).json(macros);
  } catch (err) {
    res.status(500).json({ error: err.message, protein: 0, carbs: 0, fat: 0, kcal: 0 });
  }
}
