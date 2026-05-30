export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const user = getUserFromRequest(request);
    if (!user) return res.error('No autorizado', 401);
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) return res.notFound('Reserva no encontrada');
    const isStaff = ['ADMIN', 'SECURITY'].includes(user.role);
    if (!isStaff && reservation.user_id !== user.sub) return res.error('No autorizado', 403);
    if (!['PENDING', 'CONFIRMED', 'ACTIVE'].includes(reservation.status)) return res.error('La reserva no puede cancelarse');

    const space = await prisma.parkingSpace.findUnique({ where: { id: reservation.space_id } });
    const ops = [prisma.reservation.update({ where: { id }, data: { status: 'CANCELLED' } })];

    // Solo liberar el espacio si estaba bloqueado por esta reserva (no si está ocupado por una sesión activa)
    if (space && space.status === 'RESERVED') {
      ops.push(prisma.parkingSpace.update({ where: { id: reservation.space_id }, data: { status: 'AVAILABLE' } }));
    }

    await prisma.$transaction(ops);

    return res.ok(null, 'Reserva cancelada');
  } catch (e) {
    return res.error(e.message);
  }
}
