import { NextResponse } from 'next/server';
import { getDisabledModels } from '../../../lib/db.js';

// Public — every studio reads this once on load to filter its model list.
// No auth: this is the same information the model dropdowns themselves
// reveal, just centralized so the admin's kill-switch actually hides
// disabled models instead of only blocking them server-side.
export async function GET() {
  return NextResponse.json({ disabled: getDisabledModels() });
}
