export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET() {
  try {
    const [blacklisted_active, long_sessions, low_spaces] = await Promise.all([
      prisma.parkingSession.findMany({
        where: { status: 'ACTIVE', vehicle: { blacklisted: true } },
        include: { vehicle: true, space: true },
        take: 10,
      }),
      prisma.parkingSession.findMany({
        where: { status: 'ACTIVE', entry_time: { lt: new Date(Date.now() - 8 * 3600000) } },
        include: { vehicle: true, space: true, user: { select: { first_name: true, last_name: true } } },
        take: 10,
        orderBy: { entry_time: 'asc' },
      }),
      prisma.parkingSpace.count({ where: { status: 'AVAILABLE', is_active: true } }),
    ]);

    const alerts = [];
    if (blacklisted_active.length > 0) alerts.push({ type: 'BLACKLIST', severity: 'CRITICAL', message: `${blacklisted_active.length} vehículo(s) en lista negra activos`, data: blacklisted_active });
    if (long_sessions.length > 0) alerts.push({ type: 'LONG_SESSION', severity: 'WARNING', message: `${long_sessions.length} sesión(es) de más de 8 horas`, data: long_sessions });
    if (low_spaces < 10) alerts.push({ type: 'LOW_AVAILABILITY', severity: low_spaces < 5 ? 'CRITICAL' : 'WARNING', message: `Solo ${low_spaces} espacio(s) disponible(s)` });

    return res.ok({ alert_count: alerts.length, alerts });
  } catch (e) {
    return res.error(e.message);
  }
}
