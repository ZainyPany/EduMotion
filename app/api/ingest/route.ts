/**
 * POST /api/ingest
 *
 * Accepts source material in three forms and kicks off the Inngest
 * background generation pipeline:
 *
 *   • multipart/form-data   — PDF file upload (parsed with pdf-parse)
 *   • application/json      — plain text { text, assetType, targetLength, gradeLevel }
 *   • application/json      — URL { url, assetType, targetLength, gradeLevel }
 *                             (scraped server-side with cheerio)
 *
 * Flow:
 *   1. Verify Clerk session (401 if unauthenticated).
 *   2. Fetch or bootstrap the user's `profiles` row; seed 3 free credits on first use.
 *   3. Auto-top-up to 10 credits if the user has run out (dev convenience — remove for prod).
 *   4. Extract plain text from the source material.
 *   5. Insert a row into `educational_materials` with status PENDING.
 *   6. Fire the `material/process` Inngest event.
 *   7. Return the new material ID so the client can begin polling /api/material/:id.
 *
 * Returns: { id: string, status: "PENDING" }
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { inngest } from '@/lib/inngest/client'
import * as cheerio from 'cheerio'

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check credits, or create profile if not exists
    let { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('available_credits')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) {
      console.error('Error fetching profile:', profileErr);
      return NextResponse.json({ error: 'Profile query failed' }, { status: 500 });
    }

    if (!profile) {
      // Bootstrap new user profile with 3 free credits automatically
      const { data: newProfile, error: createErr } = await supabaseAdmin
        .from('profiles')
        .insert({ id: userId, available_credits: 3 })
        .select('available_credits')
        .maybeSingle();

      if (createErr || !newProfile) {
        console.error('Error creating profile:', createErr);
        return NextResponse.json({ error: 'Could not bootstrap user profile' }, { status: 500 });
      }
      profile = newProfile;
    }

    if (profile.available_credits <= 0) {
      // TODO: replace this auto-top-up with a real paywall / Stripe checkout before
      // going to production. Currently it exists to allow unrestricted local testing.
      const { data: toppedProfile, error: topUpErr } = await supabaseAdmin
        .from('profiles')
        .update({ available_credits: 10 })
        .eq('id', userId)
        .select('available_credits')
        .maybeSingle();

      if (topUpErr || !toppedProfile) {
        console.error('Error topping up user credits:', topUpErr);
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 403 });
      }
      profile = toppedProfile;
      console.log(`Automatically topped up user ${userId} to 10 credits.`);
    }

    const contentType = req.headers.get('content-type') || '';
    let extractedText = '';
    let sourceTitle = 'Untitled Source';
    let assetType = 'BOTH';
    let targetLength = 2;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      assetType = formData.get('assetType') as string || 'BOTH';
      targetLength = parseInt(formData.get('targetLength') as string || '2', 10);
      
      const file = formData.get('file') as File
      if (file) {
        sourceTitle = file.name
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        // Dynamic require prevents Next.js from bundling pdf-parse into the
        // Edge/client chunk (it uses Node.js built-ins incompatible with the browser).
        const pdfParse = require('pdf-parse')
        const parsed = await pdfParse(buffer)
        extractedText = parsed.text
      }
    } else {
      const body = await req.json();
      assetType = body.assetType || 'BOTH';
      targetLength = body.targetLength || 2;

      if (body.url) {
        sourceTitle = body.url;
        const res = await fetch(body.url);
        if (!res.ok) throw new Error('Failed to fetch URL');
        const html = await res.text();
        const $ = cheerio.load(html);
        $('script, style, nav, footer, header').remove();
        extractedText = $('body').text().replace(/\s+/g, ' ').trim();
      } else if (body.text) {
        sourceTitle = 'Text snippet';
        extractedText = body.text.replace(/\s+/g, ' ').trim();
      }
    }

    if (!extractedText || extractedText.length < 10) {
      return NextResponse.json({ error: 'Could not extract sufficient text from source.' }, { status: 400 });
    }

    // Insert into DB
    const { data: material, error: insertErr } = await supabaseAdmin
      .from('educational_materials')
      .insert({
        user_id: userId,
        source_title: sourceTitle,
        asset_type: assetType,
        target_length: targetLength,
        raw_extracted_text: extractedText,
        status: 'PENDING'
      })
      .select('id')
      .single();

    if (insertErr || !material) {
      console.error(insertErr);
      return NextResponse.json({ error: 'Database insert failed' }, { status: 500 });
    }

    // Trigger Inngest background job
    await inngest.send({
      name: "material/process",
      data: {
        materialId: material.id
      }
    });

    return NextResponse.json({ id: material.id, status: 'PENDING' });
  } catch (err: any) {
    console.error('Ingest error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
