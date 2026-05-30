export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    const start = from ? new Date(from) : new Date(Date.now() - 7 * 86400000);
    const end = to ? new Date(new Date(to).getTime() + 86400000) : new Date();

    const [total_spaces, sessions] = await Promise.all([
      prisma.parkingSpace.count({ where: { is_active: true } }),
      prisma.parkingSession.findMany({
        where: { entry_time: { gte: start, lte: end } },
        select: {
          duration_minutes: true,
          entry_time: true,
          amount_due: true,
          space: { select: { zone: true } },
        },
      }),
    ]);

    const total_entries = sessions.length;
    const durations = sessions.map(s => s.duration_minutes ?? 0).filter(d => d > 0);
    const avg_duration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const max_duration = durations.length ? Math.max(...durations) : 0;

    // Ocupación por hora (0-23)
    const hourlyCounts = Array(24).fill(0);
    for (const s of sessions) {
      const h = new Date(s.entry_time).getHours();
      hourlyCounts[h]++;
    }
    const maxHourly = Math.max(...hourlyCounts, 1);
    const hourly = hourlyCounts.map(c => Math.round((c / maxHourly) * 100));

    // Por zona — estructura completa
    const zoneMap = {};
    for (const s of sessions) {
      const z = s.space?.zone;
      if (!z) continue;
      if (!zoneMap[z]) zoneMap[z] = { entries: 0, revenue: 0, durations: [] };
      zoneMap[z].entries += 1;
      zoneMap[z].revenue += Number(s.amount_due ?? 0);
      if (s.duration_minutes) zoneMap[z].durations.push(s.duration_minutes);
    }
    const by_zone = {};
    for (const [z, d] of Object.entries(zoneMap)) {
      const zoneSpaces = Math.round(total_spaces / 4);
      by_zone[z] = {
        entries: d.entries,
        revenue: parseFloat(d.revenue.toFixed(2)),
        avg_duration: d.durations.length ? parseFloat((d.durations.reduce((a, b) => a + b, 0) / d.durations.length).toFixed(1)) : 0,
        avg_occupancy: zoneSpaces > 0 ? Math.min(100, Math.round((d.entries / (zoneSpaces * Math.max(1, Math.ceil((end - start) / 86400000)))) * 100)) : 0,
      };
    }
    // Asegurar que todas las zonas estén presentes
    for (const z of ['A', 'B', 'C', 'D']) {
      if (!by_zone[z]) by_zone[z] = { entries: 0, revenue: 0, avg_duration: 0, avg_occupancy: 0 };
    }

    const days = Math.max(1, Math.ceil((end - start) / 86400000));
    const avg_rate = total_spaces ? Math.min(100, Math.round((total_entries / (total_spaces * days)) * 100)) : 0;
    const peak_rate = Math.min(100, Math.round((maxHourly / Math.max(1, total_spaces)) * 100));

    return res.ok({
      from: start,
      to: end,
      total_spaces,
      total_entries,
      total_sessions: total_entries,
      avg_duration: parseFloat(avg_duration.toFixed(1)),
      max_duration: parseFloat(max_duration.toFixed(1)),
      avg_rate,
      peak_rate,
      hourly,
      by_zone,
    });
  } catch (e) {
    return res.error(e.message);
  }
}
