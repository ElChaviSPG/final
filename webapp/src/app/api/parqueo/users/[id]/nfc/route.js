import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { nfc_card_id } = await request.json();

    // Only check uniqueness when assigning (not when removing)
    if (nfc_card_id) {
      const existing = await prisma.user.findUnique({ where: { nfc_card_id } });
      if (existing && existing.id !== id) return res.conflict('NFC ya asignada a otro usuario');
    }

    await prisma.user.update({ where: { id }, data: { nfc_card_id: nfc_card_id ?? null } });
    return res.ok(null, nfc_card_id ? 'NFC asignada' : 'NFC removida');
  } catch (e) {
    return res.error(e.message);
  }
}
