const CLEARVIN_BASE = 'https://www.clearvin.com/rest/vendor';

// Production token cache
let prodTokenCache: { token: string; expiresAt: number } | null = null;

export async function clearvinGetToken(): Promise<string> {
  // Test mode — use static test token
  if (process.env.CLEARVIN_USE_TEST === 'true' && process.env.CLEARVIN_TEST_TOKEN) {
    return process.env.CLEARVIN_TEST_TOKEN;
  }

  // Production mode — cache JWT for 110 mins (expires at 120)
  const now = Date.now();
  if (prodTokenCache && prodTokenCache.expiresAt > now) {
    return prodTokenCache.token;
  }

  const email = process.env.CLEARVIN_EMAIL;
  const password = process.env.CLEARVIN_PASSWORD;
  if (!email || !password) throw new Error('ClearVin production credentials not configured');

  const res = await fetch(`${CLEARVIN_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (data.status !== 'ok' || !data.token) {
    throw new Error(data.message || 'ClearVin login failed');
  }

  prodTokenCache = {
    token: data.token,
    expiresAt: now + 110 * 60 * 1000,
  };

  return data.token;
}

export async function clearvinPreview(vin: string) {
  const token = await clearvinGetToken();

  const res = await fetch(`${CLEARVIN_BASE}/preview?vin=${vin}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });

  const data = await res.json();
  if (data.status !== 'ok') throw new Error(data.message || 'ClearVin preview failed');
  return data.result;
}

// Fetch HTML and PDF in parallel using format=html and format=pdf directly by VIN
// Per docs: same endpoint, same credit — PDF by reportId is free re-download
export async function clearvinReportWithPDF(vin: string): Promise<{ html: string; pdfBuffer: ArrayBuffer | null }> {
  const token = await clearvinGetToken();

  console.log('[clearvin] Fetching HTML + PDF in parallel for VIN:', vin);

  const [htmlRes, pdfRes] = await Promise.all([
    fetch(`${CLEARVIN_BASE}/report?vin=${vin}&format=html`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`${CLEARVIN_BASE}/report?vin=${vin}&format=pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  if (!htmlRes.ok) {
    const err = await htmlRes.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `ClearVin HTML failed: ${htmlRes.status}`);
  }

  const html = await htmlRes.text();
  if (!html || html.length < 100) throw new Error('ClearVin returned empty HTML');

  let pdfBuffer: ArrayBuffer | null = null;
  if (pdfRes.ok) {
    pdfBuffer = await pdfRes.arrayBuffer();
    console.log('[clearvin] PDF size:', pdfBuffer?.byteLength);
  } else {
    console.warn('[clearvin] PDF fetch failed:', pdfRes.status);
  }

  console.log('[clearvin] HTML length:', html.length);
  return { html, pdfBuffer };
}

// Keep for backward compat / re-downloads by reportId (free, no credit)
export async function clearvinReportById(reportId: string, format: 'html' | 'pdf' = 'html') {
  const token = await clearvinGetToken();
  const res = await fetch(`${CLEARVIN_BASE}/report?reportId=${reportId}&format=${format}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`ClearVin re-fetch failed: ${res.status}`);
  return format === 'pdf' ? res.arrayBuffer() : res.text();
}
