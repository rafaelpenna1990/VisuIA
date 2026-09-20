import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAdminAuthorized } from '../../../../lib/adminAuth.js';

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'data', 'uploads');

// TEMPORARY diagnostic route — lists exactly what's on disk in
// data/uploads, so we can see the real filenames instead of guessing.
// Safe to delete once the carousel bug is confirmed fixed.
export async function GET(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const result = {};
  try {
    result.root = fs.readdirSync(UPLOADS_DIR);
  } catch (e) {
    result.root = `erro: ${e.message}`;
  }
  try {
    result.carousel = fs.readdirSync(path.join(UPLOADS_DIR, 'carousel'));
  } catch (e) {
    result.carousel = `erro: ${e.message}`;
  }
  return NextResponse.json(result);
}
