export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return res.unauthorized();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '12');

    const where = { user_id: user.sub };

    const [total, data] = await Promise.all([
      prisma.monthlyBill.count({ where }),
      prisma.monthlyBill.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
    ]);

    return res.ok({ total, page, limit, data });
  } catch (e) {
    return res.error(e.message);
  }
}
