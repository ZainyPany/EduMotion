import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: material, error } = await supabaseAdmin
      .from('educational_materials')
      .select('status')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !material) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let mp4Url = null;
    if (material.status === 'COMPLETE') {
      const { data: videoData } = await supabaseAdmin
        .from('generated_videos')
        .select('mp4_url')
        .eq('material_id', id)
        .single();
      if (videoData) {
        mp4Url = videoData.mp4_url;
      }
    }

    return NextResponse.json({ status: material.status, mp4Url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
