export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '20');

  try {
    const [recent_sessions, recent_payments, recent_notifications] = await Promise.all([
      prisma.parkingSession.findMany({
        take: limit,
        orderBy: { entry_time: 'desc' },
        include: { vehicle: true, space: true, user: { select: { first_name: true, last_name: true } } },
      }),
      prisma.payment.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        include: { user: { select: { first_name: true, last_name: true } } },
      }),
      prisma.notification.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        include: { user: { select: { first_name: true, last_name: true } } },
      }),
    ]);

    return res.ok({ recent_sessions, recent_payments, recent_notifications });
  } catch (e) {
    return res.error(e.message);
  }
}
