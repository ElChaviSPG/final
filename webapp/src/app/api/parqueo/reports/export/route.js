export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const end = to ? new Date(to) : new Date();

    if (type === 'sessions') {
      const data = await prisma.parkingSession.findMany({
        where: { entry_time: { gte: start, lte: end } },
        include: { vehicle: true, space: true, user: { select: { first_name: true, last_name: true, email: true } } },
        orderBy: { entry_time: 'desc' },
      });
      return res.ok({ type, from: start, to: end, count: data.length, data });
    }

    if (type === 'payments') {
      const data = await prisma.payment.findMany({
        where: { created_at: { gte: start, lte: end } },
        include: { user: { select: { first_name: true, last_name: true, email: true } } },
        orderBy: { created_at: 'desc' },
      });
      return res.ok({ type, from: start, to: end, count: data.length, data });
    }

    return res.error('Tipo de exportación no soportado');
  } catch (e) {
    return res.error(e.message);
  }
}
