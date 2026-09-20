import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { isAdminAuthorized } from '../../../../../lib/adminAuth.js';
import { adminSetPassword, getUserById } from '../../../../../lib/db.js';

// Sets a new password directly for a user who's locked out — this is a
// manual "I'll help them over WhatsApp/email" tool, not a self-service
// forgot-password flow (that would need an email service set up).
export async function POST(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { userId, newPassword } = await request.json();
  if (!userId || !newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'Informe o usuário e uma senha de pelo menos 8 caracteres' }, { status: 400 });
  }
  const user = getUserById(Number(userId));
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  const hash = await bcrypt.hash(newPassword, 10);
  adminSetPassword(user.id, hash);
  return NextResponse.json({ ok: true });
}
