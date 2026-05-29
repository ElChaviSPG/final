import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const sub = await prisma.parkingSubscription.findUnique({
      where: { id },
      include: { user: { select: { id: true, first_name: true, last_name: true, carnet: true, email: true } } },
    });
    if (!sub) return res.notFound('Suscripción no encontrada');
    return res.ok(sub);
  } catch (e) {
    return res.error(e.message);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const user = getUserFromRequest(request);
    if (!user || !['ADMIN'].includes(user.role)) return res.error('Solo ADMIN puede cancelar suscripciones', 403);

    const sub = await prisma.parkingSubscription.findUnique({ where: { id } });
    if (!sub) return res.notFound('Suscripción no encontrada');
    if (sub.status === 'CANCELLED') return res.conflict('Ya está cancelada');

    const updated = await prisma.parkingSubscription.update({
      where: { id },
      data: { status: 'CANCELLED', updated_at: new Date() },
    });

    const typeLabel = sub.type === 'MONTHLY' ? 'mensual' : sub.type === 'TRIMESTRAL' ? 'trimestral' : 'semestral';
    await Promise.all([
      prisma.auditLog.create({
        data: { user_id: user.sub, action: 'SUBSCRIPTION_CANCELLED', resource: 'parking_subscription', resource_id: id },
      }),
      prisma.notification.create({
        data: {
          user_id: sub.user_id,
          type: 'SYSTEM_ALERT',
          title: 'Suscripción de parqueo cancelada',
          message: `Tu suscripción ${typeLabel} de parqueo fue cancelada. A partir de ahora se aplicará tarifa normal por uso.`,
          metadata: { subscription_id: id, cancelled_by: user.sub },
        },
      }),
    ]);

    return res.ok(updated, 'Suscripción cancelada');
  } catch (e) {
    return res.error(e.message);
  }
}
