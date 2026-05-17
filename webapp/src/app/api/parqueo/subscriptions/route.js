import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';
import { reactivateUser } from '@/lib/subscriptionJob';

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const user_id = searchParams.get('user_id');

    const isStaff = user && ['ADMIN', 'SECURITY'].includes(user.role);

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    if (isStaff) {
      if (user_id) where.user_id = user_id;
    } else if (user) {
      where.user_id = user.sub;
    } else {
      return res.ok({ total: 0, page, limit, data: [] });
    }

    const [total, data] = await Promise.all([
      prisma.parkingSubscription.count({ where }),
      prisma.parkingSubscription.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { user: { select: { id: true, first_name: true, last_name: true, carnet: true, email: true } } },
        orderBy: { created_at: 'desc' },
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
    const dto = await request.json();

    const target_user_id = dto.user_id ?? user?.sub;
    if (!target_user_id) return res.error('Se requiere user_id');

    const existing = await prisma.parkingSubscription.findFirst({
      where: { user_id: target_user_id, status: 'ACTIVE', end_date: { gt: new Date() } },
    });
    if (existing) return res.conflict('El usuario ya tiene una suscripción activa');

    const start = new Date(dto.start_date ?? Date.now());
    const days = dto.type === 'SEMESTER' ? 180 : 30;
    const end_date = new Date(start.getTime() + days * 86400000);

    const subscription = await prisma.parkingSubscription.create({
      data: {
        user_id: target_user_id,
        type: dto.type,
        status: 'ACTIVE',
        start_date: start,
        end_date,
        amount_paid: dto.amount_paid ?? 0,
        payment_reference: dto.payment_reference ?? null,
        auto_renew: dto.auto_renew ?? false,
      },
    });

    await Promise.all([
      prisma.auditLog.create({
        data: {
          user_id: user?.sub ?? target_user_id,
          action: 'SUBSCRIPTION_CREATED',
          resource: 'parking_subscription',
          resource_id: subscription.id,
          metadata: { type: dto.type, end_date: end_date.toISOString() },
        },
      }),
      // Reactivar usuario si estaba bloqueado por suscripción vencida
      reactivateUser(target_user_id),
    ]);

    return res.created(subscription, 'Suscripción creada');
  } catch (e) {
    return res.error(e.message);
  }
}
