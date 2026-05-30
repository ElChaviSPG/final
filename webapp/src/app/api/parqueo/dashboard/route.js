export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET() {
  try {
    const today_start = new Date(); today_start.setHours(0, 0, 0, 0);
    const today_end = new Date(); today_end.setHours(23, 59, 59, 999);

    const [total_spaces, available_spaces, occupied_spaces, active_sessions, today_entries, today_revenue, total_users, blacklisted_vehicles] = await Promise.all([
      prisma.parkingSpace.count({ where: { is_active: true } }),
      prisma.parkingSpace.count({ where: { status: 'AVAILABLE', is_active: true } }),
      prisma.parkingSpace.count({ where: { status: 'OCCUPIED' } }),
      prisma.parkingSession.count({ where: { status: 'ACTIVE' } }),
      prisma.parkingSession.count({ where: { entry_time: { gte: today_start, lte: today_end } } }),
      prisma.payment.aggregate({ where: { created_at: { gte: today_start, lte: today_end }, status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.user.count({ where: { deleted_at: null, is_active: true } }),
      prisma.vehicle.count({ where: { blacklisted: true, deleted_at: null } }),
    ]);

    const occupancy_rate = total_spaces > 0 ? parseFloat(((occupied_spaces / total_spaces) * 100).toFixed(1)) : 0;

    return res.ok({
      spaces: { total: total_spaces, available: available_spaces, occupied: occupied_spaces, occupancy_rate },
      sessions: { active: active_sessions, today_entries },
      revenue: { today: today_revenue._sum.amount ?? 0 },
      users: { total: total_users },
      alerts: { blacklisted_vehicles },
    });
  } catch (e) {
    return res.error(e.message);
  }
}
