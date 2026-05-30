export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET() {
  try {
    const sessions = await prisma.parkingSession.findMany({
      where: { status: 'ACTIVE' },
      include: {
        vehicle: true,
        space: true,
        user: { select: { id: true, first_name: true, last_name: true, role: true } },
      },
      orderBy: { entry_time: 'asc' },
    });
    return res.ok({ count: sessions.length, sessions });
  } catch (e) {
    return res.error(e.message);
  }
}
