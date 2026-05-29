import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const blacklisted = searchParams.get('blacklisted');
  const search = searchParams.get('search');

  try {
    const where = { deleted_at: null };
    if (blacklisted !== null && blacklisted !== undefined) where.blacklisted = blacklisted === 'true';
    if (search) where.placa = { contains: search.toUpperCase() };

    const [total, vehicles] = await Promise.all([
      prisma.vehicle.count({ where }),
      prisma.vehicle.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: {
          user: { select: { id: true, first_name: true, last_name: true, email: true, role: true, carnet: true } },
          blacklist_entries: blacklisted === 'true'
            ? { where: { is_active: true }, select: { created_at: true }, take: 1, orderBy: { created_at: 'desc' } }
            : false,
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return res.ok({ total, page, limit, data: vehicles });
  } catch (e) {
    return res.error(e.message);
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    const dto = await request.json();
    const placa = dto.placa.toUpperCase().replace(/\s/g, '');
    const exists = await prisma.vehicle.findUnique({ where: { placa } });
    if (exists) return res.conflict('Placa ya registrada');

    let userId = dto.user_id ?? user?.sub ?? null;
    if (!userId && dto.owner_carnet) {
      const owner = await prisma.user.findFirst({ where: { carnet: dto.owner_carnet, deleted_at: null } });
      if (owner) userId = owner.id;
    }
    if (!userId) return res.error('No se encontró el propietario. Verifica el carnet o inicia sesión.', 422);

    const { owner_carnet, type, ...rest } = dto;
    const vehicle = await prisma.vehicle.create({ data: { ...rest, placa, user_id: userId } });
    return res.created(vehicle, 'Vehículo registrado');
  } catch (e) {
    return res.error(e.message);
  }
}
