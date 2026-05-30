export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const event = await prisma.parkingEvent.findUnique({
      where: { id },
      include: { created_by: { select: { id: true, first_name: true, last_name: true } } },
    });
    if (!event) return res.notFound('Evento no encontrado');
    return res.ok(event);
  } catch (e) {
    return res.error(e.message);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'ADMIN') return res.error('Solo ADMIN puede modificar eventos', 403);

    const dto = await request.json();
    const event = await prisma.parkingEvent.findUnique({ where: { id } });
    if (!event) return res.notFound('Evento no encontrado');

    const updated = await prisma.parkingEvent.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.event_date && { event_date: new Date(dto.event_date) }),
        ...(dto.start_time && { start_time: new Date(dto.start_time) }),
        ...(dto.end_time && { end_time: new Date(dto.end_time) }),
        ...(dto.tariff_mode && { tariff_mode: dto.tariff_mode }),
        ...(dto.flat_rate !== undefined && { flat_rate: dto.flat_rate }),
        ...(dto.affected_zones && { affected_zones: dto.affected_zones }),
        ...(dto.status && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.uses_external_parking !== undefined && { uses_external_parking: dto.uses_external_parking }),
        ...(dto.external_parking_name !== undefined && { external_parking_name: dto.external_parking_name }),
        ...(dto.shuttle_available !== undefined && { shuttle_available: dto.shuttle_available }),
        ...(dto.capacity_override !== undefined && { capacity_override: dto.capacity_override }),
      },
    });

    return res.ok(updated, 'Evento actualizado');
  } catch (e) {
    return res.error(e.message);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'ADMIN') return res.error('Solo ADMIN puede cancelar eventos', 403);

    const event = await prisma.parkingEvent.findUnique({ where: { id } });
    if (!event) return res.notFound('Evento no encontrado');
    if (event.status === 'CANCELLED') return res.conflict('El evento ya está cancelado');

    await prisma.parkingEvent.update({ where: { id }, data: { status: 'CANCELLED' } });

    await prisma.auditLog.create({
      data: { user_id: user.sub, action: 'EVENT_CANCELLED', resource: 'parking_event', resource_id: id },
    });

    return res.ok(null, 'Evento cancelado');
  } catch (e) {
    return res.error(e.message);
  }
}
