import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O,0,I,1 para evitar confusión
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function uniqueSessionCode() {
  for (let i = 0; i < 10; i++) {
    const code = generateSessionCode();
    const exists = await prisma.parkingSession.findUnique({ where: { session_code: code } });
    if (!exists) return code;
  }
  throw new Error('No se pudo generar código único');
}

export async function POST(request) {
  try {
    const dto = await request.json();

    const vehicle = await prisma.vehicle.findFirst({ where: { id: dto.vehicle_id, deleted_at: null } });
    if (!vehicle) return res.notFound('Vehículo no encontrado');
    if (vehicle.blacklisted) return res.error('Vehículo en lista negra');

    const space = await prisma.parkingSpace.findUnique({ where: { id: dto.space_id } });
    if (!space) return res.notFound('Espacio no encontrado');
    if (space.status !== 'AVAILABLE') return res.error('Espacio no disponible');

    const existing = await prisma.parkingSession.findFirst({
      where: { vehicle_id: dto.vehicle_id, status: 'ACTIVE' },
    });
    if (existing) return res.error('El vehículo ya tiene una sesión activa');

    // Verificar evento activo con tarifa plana
    const now = new Date();
    const activeEvent = vehicle.user_id ? await prisma.parkingEvent.findFirst({
      where: { status: { in: ['ACTIVE', 'SCHEDULED'] }, start_time: { lte: now }, end_time: { gte: now } },
    }) : null;

    // Verificar si el usuario tiene suscripción activa
    const activeSub = vehicle.user_id ? await prisma.parkingSubscription.findFirst({
      where: { user_id: vehicle.user_id, status: 'ACTIVE', end_date: { gt: now } },
    }) : null;

    const session_code = await uniqueSessionCode();

    const sessionData = {
      session_code,
      vehicle_id: dto.vehicle_id,
      space_id: dto.space_id,
      user_id: vehicle.user_id,
      entry_method: dto.entry_method ?? 'MANUAL',
      operator_entry_id: dto.operator_id,
      status: 'ACTIVE',
      notes: activeEvent ? `Evento: ${activeEvent.name}` : null,
    };

    // Si tiene suscripción activa, marcar como pagado desde la entrada
    if (activeSub) {
      sessionData.amount_due = 0;
      sessionData.is_paid = true;
    } else if (activeEvent?.tariff_mode === 'FLAT_RATE') {
      sessionData.amount_due = parseFloat(activeEvent.flat_rate);
    }

    const [session] = await prisma.$transaction([
      prisma.parkingSession.create({
        data: sessionData,
        include: { vehicle: true, space: true, user: { select: { id: true, first_name: true, last_name: true } } },
      }),
      prisma.parkingSpace.update({ where: { id: dto.space_id }, data: { status: 'OCCUPIED' } }),
    ]);

    return res.created(session, 'Entrada registrada');
  } catch (e) {
    return res.error(e.message);
  }
}
