export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const session = await prisma.parkingSession.findUnique({
      where: { id },
      include: {
        vehicle: true, space: true,
        user: { select: { id: true, first_name: true, last_name: true, email: true } },
        payment: true,
      },
    });
    if (!session) return res.notFound('Sesión no encontrada');
    return res.ok(session);
  } catch (e) {
    return res.error(e.message);
  }
}
