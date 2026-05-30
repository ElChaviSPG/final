export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const qr_code = searchParams.get('qr_code');
  if (!qr_code) return res.error('qr_code requerido');

  try {
    const user = await prisma.user.findFirst({ where: { qr_code, deleted_at: null, is_active: true } });
    if (user) return res.ok({ valid: true, type: 'USER', name: `${user.first_name} ${user.last_name}`, role: user.role });

    const visitor = await prisma.visitorQR.findFirst({
      where: { qr_code, is_used: false, expires_at: { gt: new Date() } },
    });
    if (visitor) return res.ok({ valid: true, type: 'VISITOR', visitor_name: visitor.visitor_name, expires_at: visitor.expires_at });

    return res.ok({ valid: false });
  } catch (e) {
    return res.error(e.message);
  }
}
