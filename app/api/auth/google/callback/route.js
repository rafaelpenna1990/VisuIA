import { NextResponse } from 'next/server';
import {
  getUserByEmail,
  getUserByGoogleId,
  createUserWithGoogle,
  linkGoogleToUser,
} from '../../../../../lib/db.js';
import { createSessionToken, setSessionCookie } from '../../../../../lib/auth.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function GET(request) {
  const origin = (process.env.APP_URL || '').trim();
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const savedState = request.cookies.get('google_oauth_state')?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${origin}/?auth_error=state`);
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(`${origin}/?auth_error=config`);
  }

  const redirectUri = `${origin}/api/auth/google/callback`;

  let tokenData;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error_description || tokenData.error || 'Falha ao trocar o código');
  } catch (err) {
    return NextResponse.redirect(`${origin}/?auth_error=token`);
  }

  let payload;
  try {
    const payloadB64 = tokenData.id_token.split('.')[1];
    payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
  } catch {
    return NextResponse.redirect(`${origin}/?auth_error=parse`);
  }

  const googleId = payload.sub;
  const email = payload.email;
  if (!googleId || !email) {
    return NextResponse.redirect(`${origin}/?auth_error=missing_fields`);
  }

  let user = getUserByGoogleId(googleId);
  let isNewSignup = false;

  if (!user) {
    const existingByEmail = getUserByEmail(email);
    if (existingByEmail) {
      user = linkGoogleToUser(existingByEmail.id, googleId);
    } else {
      user = createUserWithGoogle(email, googleId);
      isNewSignup = true;
    }
  }

  const token = createSessionToken(user.id);
  await setSessionCookie(token);

  const response = NextResponse.redirect(
    isNewSignup ? `${origin}/conta?tab=assinatura` : `${origin}/studio`
  );
  response.cookies.delete('google_oauth_state');
  return response;
}