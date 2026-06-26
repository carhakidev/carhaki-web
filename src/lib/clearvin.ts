const CLEARVIN_BASE = 'https://www.clearvin.com/rest/vendor';

function getToken(): string {
  // Use test token if configured, otherwise use production token from env
  if (process.env.CLEARVIN_USE_TEST === 'true' && process.env.CLEARVIN_TEST_TOKEN) {
    return process.env.CLEARVIN_TEST_TOKEN;
  }
  return process.env.CLEARVIN_PROD_TOKEN || '';
}

export async function clearvinPreview(vin: string) {
  const token = getToken();
  if (!token) throw new Error('ClearVin token not configured');

  const res = await fetch(`${CLEARVIN_BASE}/preview?vin=${vin}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });

  const data = await res.json();
  if (data.status !== 'ok') throw new Error(data.message || 'ClearVin preview failed');
  return data.result;
}

export async function clearvinReport(vin: string): Promise<{ html: string; reportId: string | null }> {
  const token = getToken();
  if (!token) throw new Error('ClearVin token not configured');

  const res = await fetch(`${CLEARVIN_BASE}/report?vin=${vin}&format=html`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message || `ClearVin report failed: ${res.status}`);
  }

  // ClearVin returns JSON with { status, result: { id, vin, html_report } }
  const contentType = res.headers.get('content-type') || '';
  let html = '';
  let reportId: string | null = null;

  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(data.message || 'ClearVin report error');
    html = data.result?.html_report || '';
    reportId = data.result?.id || null;
  } else {
    // Plain HTML response
    html = await res.text();
    const match = html.match(/data-report-id="([^"]+)"/);
    reportId = match ? match[1] : null;
  }

  return { html, reportId };
}

export async function clearvinReportById(reportId: string, format: 'html' | 'pdf' = 'html') {
  const token = getToken();
  if (!token) throw new Error('ClearVin token not configured');

  const res = await fetch(`${CLEARVIN_BASE}/report?reportId=${reportId}&format=${format}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`ClearVin re-fetch failed: ${res.status}`);
  return format === 'pdf' ? res.arrayBuffer() : res.text();
}
