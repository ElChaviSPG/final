export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const end = to ? new Date(new Date(to).getTime() + 86400000) : new Date();

    const sessions = await prisma.parkingSession.findMany({
      where: { entry_time: { gte: start, lte: end } },
      select: { amount_due: true, is_paid: true, duration_minutes: true, space_id: true, vehicle_id: true, entry_time: true },
    });

    const total = sessions.reduce((s, p) => s + Number(p.amount_due ?? 0), 0);
    const paid  = sessions.filter(s => s.is_paid);
    const paidTotal = paid.reduce((s, p) => s + Number(p.amount_due ?? 0), 0);
    const avgPerSession = sessions.length ? paidTotal / Math.max(1, paid.length) : 0;
    const uniqueVehicles = new Set(sessions.map(s => s.vehicle_id).filter(Boolean)).size;

    // Agrupar por día
    const dailyMap = {};
    for (const s of sessions) {
      const day = s.entry_time.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { date: day, total: 0, count: 0 };
      dailyMap[day].total += Number(s.amount_due ?? 0);
      dailyMap[day].count += 1;
    }
    const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return res.ok({
      from: start,
      to: end,
      total: parseFloat(total.toFixed(2)),
      total_revenue: parseFloat(total.toFixed(2)),
      total_entries: sessions.length,
      unique_vehicles: uniqueVehicles,
      avg_per_session: parseFloat(avgPerSession.toFixed(2)),
      daily,
    });
  } catch (e) {
    return res.error(e.message);
  }
}
