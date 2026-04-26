module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { activities, notes, strengthLog, currentWeek, weeks } = req.body;

    // Build a concise data summary for the AI
    const recentRuns = (activities || []).slice(0, 10).map(a =>
      `${a.date}: ${a.sport_type||'Run'} ${a.distance}km @ ${a.pace||'—'}/km${a.average_heartrate ? ` ♥${Math.round(a.average_heartrate)}bpm` : ''}${notes[String(a.strava_id||a.id)] ? ` | note: "${notes[String(a.strava_id||a.id)]}"` : ''}`
    ).join('\n') || 'None';

    const upcomingWeek = weeks && currentWeek ? weeks[Math.min(currentWeek, 12)] : null;
    const upcomingHTML = upcomingWeek ? Object.entries(upcomingWeek.days || {}).map(([day, s]) =>
      `${day}: ${s.type} — ${s.detail}`
    ).join('\n') : 'Not available';

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 600,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are an expert running coach analysing an athlete's recent training data to suggest specific plan modifications.

RULES:
- Only suggest changes if there is clear evidence from the data (high HR, negative notes, missed sessions, pace too fast/slow)
- Be specific — name the actual session and the exact modification
- Maximum 3 recommendations
- Each must be actionable and tied to evidence
- If training looks good, say so and return empty recommendations array
- Respond ONLY with valid JSON, no markdown, no explanation:
{
  "status": "needs_adjustment" | "on_track",
  "summary": "one sentence overall assessment",
  "recommendations": [
    {
      "id": "rec_1",
      "priority": "high" | "medium" | "low",
      "session": "e.g. Tuesday Intervals",
      "current": "e.g. 6×1000m @ 4:10/km",
      "proposed": "e.g. 4×1000m @ 4:15/km",
      "reason": "e.g. HR averaging 168bpm on easy runs suggests fatigue — reduce intensity to avoid overtraining",
      "type": "reduce_intensity" | "reduce_volume" | "swap_session" | "add_rest" | "increase_load"
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Analyse this athlete's recent training and suggest modifications for the upcoming week.

CURRENT WEEK: ${currentWeek} of 13
UPCOMING SESSIONS:
${upcomingHTML}

RECENT ACTIVITIES (last 10):
${recentRuns}

STRENGTH SESSIONS: ${(strengthLog||[]).length} logged total

Generate recommendations based on the evidence. If no changes needed, return empty array with status "on_track".`
          }
        ]
      })
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    res.status(200).json(result);
  } catch (err) {
    console.error('Recommendations error:', err.message);
    res.status(500).json({ error: err.message, recommendations: [] });
  }
}
