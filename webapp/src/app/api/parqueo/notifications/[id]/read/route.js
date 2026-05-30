export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const user = getUserFromRequest(request);
    const notif = await prisma.notification.findFirst({ where: { id, ...(user ? { user_id: user.sub } : {}) } });
    if (!notif) return res.notFound('Notificación no encontrada');
    await prisma.notification.update({ where: { id }, data: { is_read: true, read_at: new Date() } });
    return res.ok(null, 'Notificación marcada como leída');
  } catch (e) {
    return res.error(e.message);
  }
}
