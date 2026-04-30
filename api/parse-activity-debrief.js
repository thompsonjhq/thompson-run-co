export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { activity, detailText } = req.body || {};

    const prompt = `
You are converting a runner's post-run note into structured coaching data.

Return ONLY valid JSON with this shape:
{
  "session_label": "short human label",
  "session_type": "easy|steady|tempo|intervals|long_run|race|recovery|strength|other",
  "shoes": "shoe name or null",
  "rpe": number_or_null,
  "soreness_score": number_or_null,
  "quality_score": number_or_null,
  "completed_as_planned": "yes|modified|no|unknown",
  "structured_summary": "one concise sentence explaining what the session actually was",
  "segments": [
    { "label": "Warm-up", "distance_km": 4, "pace": "easy" }
  ]
}

Activity from Strava:
${JSON.stringify(activity, null, 2)}

Runner note:
${detailText}
`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      return res.status(500).json({
        error: data.error?.message || 'Debrief parse failed'
      });
    }

    const content = data.choices?.[0]?.message?.content || '{}';
    const clean = content.replace(/```json|```/g, '').trim();

    return res.status(200).json(JSON.parse(clean));
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Unexpected error'
    });
  }
}
