export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const plate = searchParams.get('plate');

    if (plate) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { placa: { contains: plate.toUpperCase() }, deleted_at: null },
        include: {
          user: { select: { id: true, first_name: true, last_name: true, email: true, role: true } },
          sessions: { where: { status: 'ACTIVE' }, take: 1, include: { space: true } },
        },
      });
      if (!vehicle) return res.notFound('Vehículo no encontrado');
      return res.ok({ ...vehicle, active_session: vehicle.sessions[0] ?? null });
    }

    const v = await prisma.vehicle.findFirst({
      where: { id, deleted_at: null },
      include: { user: { select: { id: true, first_name: true, last_name: true, email: true, role: true } } },
    });
    if (!v) return res.notFound('Vehículo no encontrado');
    return res.ok(v);
  } catch (e) {
    return res.error(e.message);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const dto = await request.json();
    const vehicle = await prisma.vehicle.update({ where: { id }, data: dto });
    return res.ok(vehicle, 'Vehículo actualizado');
  } catch (e) {
    return res.error(e.message);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.vehicle.update({ where: { id }, data: { deleted_at: new Date() } });
    return res.ok(null, 'Vehículo eliminado');
  } catch (e) {
    return res.error(e.message);
  }
}
