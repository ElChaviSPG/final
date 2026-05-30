export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !['ADMIN'].includes(user.role)) return res.error('Solo ADMIN puede ver todas las facturas', 403);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const user_id = searchParams.get('user_id');

    const where = {};
    if (status) where.status = status;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (user_id) where.user_id = user_id;

    const [total, data] = await Promise.all([
      prisma.monthlyBill.count({ where }),
      prisma.monthlyBill.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { user: { select: { id: true, first_name: true, last_name: true, carnet: true, email: true } } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
    ]);

    return res.ok({ total, page, limit, data });
  } catch (e) {
    return res.error(e.message);
  }
}
