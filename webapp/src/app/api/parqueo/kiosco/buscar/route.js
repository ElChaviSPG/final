import prisma from "@/lib/prisma";
import * as res from "@/lib/response";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const placa = searchParams.get("placa")?.toUpperCase().trim();
    if (!placa) return res.error("Placa requerida");

    const vehicle = await prisma.vehicle.findFirst({
      where: { placa, deleted_at: null },
      include: { user: { select: { first_name: true, last_name: true, role: true } } },
    });

    if (!vehicle) return res.notFound("Vehículo no registrado en el sistema");

    const session = await prisma.parkingSession.findFirst({
      where: { vehicle_id: vehicle.id, status: "ACTIVE" },
      include: { space: true },
      orderBy: { entry_time: "desc" },
    });

    if (!session) {
      return res.ok({
        found: false,
        placa,
        vehicle: { brand: vehicle.brand, model: vehicle.model, color: vehicle.color },
        owner: vehicle.user ? `${vehicle.user.first_name} ${vehicle.user.last_name}` : "—",
      });
    }

    const minutes = Math.ceil((Date.now() - new Date(session.entry_time).getTime()) / 60000);

    return res.ok({
      found: true,
      placa,
      vehicle: { brand: vehicle.brand, model: vehicle.model, color: vehicle.color },
      owner: vehicle.user ? `${vehicle.user.first_name} ${vehicle.user.last_name}` : "—",
      role: vehicle.user?.role ?? "VISITOR",
      session: {
        id: session.id,
        space_code: session.space?.code,
        zone: session.space?.zone,
        entry_time: session.entry_time,
        duration_minutes: minutes,
      },
    });
  } catch (e) {
    return res.error(e.message);
  }
}
