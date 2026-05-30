export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    await prisma.vehicle.update({ where: { id }, data: { is_authorized: false } });
    return res.ok(null, 'Vehículo desautorizado');
  } catch (e) {
    return res.error(e.message);
  }
}
