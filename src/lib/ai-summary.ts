export async function generateAISummary(vin: string, html: string): Promise<string> {
  try {
    // Extract key data from ClearVin HTML
    const extractText = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const plainText = extractText(html).substring(0, 3000);

    const prompt = `You are CarHaki's vehicle analyst. Analyze this vehicle report for a Nigerian Tokunbo car buyer.

VIN: ${vin}
Data: ${plainText}

Write a SHORT summary (max 200 words) in simple Nigerian English with:
1. What We Found (1-2 sentences on year/make/mileage)
2. Red Flags (list issues or say "No major red flags")
3. Verdict: ✅ GOOD TO BUY or ⚠️ NEGOTIATE PRICE or 🚨 AVOID THIS CAR
4. One key advice before buying

Be direct and honest like a trusted friend.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();
    console.log('Anthropic response status:', response.status);
    console.log('Anthropic data:', JSON.stringify(data).substring(0, 200));
    if (data.error) console.error('Anthropic error:', data.error);
    return data.content?.[0]?.text || '';
  } catch (err) {
    console.error('AI summary failed:', err);
    return '';
  }
}
