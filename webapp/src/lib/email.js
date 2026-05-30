import nodemailer from "nodemailer";
import QRCode from "qrcode";

/**
 * Crea el transporter de Gmail usando App Password.
 * Requiere en .env:
 *   GMAIL_USER=tucorreo@gmail.com
 *   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
 */
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

/**
 * Genera un QR como Data URL (base64 PNG) a partir del carnet.
 * El contenido del QR es el carnet del alumno.
 */
async function generateQRDataURL(carnet) {
  return await QRCode.toDataURL(carnet, {
    width: 300,
    margin: 2,
    color: {
      dark: "#1a1a2e",
      light: "#ffffff",
    },
  });
}

/**
 * Envía el correo de bienvenida con el QR adjunto al alumno recién creado.
 *
 * @param {{ nombre: string, apellido: string, email: string, carnet: string, correoInstitucional?: string }} alumno
 */
export async function enviarCorreoBienvenidaConQR(alumno) {
  const { nombre, apellido, email, carnet, correoInstitucional } = alumno;

  // Generate QR as base64 data URL
  const qrDataURL = await generateQRDataURL(carnet);

  // Extract base64 content (remove "data:image/png;base64," prefix)
  const qrBase64 = qrDataURL.replace(/^data:image\/png;base64,/, "");

  const transporter = createTransporter();

  const mailOptions = {
    from: `"Sistema Académico USPG" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Bienvenido/a al Sistema Académico USPG — Carnet ${carnet}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Sistema Académico USPG</h1>
        </div>

        <div style="background: #f8f9fa; padding: 30px; border: 1px solid #dee2e6;">
          <h2 style="color: #1a1a2e;">¡Bienvenido/a, ${nombre} ${apellido}!</h2>

          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Tu cuenta ha sido creada exitosamente en el Sistema Académico de la
            Universidad San Pablo de Guatemala.
          </p>

          <div style="background: #ffffff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 14px;">Nombre completo</td>
                <td style="padding: 8px 0; color: #1a1a2e; font-weight: bold;">${nombre} ${apellido}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 14px;">Número de carnet</td>
                <td style="padding: 8px 0; color: #1a1a2e; font-weight: bold; font-size: 18px;">${carnet}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 14px;">Correo registrado</td>
                <td style="padding: 8px 0; color: #1a1a2e;">${email}</td>
              </tr>
              ${correoInstitucional ? `
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 14px;">Correo institucional</td>
                <td style="padding: 8px 0; color: #1a1a2e; font-weight: bold;">${correoInstitucional}</td>
              </tr>` : ""}
            </table>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #555; font-size: 14px; margin-bottom: 15px;">
              Tu código QR único — preséntalo para identificarte en el campus:
            </p>
            <img
              src="cid:qr-carnet"
              alt="Código QR — Carnet ${carnet}"
              style="width: 200px; height: 200px; border: 4px solid #1a1a2e; border-radius: 8px;"
            />
            <p style="color: #888; font-size: 12px; margin-top: 10px;">Carnet: ${carnet}</p>
          </div>

          <p style="color: #888; font-size: 13px; border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 20px;">
            Este es un correo automático. Si no solicitaste este registro, por favor
            contacta a la administración de USPG.
          </p>
        </div>

        <div style="background: #1a1a2e; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="color: #aaa; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Universidad San Pablo de Guatemala
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `qr-carnet-${carnet}.png`,
        content: qrBase64,
        encoding: "base64",
        cid: "qr-carnet", // referenced in the HTML img src
      },
    ],
  };

  await transporter.sendMail(mailOptions);
}
