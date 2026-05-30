export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET() {
  try {
    const now = new Date();
    const event = await prisma.parkingEvent.findFirst({
      where: {
        status: { in: ['ACTIVE', 'SCHEDULED'] },
        start_time: { lte: now },
        end_time: { gte: now },
      },
      include: { created_by: { select: { id: true, first_name: true, last_name: true } } },
    });

    if (!event) return res.ok(null, 'No hay evento activo en este momento');

    const tarifa_aplicable = event.tariff_mode === 'FLAT_RATE'
      ? { modo: 'FLAT_RATE', monto: event.flat_rate }
      : { modo: 'HOURLY', monto: null };

    return res.ok({ ...event, tarifa_aplicable });
  } catch (e) {
    return res.error(e.message);
  }
}
