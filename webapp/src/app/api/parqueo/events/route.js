export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const status = searchParams.get('status');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    const where = {};
    if (status) where.status = status;
    if (date_from || date_to) {
      where.event_date = {};
      if (date_from) where.event_date.gte = new Date(date_from);
      if (date_to) where.event_date.lte = new Date(date_to);
    }

    const [total, data] = await Promise.all([
      prisma.parkingEvent.count({ where }),
      prisma.parkingEvent.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { created_by: { select: { id: true, first_name: true, last_name: true } } },
        orderBy: { event_date: 'desc' },
      }),
    ]);

    return res.ok({ total, page, limit, data });
  } catch (e) {
    return res.error(e.message);
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'ADMIN') return res.error('Solo ADMIN puede crear eventos', 403);

    const dto = await request.json();

    if (!dto.name || !dto.event_date || !dto.start_time || !dto.end_time || !dto.tariff_mode || !dto.affected_zones) {
      return res.error('Faltan campos requeridos: name, event_date, start_time, end_time, tariff_mode, affected_zones');
    }
    if (dto.tariff_mode === 'FLAT_RATE' && !dto.flat_rate) {
      return res.error('flat_rate es requerido cuando tariff_mode es FLAT_RATE');
    }

    const event = await prisma.parkingEvent.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        event_date: new Date(dto.event_date),
        start_time: new Date(dto.start_time),
        end_time: new Date(dto.end_time),
        tariff_mode: dto.tariff_mode,
        flat_rate: dto.flat_rate ?? null,
        affected_zones: dto.affected_zones,
        status: dto.status ?? 'SCHEDULED',
        created_by_user_id: user.sub,
        notes: dto.notes ?? null,
        uses_external_parking: dto.uses_external_parking ?? false,
        external_parking_name: dto.external_parking_name ?? null,
        shuttle_available: dto.shuttle_available ?? false,
        capacity_override: dto.capacity_override ?? null,
      },
    });

    await prisma.auditLog.create({
      data: { user_id: user.sub, action: 'EVENT_CREATED', resource: 'parking_event', resource_id: event.id, metadata: { name: dto.name } },
    });

    return res.created(event, 'Evento creado');
  } catch (e) {
    return res.error(e.message);
  }
}
