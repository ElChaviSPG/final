export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return res.error('No autorizado', 401);
    const dto = await request.json();
    const isAdmin = user.role === 'ADMIN';
    const user_id = (isAdmin && dto.user_id) ? dto.user_id : user.sub;
    if (!user_id) return res.error('No se pudo determinar el usuario');

    const start = new Date(dto.start_time);
    const end = new Date(dto.end_time);
    if (end <= start) return res.error('La hora de fin debe ser posterior al inicio');
    // Reservas de tipo EVENT pueden tener inicio en el pasado (evento ya empezó)
    // Para otras: tolerancia de 2 min por latencia de red
    if (dto.type !== 'EVENT' && start < new Date(Date.now() - 120_000)) {
      return res.error('No se puede reservar en el pasado');
    }
    if (end < new Date()) return res.error('La hora de fin ya pasó');

    const space = await prisma.parkingSpace.findUnique({ where: { id: dto.space_id } });
    if (!space) return res.notFound('Espacio no encontrado');
    if (!space.is_active) return res.error('Espacio inactivo');

    const conflict = await prisma.reservation.findFirst({
      where: {
        space_id: dto.space_id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        OR: [{ start_time: { lt: end }, end_time: { gt: start } }],
      },
    });
    if (conflict) return res.conflict('Espacio ya reservado en ese horario');

    if (dto.vehicle_id) {
      const vehicle = await prisma.vehicle.findFirst({ where: { id: dto.vehicle_id, deleted_at: null } });
      if (!vehicle) return res.notFound('Vehículo no encontrado');
    }

    const reservation = await prisma.reservation.create({
      data: {
        user_id,
        vehicle_id: dto.vehicle_id,
        space_id: dto.space_id,
        start_time: start,
        end_time: end,
        type: dto.type ?? 'STANDARD',
        notes: dto.notes,
        status: 'CONFIRMED',
      },
      include: { space: true, vehicle: true },
    });

    // Bloquear espacio:
    // - Eventos: siempre marcar RESERVED (el admin bloqueó el espacio intencionalmente)
    // - Otros: solo si empieza en los próximos 30 min
    const minutesUntilStart = (start - Date.now()) / 60000;
    if (dto.type === 'EVENT' || minutesUntilStart <= 30) {
      await prisma.parkingSpace.update({ where: { id: dto.space_id }, data: { status: 'RESERVED' } });
    }

    return res.created(reservation, 'Reserva creada');
  } catch (e) {
    return res.error(e.message);
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const user = getUserFromRequest(request);
  const user_id = searchParams.get('user_id') ?? user?.sub;
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');

  try {
    const where = {};
    const [total, data] = await Promise.all([
      prisma.reservation.count({ where }),
      prisma.reservation.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { space: true, vehicle: true, user: { select: { qr_code: true } } },
        orderBy: { start_time: 'desc' },
      }),
    ]);
    return res.ok({ total, page, limit, data });
  } catch (e) {
    return res.error(e.message);
  }
}
