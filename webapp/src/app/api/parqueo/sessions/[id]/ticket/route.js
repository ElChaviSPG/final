export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const session = await prisma.parkingSession.findUnique({
      where: { id },
      include: { vehicle: true, space: { include: { campus: true } }, user: { select: { first_name: true, last_name: true } }, payment: true },
    });
    if (!session) return res.notFound('Sesión no encontrada');

    return res.ok({
      ticket_number: `TKT-${session.id.slice(0, 8).toUpperCase()}`,
      entry_time: session.entry_time,
      exit_time: session.exit_time,
      duration_minutes: session.duration_minutes,
      amount_due: session.amount_due,
      paid: session.is_paid,
      vehicle: { placa: session.vehicle.placa, brand: session.vehicle.brand, color: session.vehicle.color },
      space: { code: session.space.code, zone: session.space.zone, campus: session.space.campus?.name },
      user: session.user,
    });
  } catch (e) {
    return res.error(e.message);
  }
}
