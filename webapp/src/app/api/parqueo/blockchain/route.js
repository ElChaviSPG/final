export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page   = parseInt(searchParams.get('page')   ?? '1');
  const limit  = parseInt(searchParams.get('limit')  ?? '20');
  const status = searchParams.get('status');
  const action = searchParams.get('action');

  try {
    const where = {};
    if (status) where.status = status;
    if (action) where.action = action;

    const [total, confirmed, failed, data] = await Promise.all([
      prisma.blockchainAudit.count(),
      prisma.blockchainAudit.count({ where: { status: 'CONFIRMED' } }),
      prisma.blockchainAudit.count({ where: { status: 'FAILED' } }),
      prisma.blockchainAudit.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          session: {
            select: {
              session_code: true,
              entry_time: true,
              vehicle: { select: { placa: true } },
              user: { select: { first_name: true, last_name: true, role: true } },
            },
          },
        },
      }),
    ]);

    return res.ok({ total, confirmed, failed, page, limit, data });
  } catch (e) {
    return res.error(e.message);
  }
}
