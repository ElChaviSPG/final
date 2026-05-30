export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  try {
    const now = new Date();
    const y = year ? parseInt(year) : now.getFullYear();
    const m = (month ? parseInt(month) : now.getMonth() + 1) - 1;
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const [sessions, revenue] = await Promise.all([
      prisma.parkingSession.findMany({
        where: { entry_time: { gte: start, lte: end } },
        select: { entry_time: true, duration_minutes: true, amount_due: true, is_paid: true, status: true },
      }),
      prisma.payment.aggregate({
        where: { created_at: { gte: start, lte: end }, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    const dailyMap = {};
    for (const s of sessions) {
      const day = s.entry_time.toISOString().split('T')[0];
      dailyMap[day] = (dailyMap[day] ?? 0) + 1;
    }

    return res.ok({ year: y, month: m + 1, total_sessions: sessions.length, revenue: revenue._sum.amount ?? 0, daily_breakdown: dailyMap });
  } catch (e) {
    return res.error(e.message);
  }
}
