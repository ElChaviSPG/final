export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { getUserFromRequest } from '@/lib/jwt';

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    const dto = await request.json();
    let generatedByUserId = user?.sub ?? null;
    if (!generatedByUserId) {
      const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
      generatedByUserId = admin?.id ?? null;
    }

    const valid_hours = dto.valid_hours ?? 24;
    const qr_code = `VIS-${uuidv4()}`;
    const expires_at = new Date(Date.now() + valid_hours * 3600 * 1000);
    const qr_image = await QRCode.toDataURL(qr_code, { width: 300, margin: 2 });

    const visitor = await prisma.visitorQR.create({
      data: {
        qr_code,
        visitor_name: dto.visitor_name,
        vehicle_plate: dto.vehicle_plate.toUpperCase(),
        purpose: JSON.stringify({ brand: dto.vehicle_brand, model: dto.vehicle_model, color: dto.vehicle_color }),
        expires_at,
        generated_by_user_id: generatedByUserId,
      },
    });

    return res.created({ ...visitor, qr_image }, 'QR de visitante generado');
  } catch (e) {
    return res.error(e.message);
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');

  try {
    const [total, data] = await Promise.all([
      prisma.visitorQR.count(),
      prisma.visitorQR.findMany({
        skip: (page - 1) * limit, take: limit,
        include: { generated_by: { select: { id: true, first_name: true, last_name: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return res.ok({ total, page, limit, data });
  } catch (e) {
    return res.error(e.message);
  }
}
