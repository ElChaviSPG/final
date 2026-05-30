export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    const dto = await request.json();
    const session = await prisma.parkingSession.findUnique({
      where: { id: dto.session_id },
      include: { payment: true },
    });
    if (!session) return res.notFound('Sesión no encontrada');
    if (session.payment) return res.error('Ya existe un pago para esta sesión');
    // Sesión ACTIVE con exit_time = esperando pago antes de completarse
    if (session.status === 'ACTIVE' && !session.exit_time) return res.error('La sesión aún está activa');

    // Resolve user_id: request token > session > admin fallback (kiosk is unauthenticated)
    let user_id = dto.user_id ?? user?.sub ?? session.user_id;
    if (!user_id) {
      const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
      user_id = admin?.id;
    }
    if (!user_id) return res.error('No se pudo determinar el usuario para el pago');

    // Si la sesión quedó ACTIVE esperando pago, completarla y liberar el espacio ahora
    const sessionUpdates = session.status === 'ACTIVE'
      ? { status: 'COMPLETED', is_paid: true }
      : { is_paid: true };

    const ops = [
      prisma.payment.create({
        data: {
          session_id: dto.session_id,
          user_id,
          amount: session.amount_due ?? 0,
          payment_method: dto.payment_method,
          transaction_reference: dto.transaction_reference ?? null,
          status: 'COMPLETED',
        },
      }),
      prisma.parkingSession.update({
        where: { id: dto.session_id },
        data: sessionUpdates,
      }),
    ];

    if (session.status === 'ACTIVE') {
      ops.push(prisma.parkingSpace.update({
        where: { id: session.space_id },
        data: { status: 'AVAILABLE' },
      }));
    }

    const [payment] = await prisma.$transaction(ops);

    return res.created(payment, 'Pago confirmado');
  } catch (e) {
    return res.error(e.message);
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const user_id = searchParams.get('user_id');
  const status = searchParams.get('status');

  try {
    const where = {};
    if (user_id) where.user_id = user_id;
    if (status) where.status = status;

    const [total, data] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { session: { include: { vehicle: true, space: true } }, user: { select: { id: true, first_name: true, last_name: true, email: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return res.ok({ total, page, limit, data });
  } catch (e) {
    return res.error(e.message);
  }
}
