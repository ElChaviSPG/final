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

    const sessions = await prisma.parkingSession.findMany({
      where: { entry_time: { gte: start, lte: end } },
      select: { entry_time: true, exit_time: true },
    });

    const hourly = new Array(24).fill(0);
    for (const s of sessions) {
      const hour = s.entry_time.getHours();
      hourly[hour]++;
    }

    return res.ok({ date: target.toISOString().split('T')[0], hourly_entries: hourly });
  } catch (e) {
    return res.error(e.message);
  }
}
