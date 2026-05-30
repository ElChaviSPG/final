export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET() {
  try {
    const now = new Date();
    const hour = now.getHours();
    const nextHour = (hour + 1) % 24;
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPeak = [7, 8, 9, 12, 13, 17, 18, 19].includes(nextHour);

    const [total_spaces, current_occupied] = await Promise.all([
      prisma.parkingSpace.count({ where: { is_active: true } }),
      prisma.parkingSpace.count({ where: { status: 'OCCUPIED' } }),
    ]);

    const currentRate = total_spaces > 0 ? current_occupied / total_spaces : 0;
    let predictedOccupied = Math.round(currentRate * total_spaces);
    if (isPeak && !isWeekend) predictedOccupied = Math.min(total_spaces, Math.round(predictedOccupied * 1.2));
    if (isWeekend) predictedOccupied = Math.round(predictedOccupied * 0.7);

    const occupancy_pct = total_spaces > 0 ? parseFloat(((predictedOccupied / total_spaces) * 100).toFixed(1)) : 0;

    // Zona más congestionada actualmente
    const zoneOccupancy = await prisma.parkingSpace.groupBy({
      by: ['zone'],
      where: { status: 'OCCUPIED' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    });
    const busiest_zone = zoneOccupancy[0]?.zone ?? null;

    const expected_entries = Math.max(0, predictedOccupied - current_occupied);
    const expected_exits   = Math.max(0, current_occupied - predictedOccupied);
    const confidence = isPeak ? 0.82 : isWeekend ? 0.65 : 0.74;

    return res.ok({
      hour: nextHour,
      occupancy_pct,
      expected_entries,
      expected_exits,
      busiest_zone,
      confidence,
      current_occupied,
      total_spaces,
    });
  } catch (e) {
    return res.error(e.message);
  }
}
