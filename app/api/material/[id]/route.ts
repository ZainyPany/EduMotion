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
    let labSteps = null;
    let labTitle = null;

    if (material.status === 'COMPLETE') {
      // Fetch the compiled video (if this material produced one)
      const { data: videoData } = await supabaseAdmin
        .from('generated_videos')
        .select('mp4_url')
        .eq('material_id', id)
        .maybeSingle();
      if (videoData) {
        mp4Url = videoData.mp4_url;
      }

      // Fetch the interactive lab (if this material produced one)
      const { data: labData } = await supabaseAdmin
        .from('generated_labs')
        .select('steps_payload')
        .eq('material_id', id)
        .maybeSingle();
      if (labData?.steps_payload) {
        const payload = labData.steps_payload as {
          steps?: unknown;
          metadata?: { title?: string };
        };
        labSteps = Array.isArray(payload.steps) ? payload.steps : null;
        labTitle = payload.metadata?.title ?? null;
      }
    }

    return NextResponse.json({ status: material.status, mp4Url, labSteps, labTitle });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
