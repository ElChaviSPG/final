export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '10');
  const from  = searchParams.get('from');
  const to    = searchParams.get('to');

  try {
    const start = from ? new Date(from) : undefined;
    const end   = to   ? new Date(new Date(to).getTime() + 86400000) : undefined;
    const dateFilter = start && end ? { entry_time: { gte: start, lte: end } } : {};

    const groups = await prisma.parkingSession.groupBy({
      by: ['user_id'],
      where: { user_id: { not: null }, ...dateFilter },
      _count: { id: true },
      _sum: { amount_due: true, duration_minutes: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    if (!groups.length) return res.ok({ users: [] });

    const userIds = groups.map(g => g.user_id);

    const [usersData, zoneSessions] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, first_name: true, last_name: true, carnet: true, role: true },
      }),
      prisma.parkingSession.findMany({
        where: { user_id: { in: userIds }, ...dateFilter },
        select: { user_id: true, space: { select: { zone: true } } },
      }),
    ]);

    const userMap = Object.fromEntries(usersData.map(u => [u.id, u]));

    const zoneByUser = {};
    for (const s of zoneSessions) {
      const z = s.space?.zone;
      if (!z || !s.user_id) continue;
      if (!zoneByUser[s.user_id]) zoneByUser[s.user_id] = {};
      zoneByUser[s.user_id][z] = (zoneByUser[s.user_id][z] ?? 0) + 1;
    }

    const users = groups.map(g => {
      const user = userMap[g.user_id];
      const zoneCounts = zoneByUser[g.user_id] || {};
      const favorite_zone = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return {
        ...user,
        visits: g._count.id,
        total_minutes: Math.round(g._sum.duration_minutes ?? 0),
        total_spent: parseFloat((g._sum.amount_due ?? 0).toString()),
        favorite_zone,
      };
    });

    return res.ok({ users });
  } catch (e) {
    return res.error(e.message);
  }
}
