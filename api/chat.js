export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { messages, system, max_tokens = 800 } = req.body;
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: system ? [{ role: 'system', content: system }, ...messages] : messages,
        max_tokens,
        temperature: 0.7
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Groq error' });
    res.status(200).json({ content: data.choices?.[0]?.message?.content || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
