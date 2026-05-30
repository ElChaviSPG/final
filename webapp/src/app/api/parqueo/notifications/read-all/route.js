export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    const { user_id } = await request.json().catch(() => ({}));
    const uid = user_id ?? user?.sub;
    if (!uid) return res.unauthorized();

    await prisma.notification.updateMany({
      where: { user_id: uid, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
    return res.ok(null, 'Todas las notificaciones marcadas como leídas');
  } catch (e) {
    return res.error(e.message);
  }
}
