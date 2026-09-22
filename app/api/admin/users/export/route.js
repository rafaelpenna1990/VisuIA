import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { isAdminAuthorized } from '../../../../../lib/adminAuth.js';
import { searchAllUsers } from '../../../../../lib/db.js';

// Downloads every user matching the current search (or all users, if the
// search box is empty) as an .xlsx file — same data shown in the
// Usuários tab, just all at once instead of paged.
export async function GET(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const q = request.nextUrl.searchParams.get('q') || '';
  const users = searchAllUsers(q);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Usuários');

  sheet.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'E-mail', key: 'email', width: 34 },
    { header: 'Saldo (VisuTokens)', key: 'saldo', width: 20 },
    { header: 'Cadastro', key: 'cadastro', width: 20 },
    { header: 'Login', key: 'login', width: 14 },
  ];
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF9500' } };

  for (const u of users) {
    sheet.addRow({
      id: u.id,
      email: u.email,
      saldo: Math.round(u.credits_balance * 100),
      cadastro: new Date(u.created_at).toLocaleString('pt-BR'),
      login: u.google_id ? 'Google' : u.facebook_id ? 'Facebook' : 'E-mail',
    });
  }
  sheet.autoFilter = { from: 'A1', to: 'E1' };

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `usuarios-visuia-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
