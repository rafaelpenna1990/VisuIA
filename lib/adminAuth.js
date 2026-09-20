// lib/adminAuth.js
//
// Shared password check for every /api/admin/* route — same simple
// pattern as the existing /leads page: one shared password
// (ADMIN_SECRET in Railway's Variables), sent as ?key=... on the request.
// Good enough for a solo founder; swap for a real admin role later if you
// ever add a team.
export function isAdminAuthorized(request) {
  const key = request.nextUrl.searchParams.get('key');
  const expected = process.env.ADMIN_SECRET;
  return !!expected && !!key && key === expected;
}
