export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

const FALLBACK_RATES = {
  ADMIN: 0, TEACHER: 0, STUDENT: 5, VISITOR: 10, SECURITY: 0,
};

async function getTariff(role) {
  try {
    const t = await (await import('@/lib/prisma')).default.tariffConfig.findUnique({ where: { role } });
    if (t) return { hourly_rate: parseFloat(t.hourly_rate), is_free: t.is_free, max_free_hours: t.max_free_hours };
  } catch {}
  return { hourly_rate: FALLBACK_RATES[role] ?? 5, is_free: FALLBACK_RATES[role] === 0, max_free_hours: null };
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const dto = await request.json().catch(() => ({}));

    const session = await prisma.parkingSession.findFirst({
      where: { id, status: 'ACTIVE' },
      include: { vehicle: true, space: true, user: true },
    });
    if (!session) return res.notFound('Sesión activa no encontrada');

    const exit_time = new Date();
    const duration_minutes = Math.ceil((exit_time.getTime() - session.entry_time.getTime()) / 60000);

    // Verificar evento activo con tarifa plana
    const activeEvent = await prisma.parkingEvent.findFirst({
      where: { status: { in: ['ACTIVE', 'SCHEDULED'] }, start_time: { lte: exit_time }, end_time: { gte: exit_time } },
    });

    // Verificar suscripción activa del usuario
    const activeSub = session.user_id ? await prisma.parkingSubscription.findFirst({
      where: { user_id: session.user_id, status: 'ACTIVE', end_date: { gt: exit_time } },
    }) : null;

    let amount_due;
    let is_paid = session.is_paid;

    if (activeSub) {
      amount_due = 0;
      is_paid = true;
    } else if (activeEvent?.tariff_mode === 'FLAT_RATE') {
      amount_due = parseFloat(activeEvent.flat_rate);
    } else {
      const role = session.user?.role ?? 'STUDENT';
      const tariff = await getTariff(role);
      if (tariff.is_free) {
        // Docentes: gratis hasta max_free_hours, luego cobra tarifa de estudiante
        if (tariff.max_free_hours && duration_minutes > tariff.max_free_hours * 60) {
          const excedente = duration_minutes - tariff.max_free_hours * 60;
          const studentTariff = await getTariff('STUDENT');
          amount_due = parseFloat(((excedente / 60) * studentTariff.hourly_rate).toFixed(2));
        } else {
          amount_due = 0;
          is_paid = true;
        }
      } else {
        amount_due = parseFloat(((duration_minutes / 60) * tariff.hourly_rate).toFixed(2));
      }
    }

    const ops = [
      prisma.parkingSession.update({
        where: { id },
        data: { exit_time, duration_minutes, amount_due, is_paid, status: 'COMPLETED', operator_exit_id: dto?.operator_id },
        include: { vehicle: true, space: true },
      }),
      prisma.parkingSpace.update({ where: { id: session.space_id }, data: { status: 'AVAILABLE' } }),
    ];

    // Actualizar o crear factura mensual si no tiene suscripción
    if (session.user_id && !activeSub) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const dueDate = new Date(year, month, 10); // vence el 10 del mes siguiente

      ops.push(
        prisma.monthlyBill.upsert({
          where: { user_id_month_year: { user_id: session.user_id, month, year } },
          create: {
            user_id: session.user_id,
            month,
            year,
            total_sessions: 1,
            total_minutes: duration_minutes,
            total_amount: amount_due,
            status: 'OPEN',
            due_date: dueDate,
          },
          update: {
            total_sessions: { increment: 1 },
            total_minutes: { increment: duration_minutes },
            total_amount: { increment: amount_due },
          },
        })
      );
    }

    const [updated] = await prisma.$transaction(ops);

    return res.ok(updated, 'Salida registrada');
  } catch (e) {
    return res.error(e.message);
  }
}
