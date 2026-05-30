export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const user = getUserFromRequest(request);
    if (!user) return res.error('No autorizado', 401);
    const { reason } = await request.json();
    if (!reason?.trim()) return res.error('El motivo es obligatorio', 422);
    const addedByUserId = user.sub;

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, deleted_at: null },
      include: { user: { select: { id: true, first_name: true } } },
    });
    if (!vehicle) return res.notFound('Vehículo no encontrado');

    await prisma.$transaction([
      prisma.vehicle.update({ where: { id }, data: { blacklisted: true, blacklist_reason: reason } }),
      prisma.blacklist.create({ data: { vehicle_id: id, reason, added_by_user_id: addedByUserId } }),
    ]);

    // Notificar al propietario del vehículo
    if (vehicle.user_id) {
      await prisma.notification.create({
        data: {
          user_id: vehicle.user_id,
          title: 'Vehículo bloqueado',
          message: `Tu vehículo con placa ${vehicle.placa} ha sido agregado a la lista negra. Motivo: ${reason || 'No especificado'}. Contacta a seguridad para más información.`,
          type: 'INVALID_ACCESS',
        },
      }).catch(() => {});
    }

    return res.ok(null, 'Vehículo en lista negra');
  } catch (e) {
    return res.error(e.message);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const user = getUserFromRequest(request);
    if (!user) return res.error('No autorizado', 401);
    const removedByUserId = user.sub;

    const entry = await prisma.blacklist.findFirst({ where: { vehicle_id: id, is_active: true } });
    if (!entry) return res.notFound('Entrada en blacklist no encontrada');

    const vehicle = await prisma.vehicle.findUnique({ where: { id }, select: { placa: true, user_id: true } });

    await prisma.$transaction([
      prisma.blacklist.update({
        where: { id: entry.id },
        data: { is_active: false, removed_at: new Date(), removed_by_user_id: removedByUserId },
      }),
      prisma.vehicle.update({ where: { id }, data: { blacklisted: false, blacklist_reason: null } }),
    ]);

    // Notificar al propietario que fue removido
    if (vehicle?.user_id) {
      await prisma.notification.create({
        data: {
          user_id: vehicle.user_id,
          title: 'Vehículo desbloqueado',
          message: `Tu vehículo con placa ${vehicle.placa} ha sido removido de la lista negra y puede acceder al campus nuevamente.`,
          type: 'INVALID_ACCESS',
        },
      }).catch(() => {});
    }

    return res.ok(null, 'Vehículo removido de lista negra');
  } catch (e) {
    return res.error(e.message);
  }
}
