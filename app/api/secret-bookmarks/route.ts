import { NextRequest, NextResponse } from 'next/server';
import { SECRET_CODE } from '@/lib/config';
import { errorMessage, getSupabase } from '@/lib/supabase';
import { normalizeUrl } from '@/lib/url';

export const dynamic = 'force-dynamic';

/** The code travels in a header and is kept in memory only while unlocked. */
function authorized(request: NextRequest): boolean {
  return request.headers.get('x-secret-code') === SECRET_CODE;
}

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return unauthorized();

  try {
    const { data, error } = await getSupabase()
      .from('secret_bookmarks')
      .select('id, label, url, created_at')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return unauthorized();

  try {
    const body = await request.json().catch(() => ({}) as Record<string, unknown>);
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
    const url = normalizeUrl(rawUrl);

    if (!label) {
      return NextResponse.json({ error: 'label is required' }, { status: 400 });
    }
    if (!url) {
      return NextResponse.json({ error: 'a valid http(s) url is required' }, { status: 400 });
    }

    const { data, error } = await getSupabase()
      .rpc('add_secret_bookmark', { p_label: label, p_url: url })
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return unauthorized();

  try {
    const rawId = request.nextUrl.searchParams.get('id');
    const id = Number(rawId);
    if (!rawId || !Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'a valid id is required' }, { status: 400 });
    }

    const { error } = await getSupabase().from('secret_bookmarks').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
