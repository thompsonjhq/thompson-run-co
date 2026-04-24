export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { weekNum, weekLabel, phase, plannedKm, runSummary, strengthSummary, daysToRace } = req.body;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 600,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are a running coach writing a concise weekly digest. Be specific, reference actual data. Use plain text, no markdown. 3-4 short paragraphs max.'
          },
          {
            role: 'user',
            content: `Write a weekly training digest for Week ${weekNum} of 13 (${weekLabel}, ${phase} phase, ${plannedKm}km planned).

This week's activities:
${runSummary}

Recent strength:
${strengthSummary}

Days to race: ${daysToRace}

Cover: what went well, what needs attention, key focus for next week. Be specific and encouraging.`
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'Groq error' });

    return res.status(200).json({
      content: data.choices?.[0]?.message?.content || ''
    });
  } catch (err) {
    console.error('Digest error:', err);
    return res.status(500).json({ error: 'Failed to generate digest' });
  }
}
