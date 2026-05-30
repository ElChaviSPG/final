export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  try {
    const target = date ? new Date(date) : new Date();
    const start = new Date(target); start.setHours(0, 0, 0, 0);
    const end = new Date(target); end.setHours(23, 59, 59, 999);

    const [total_sessions, completed_sessions, revenue, avg_duration] = await Promise.all([
      prisma.parkingSession.count({ where: { entry_time: { gte: start, lte: end } } }),
      prisma.parkingSession.count({ where: { entry_time: { gte: start, lte: end }, status: 'COMPLETED' } }),
      prisma.payment.aggregate({ where: { created_at: { gte: start, lte: end }, status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.parkingSession.aggregate({ where: { entry_time: { gte: start, lte: end }, duration_minutes: { not: null } }, _avg: { duration_minutes: true } }),
    ]);

    return res.ok({ date: target.toISOString().split('T')[0], total_sessions, completed_sessions, revenue: revenue._sum.amount ?? 0, avg_duration_minutes: Math.round(avg_duration._avg.duration_minutes ?? 0) });
  } catch (e) {
    return res.error(e.message);
  }
}
