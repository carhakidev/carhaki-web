const CLEARVIN_BASE = 'https://www.clearvin.com/rest/vendor';

// Production token cache
let prodTokenCache: { token: string; expiresAt: number } | null = null;

export async function clearvinGetToken(): Promise<string> {
  // Test mode — use static test token
  if (process.env.CLEARVIN_USE_TEST === 'true' && process.env.CLEARVIN_TEST_TOKEN) {
    return process.env.CLEARVIN_TEST_TOKEN;
  }

  // Production mode — use email/password login, cache JWT for 110 mins (expires at 120)
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

  // Cache token for 110 minutes (refresh before 120 min expiry)
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

export async function clearvinReport(vin: string): Promise<{ html: string; reportId: string | null }> {
  const token = await clearvinGetToken();

  const res = await fetch(`${CLEARVIN_BASE}/report?vin=${vin}&format=html`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    // Try to parse error JSON
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message || `ClearVin report failed: ${res.status}`);
  }

  // Docs say response is plain HTML
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    // Some versions return JSON wrapper
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(data.message || 'ClearVin report error');
    const html = data.result?.html_report || data.result?.html || '';
    const reportId = data.result?.id || data.result?.reportId || null;
    return { html, reportId };
  }

  // Plain HTML response — extract report ID from HTML
  const html = await res.text();

  if (!html || html.length < 100) {
    throw new Error('ClearVin returned empty HTML');
  }

  // Try multiple ways to extract report ID from HTML
  const reportIdMatch =
    html.match(/data-report-id="([^"]+)"/) ||
    html.match(/reportId[=:]"?([A-Z0-9]+)"?/) ||
    html.match(/report-id[=:]"?([A-Z0-9]+)"?/) ||
    html.match(/\/report\/([A-Z0-9]{6,})/);

  const reportId = reportIdMatch ? reportIdMatch[1] : null;
  console.log('ClearVin report HTML length:', html.length, '| reportId extracted:', reportId);

  return { html, reportId };
}

export async function clearvinReportById(reportId: string, format: 'html' | 'pdf' = 'html') {
  const token = await clearvinGetToken();

  const res = await fetch(`${CLEARVIN_BASE}/report?reportId=${reportId}&format=${format}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`ClearVin re-fetch failed: ${res.status}`);
  return format === 'pdf' ? res.arrayBuffer() : res.text();
}
