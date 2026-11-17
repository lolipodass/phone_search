import { NextRequest, NextResponse } from 'next/server';
import { errorMessage, getSupabase } from '@/lib/supabase';
import { ENGINES, type Engine } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from('search_history')
      .select('id, query, engine, created_at')
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
  try {
    const body = await request.json().catch(() => ({}) as Record<string, unknown>);
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    const engine = body.engine as Engine;

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }
    if (!ENGINES.includes(engine)) {
      return NextResponse.json({ error: 'invalid engine' }, { status: 400 });
    }

    const { data, error } = await getSupabase()
      .rpc('add_search', { p_query: query, p_engine: engine })
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();

    if (request.nextUrl.searchParams.get('all') === '1') {
      const { error } = await supabase.from('search_history').delete().gt('id', 0);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    const rawId = request.nextUrl.searchParams.get('id');
    const id = Number(rawId);
    if (!rawId || !Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'a valid id is required' }, { status: 400 });
    }

    const { error } = await supabase.from('search_history').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
