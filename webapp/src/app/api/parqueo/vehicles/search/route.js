export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const plate = searchParams.get('plate');
  if (!plate) return res.error('plate requerido');

  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { placa: { contains: plate.toUpperCase() }, deleted_at: null },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, email: true, role: true } },
        sessions: { where: { status: 'ACTIVE' }, take: 1, include: { space: true } },
      },
    });
    if (!vehicle) return res.notFound('Vehículo no encontrado');
    return res.ok({ ...vehicle, active_session: vehicle.sessions[0] ?? null });
  } catch (e) {
    return res.error(e.message);
  }
}
