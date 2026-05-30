export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const bill = await prisma.monthlyBill.findUnique({
      where: { id },
      include: { user: { select: { id: true, first_name: true, last_name: true, carnet: true, email: true } } },
    });
    if (!bill) return res.notFound('Factura no encontrada');
    return res.ok(bill);
  } catch (e) {
    return res.error(e.message);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const user = getUserFromRequest(request);
    if (!user) return res.unauthorized();

    const bill = await prisma.monthlyBill.findUnique({ where: { id } });
    if (!bill) return res.notFound('Factura no encontrada');

    const isAdmin = user.role === 'ADMIN';
    const isOwner = bill.user_id === user.sub;
    if (!isAdmin && !isOwner) return res.error('No autorizado', 403);
    if (bill.status === 'PAID') return res.conflict('La factura ya está pagada');

    const dto = await request.json();
    const updated = await prisma.monthlyBill.update({
      where: { id },
      data: {
        status: 'PAID',
        paid_at: new Date(),
        payment_reference: dto.payment_reference ?? null,
      },
    });

    await prisma.auditLog.create({
      data: { user_id: user.sub, action: 'BILL_PAID', resource: 'monthly_bill', resource_id: id, metadata: { payment_reference: dto.payment_reference } },
    });

    return res.ok(updated, 'Factura marcada como pagada');
  } catch (e) {
    return res.error(e.message);
  }
}
