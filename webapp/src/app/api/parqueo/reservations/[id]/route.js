export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { space: true, vehicle: true, user: { select: { id: true, first_name: true, last_name: true, email: true } } },
    });
    if (!reservation) return res.notFound('Reserva no encontrada');
    return res.ok(reservation);
  } catch (e) {
    return res.error(e.message);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const user = getUserFromRequest(request);
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) return res.notFound('Reserva no encontrada');

    const isStaff = !user || ['ADMIN', 'SECURITY'].includes(user.role);
    if (user && !isStaff && reservation.user_id !== user.sub) return res.error('No autorizado', 403);
    if (!['PENDING', 'CONFIRMED'].includes(reservation.status)) return res.error('La reserva no puede cancelarse en su estado actual');

    await prisma.$transaction([
      prisma.reservation.update({ where: { id }, data: { status: 'CANCELLED' } }),
      prisma.parkingSpace.update({ where: { id: reservation.space_id }, data: { status: 'AVAILABLE' } }),
      prisma.auditLog.create({ data: { user_id: user?.sub ?? null, action: 'RESERVATION_DELETED', resource: 'reservation', resource_id: id } }),
    ]);

    return res.ok(null, 'Reserva cancelada y espacio liberado');
  } catch (e) {
    return res.error(e.message);
  }
}
