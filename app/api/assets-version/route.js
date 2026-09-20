import { NextResponse } from 'next/server';
import { getSetting } from '../../../lib/db.js';

// Public — every component that shows the logo or a carousel file reads
// this once and appends ?v=<version> to the asset URL, so a fresh upload
// in /admin shows up immediately instead of waiting out the browser cache.
export async function GET() {
  return NextResponse.json({ version: getSetting('assets_version', '1') });
}
