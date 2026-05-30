export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    await prisma.vehicle.update({ where: { id }, data: { is_authorized: true } });
    return res.ok(null, 'Vehículo autorizado');
  } catch (e) {
    return res.error(e.message);
  }
}
