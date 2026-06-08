export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.VITE_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'interleaved-thinking-2025-05-14'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    // If tool use is involved, make a follow-up call to get the final text
    if (data.stop_reason === 'tool_use') {
      const toolResults = data.content
        .filter(b => b.type === 'tool_use')
        .map(b => ({ type: 'tool_result', tool_use_id: b.id, content: '' }));

      const followUp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          ...req.body,
          messages: [
            ...req.body.messages,
            { role: 'assistant', content: data.content },
            { role: 'user', content: toolResults }
          ]
        })
      });

      const followUpData = await followUp.json();
      return res.status(200).json(followUpData);
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'API request failed', details: error.message });
  }
}
