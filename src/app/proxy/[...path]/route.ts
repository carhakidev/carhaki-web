import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DJANGO_API = process.env.DJANGO_API_URL || 'https://carhaki-svmo.onrender.com';

async function handler(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/proxy', '');
  const search = url.search;

  const targetUrl = `${DJANGO_API}${path}${search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!['host', 'connection'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  headers.set('host', new URL(DJANGO_API).host);

  let body: ArrayBuffer | undefined;
  if (!['GET', 'HEAD'].includes(request.method)) {
    body = await request.arrayBuffer();
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: body || undefined,
    credentials: 'include',
  });

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      const rewritten = value
        .replace(/Domain=[^;]+;?/gi, '')
        .replace(/SameSite=None/gi, 'SameSite=Lax')
        .replace(/Secure;?/gi, request.url.startsWith('https') ? 'Secure;' : '');
      responseHeaders.append('Set-Cookie', rewritten);
    } else if (!['transfer-encoding'].includes(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  const responseBody = await response.arrayBuffer();

  return new NextResponse(responseBody, {
    status: response.status,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
