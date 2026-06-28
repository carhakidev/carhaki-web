export async function generateAISummary(vin: string, html: string): Promise<string> {
  try {
    // Extract key data from ClearVin HTML
    const extractText = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const plainText = extractText(html).substring(0, 8000);

    const prompt = `You are CarHaki's vehicle analyst. A Nigerian Tokunbo car buyer just paid for a vehicle history report. 
Analyze this ClearVin report data and write a clear, honest summary in plain Nigerian English (mix of English that Nigerians understand easily — no jargon).

VIN: ${vin}

Report data:
${plainText}

Write a summary with these sections:

1. **What We Found** — 2-3 sentences about the car's basic info (year, make, model, mileage)

2. **⚠️ Red Flags** — List any serious issues found (salvage title, odometer problems, accidents, flood damage, etc). If none, say "No major red flags found"

3. **Recalls** — Mention any open safety recalls and what they mean

4. **Our Verdict** — One of these three:
   - ✅ GOOD TO BUY — if the car looks clean
   - ⚠️ NEGOTIATE PRICE — if there are some issues but car is fixable
   - 🚨 AVOID THIS CAR — if there are serious problems

5. **Advice** — 2-3 practical tips for this specific car before buying

Keep it short, honest, and in a tone like a trusted friend who knows cars. Maximum 300 words.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    return data.content?.[0]?.text || '';
  } catch (err) {
    console.error('AI summary failed:', err);
    return '';
  }
}
