export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return res.unauthorized();

    const now = new Date();
    const sub = await prisma.parkingSubscription.findFirst({
      where: { user_id: user.sub, status: 'ACTIVE', end_date: { gt: now } },
      orderBy: { end_date: 'desc' },
    });

    if (!sub) return res.ok({ has_active: false, subscription: null, days_remaining: 0 });

    const days_remaining = Math.max(0, Math.ceil((sub.end_date - now) / 86400000));
    return res.ok({ has_active: true, subscription: sub, days_remaining });
  } catch (e) {
    return res.error(e.message);
  }
}
