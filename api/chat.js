export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = { ...req.body };
    delete body.tools;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.VITE_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log('API Response:', JSON.stringify(data).substring(0, 500));
    res.status(200).json(data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'API request failed', details: error.message });
  }
}
