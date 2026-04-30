export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      messages = [],
      system = '',
      max_tokens = 700,
      model = 'llama-3.1-8b-instant'
    } = req.body || {};

    const safeMessages = Array.isArray(messages)
      ? messages.slice(-16)
      : [];

    const groqMessages = system
      ? [{ role: 'system', content: system }, ...safeMessages]
      : safeMessages;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: groqMessages,
        max_tokens,
        temperature: 0.5
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const rawMessage = data.error?.message || '';

      if (
        response.status === 429 ||
        rawMessage.toLowerCase().includes('rate limit') ||
        rawMessage.toLowerCase().includes('tokens per minute')
      ) {
        return res.status(200).json({
          content: 'The coach model is rate-limited for a moment. Try again in a few seconds. Your activity data is still saved.'
        });
      }

      return res.status(200).json({
        content: 'The coach could not respond properly. Try again shortly.'
      });
    }

    return res.status(200).json({
      content: data.choices?.[0]?.message?.content || ''
    });
  } catch (err) {
    return res.status(200).json({
      content: 'The coach could not respond because of a temporary server error. Try again shortly.'
    });
  }
}
