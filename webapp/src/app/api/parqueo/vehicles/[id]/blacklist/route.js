import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const user = getUserFromRequest(request);
    const { reason } = await request.json();
    const addedByUserId = user?.sub ?? null;

    const vehicle = await prisma.vehicle.findFirst({ where: { id, deleted_at: null } });
    if (!vehicle) return res.notFound('Vehículo no encontrado');

    await prisma.$transaction([
      prisma.vehicle.update({ where: { id }, data: { blacklisted: true, blacklist_reason: reason } }),
      prisma.blacklist.create({ data: { vehicle_id: id, reason, added_by_user_id: addedByUserId } }),
    ]);

    return res.ok(null, 'Vehículo en lista negra');
  } catch (e) {
    return res.error(e.message);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const user = getUserFromRequest(request);
    const removedByUserId = user?.sub ?? null;

    const entry = await prisma.blacklist.findFirst({ where: { vehicle_id: id, is_active: true } });
    if (!entry) return res.notFound('Entrada en blacklist no encontrada');

    await prisma.$transaction([
      prisma.blacklist.update({
        where: { id: entry.id },
        data: { is_active: false, removed_at: new Date(), removed_by_user_id: removedByUserId },
      }),
      prisma.vehicle.update({ where: { id }, data: { blacklisted: false, blacklist_reason: null } }),
    ]);

    return res.ok(null, 'Vehículo removido de lista negra');
  } catch (e) {
    return res.error(e.message);
  }
}
