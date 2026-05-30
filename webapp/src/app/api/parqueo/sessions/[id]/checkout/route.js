export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

const FALLBACK_RATES = { ADMIN: 0, TEACHER: 0, STUDENT: 5, VISITOR: 10, SECURITY: 0 };

async function getTariff(role) {
  try {
    const t = await prisma.tariffConfig.findUnique({ where: { role } });
    if (t) return { hourly_rate: parseFloat(t.hourly_rate), is_free: t.is_free, max_free_hours: t.max_free_hours };
  } catch {}
  return { hourly_rate: FALLBACK_RATES[role] ?? 5, is_free: FALLBACK_RATES[role] === 0, max_free_hours: null };
}

// GET — solo calcula el monto sin confirmar nada (dry-run)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const session = await prisma.parkingSession.findFirst({
      where: { id, status: 'ACTIVE' },
      include: { vehicle: true, space: true, user: true },
    });
    if (!session) return res.notFound('Sesión activa no encontrada');

    const now = new Date();
    const duration_minutes = Math.ceil((now.getTime() - session.entry_time.getTime()) / 60000);

    const activeSub = session.user_id ? await prisma.parkingSubscription.findFirst({
      where: { user_id: session.user_id, status: 'ACTIVE', end_date: { gt: now } },
    }) : null;

    let amount_due = 0;
    let is_free = false;

    if (activeSub || session.is_paid) {
      amount_due = 0; is_free = true;
    } else {
      const role = session.user?.role ?? 'STUDENT';
      const tariff = await getTariff(role);
      if (tariff.is_free) {
        if (tariff.max_free_hours && duration_minutes > tariff.max_free_hours * 60) {
          const excedente = duration_minutes - tariff.max_free_hours * 60;
          const studentT = await getTariff('STUDENT');
          amount_due = parseFloat(((excedente / 60) * studentT.hourly_rate).toFixed(2));
        } else {
          is_free = true;
        }
      } else {
        amount_due = parseFloat(((duration_minutes / 60) * tariff.hourly_rate).toFixed(2));
      }
    }

    return res.ok({
      session_id: session.id,
      session_code: session.session_code,
      duration_minutes,
      amount_due,
      is_free,
      is_paid: session.is_paid,
      vehicle: { placa: session.vehicle?.placa },
      user: session.user ? { first_name: session.user.first_name, last_name: session.user.last_name, role: session.user.role } : null,
    });
  } catch (e) {
    return res.error(e.message);
  }
}

// POST — confirma exit + pago de forma atómica
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const reqUser = getUserFromRequest(request);
    const dto = await request.json().catch(() => ({}));
    // payment_method requerido solo si hay monto; si es gratis puede omitirse
    const payment_method = dto.payment_method ?? 'CASH';

    const session = await prisma.parkingSession.findFirst({
      where: { id, status: 'ACTIVE' },
      include: { vehicle: true, space: true, user: true, payment: true },
    });
    if (!session) return res.notFound('Sesión activa no encontrada');
    if (session.payment) return res.error('Esta sesión ya tiene pago registrado');

    const exit_time = new Date();
    const duration_minutes = Math.ceil((exit_time.getTime() - session.entry_time.getTime()) / 60000);

    const activeEvent = await prisma.parkingEvent.findFirst({
      where: { status: { in: ['ACTIVE', 'SCHEDULED'] }, start_time: { lte: exit_time }, end_time: { gte: exit_time } },
    });
    const activeSub = session.user_id ? await prisma.parkingSubscription.findFirst({
      where: { user_id: session.user_id, status: 'ACTIVE', end_date: { gt: exit_time } },
    }) : null;

    let amount_due = 0;
    let is_paid = true;

    if (!activeSub && !session.is_paid) {
      if (activeEvent?.tariff_mode === 'FLAT_RATE') {
        amount_due = parseFloat(activeEvent.flat_rate);
        is_paid = false;
      } else {
        const role = session.user?.role ?? 'STUDENT';
        const tariff = await getTariff(role);
        if (tariff.is_free) {
          if (tariff.max_free_hours && duration_minutes > tariff.max_free_hours * 60) {
            const excedente = duration_minutes - tariff.max_free_hours * 60;
            const studentT = await getTariff('STUDENT');
            amount_due = parseFloat(((excedente / 60) * studentT.hourly_rate).toFixed(2));
            is_paid = false;
          }
        } else {
          amount_due = parseFloat(((duration_minutes / 60) * tariff.hourly_rate).toFixed(2));
          is_paid = false;
        }
      }
    }

    let user_id = reqUser?.sub ?? session.user_id;
    if (!user_id) {
      const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
      user_id = admin?.id;
    }

    const ops = [
      prisma.parkingSession.update({
        where: { id },
        data: { exit_time, duration_minutes, amount_due, is_paid: true, status: 'COMPLETED', operator_exit_id: reqUser?.sub },
      }),
      prisma.parkingSpace.update({ where: { id: session.space_id }, data: { status: 'AVAILABLE' } }),
    ];

    // Crear registro de pago si hay monto
    if (amount_due > 0) {
      ops.push(prisma.payment.create({
        data: {
          session_id: id,
          user_id,
          amount: amount_due,
          payment_method,
          status: 'COMPLETED',
        },
      }));
    }

    // Factura mensual
    if (session.user_id && !activeSub) {
      const month = exit_time.getMonth() + 1;
      const year  = exit_time.getFullYear();
      ops.push(prisma.monthlyBill.upsert({
        where: { user_id_month_year: { user_id: session.user_id, month, year } },
        create: { user_id: session.user_id, month, year, total_sessions: 1, total_minutes: duration_minutes, total_amount: amount_due, status: 'OPEN', due_date: new Date(year, month, 10) },
        update: { total_sessions: { increment: 1 }, total_minutes: { increment: duration_minutes }, total_amount: { increment: amount_due } },
      }));
    }

    await prisma.$transaction(ops);

    return res.ok({ amount_paid: amount_due, duration_minutes, payment_method }, 'Salida y pago registrados');
  } catch (e) {
    return res.error(e.message);
  }
}
