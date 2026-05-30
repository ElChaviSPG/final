export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const user = getUserFromRequest(request);
  const user_id = searchParams.get('user_id') ?? user?.sub;
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');

  try {
    const where = user_id ? { user_id } : {};
    const [total, unread, data] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, is_read: false } }),
      prisma.notification.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return res.ok({ total, unread, page, limit, data });
  } catch (e) {
    return res.error(e.message);
  }
}

export async function POST(request) {
  try {
    const dto = await request.json();
    const notification = await prisma.notification.create({
      data: {
        user_id: dto.user_id,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        metadata: dto.metadata,
      },
    });
    return res.created(notification, 'Notificación enviada');
  } catch (e) {
    return res.error(e.message);
  }
}
