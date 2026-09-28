import { NextResponse } from 'next/server';
import { getSessionUser, verifyPassword, hashPassword } from '../../../../lib/auth.js';
import { adminSetPassword } from '../../../../lib/db.js';

// Powers "Alterar senha" na aba Perfil de /conta. Contas Google-only
// (password_hash vazio) não têm senha atual pra conferir — nesse caso
// não exige currentPassword, só cria a primeira senha da conta.
export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'A nova senha precisa ter pelo menos 8 caracteres' }, { status: 400 });
  }

  if (user.password_hash) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Informe sua senha atual' }, { status: 400 });
    }
    const ok = await verifyPassword(currentPassword, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 401 });
    }
  }

  const newHash = await hashPassword(newPassword);
  adminSetPassword(user.id, newHash);

  return NextResponse.json({ ok: true });
}
