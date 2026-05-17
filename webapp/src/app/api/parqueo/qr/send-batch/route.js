import { NextResponse } from "next/server";
import { Resend } from "resend";
import QRCode from "qrcode";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { email, reservations } = await request.json();

    if (!email || !reservations?.length) {
      return NextResponse.json({ error: "Email y reservas son requeridos." }, { status: 400 });
    }

    // Generar QR para cada reserva
    const attachments = [];
    const qrImgTags   = [];

    for (const r of reservations) {
      const qrData = JSON.stringify({
        reservationId: r.id,
        spaceCode:     r.spaceCode,
        zone:          r.zone,
        startTime:     r.startTime,
        endTime:       r.endTime,
        type:          r.type,
      });

      const base64 = await QRCode.toDataURL(qrData, {
        width: 240, margin: 2,
        color: { dark: "#800020", light: "#ffffff" },
      });

      const cid    = `qr-${r.id}`;
      const buffer = Buffer.from(base64.replace(/^data:image\/png;base64,/, ""), "base64");

      attachments.push({ filename: `qr-${r.spaceCode}.png`, content: buffer, contentType: "image/png", contentId: cid });

      qrImgTags.push(`
        <tr>
          <td style="padding:16px;border-bottom:1px solid #eee;vertical-align:top;width:60%;">
            <div style="font-weight:700;font-size:15px;color:#800020;margin-bottom:4px;">${r.spaceCode}</div>
            <div style="font-size:13px;color:#555;margin-bottom:2px;">Zona ${r.zone}</div>
            <div style="font-size:12px;color:#888;">Inicio: ${r.startTimeFormatted}</div>
            <div style="font-size:12px;color:#888;">Fin: &nbsp;&nbsp;&nbsp; ${r.endTimeFormatted}</div>
            ${r.eventName ? `<div style="font-size:12px;color:#888;margin-top:4px;">Evento: ${r.eventName}</div>` : ""}
          </td>
          <td style="padding:16px;border-bottom:1px solid #eee;text-align:center;width:40%;">
            <img src="cid:${cid}" alt="QR ${r.spaceCode}" style="width:120px;height:120px;border:3px solid #800020;border-radius:6px;" />
          </td>
        </tr>
      `);
    }

    const recipient = process.env.RESEND_TO_OVERRIDE || email;

    const { error } = await resend.emails.send({
      from:    "Parqueo USPG <onboarding@resend.dev>",
      to:      [recipient],
      subject: `${reservations.length} QR${reservations.length > 1 ? "s" : ""} de reserva — Parqueo USPG`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;border:1px solid #e5e5e5;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="background:#800020;display:inline-block;padding:12px 28px;border-radius:8px;">
              <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:1px;">PARQUEO USPG</span>
            </div>
          </div>

          <h2 style="color:#800020;margin:0 0 6px;font-size:18px;">Tus códigos QR de acceso</h2>
          <p style="color:#555;margin:0 0 20px;font-size:14px;">
            Se adjuntan ${reservations.length} código${reservations.length > 1 ? "s" : ""} QR. Preséntalo${reservations.length > 1 ? "s" : ""} al ingresar al campus.
          </p>

          <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#f9f0f2;">
                <th style="padding:10px 16px;font-size:12px;color:#800020;text-align:left;font-weight:700;">Espacio / Detalles</th>
                <th style="padding:10px 16px;font-size:12px;color:#800020;text-align:center;font-weight:700;">Código QR</th>
              </tr>
            </thead>
            <tbody>
              ${qrImgTags.join("")}
            </tbody>
          </table>

          <p style="color:#aaa;font-size:12px;text-align:center;margin-top:24px;margin-bottom:0;">
            Universidad San Pablo Guatemala · Sistema de Parqueo
          </p>
        </div>
      `,
      attachments,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("send-batch error:", err);
    return NextResponse.json({ error: "Error interno al enviar el correo." }, { status: 500 });
  }
}
