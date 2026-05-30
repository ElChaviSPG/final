import { enviarCorreoBienvenidaConQR } from "@/lib/email";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

/** Generates a random 8-character password */
function generarPasswordTemporal() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/**
 * Normalizes a string: lowercase, remove accents, remove non-alphanumeric.
 * "María José" → "mariajose"
 */
function normalizar(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Generates the institutional email: nombre.apellido@alumno.uspg.edu.gt
 * If taken, appends 02, 03, etc.
 * Example: juan.perez@alumno.uspg.edu.gt → juan.perez02@alumno.uspg.edu.gt
 */
async function generarCorreoInstitucional(nombre, apellido) {
  const primerNombre   = normalizar(nombre.split(" ")[0]);
  const primerApellido = normalizar(apellido.split(" ")[0]);
  const base           = `${primerNombre}.${primerApellido}`;
  const dominio        = "alumno.uspg.edu.gt";

  // Check base email
  const baseEmail = `${base}@${dominio}`;
  const existe = await prisma.alumno.findUnique({
    where: { correoInstitucional: baseEmail },
  });
  if (!existe) return baseEmail;

  // Find all emails that start with the base to determine next suffix
  const similares = await prisma.alumno.findMany({
    where: { correoInstitucional: { startsWith: `${base}` } },
    select: { correoInstitucional: true },
  });

  // Extract numeric suffixes and find the next available
  const sufijos = similares
    .map(a => {
      const match = a.correoInstitucional?.match(new RegExp(`^${base}(\\d+)@`));
      return match ? parseInt(match[1]) : 1;
    })
    .filter(n => !isNaN(n));

  const maxSufijo = sufijos.length > 0 ? Math.max(...sufijos) : 1;
  const siguiente = String(maxSufijo + 1).padStart(2, "0");
  return `${base}${siguiente}@${dominio}`;
}

/**
 * Generates the next sequential carnet: 260XXXX
 */
async function generarCarnetAutomatico() {
  const ultimo = await prisma.alumno.findFirst({
    where: { carnet: { startsWith: "260" } },
    orderBy: { carnet: "desc" },
    select: { carnet: true },
  });

  if (!ultimo) return "2600001";
  const numero = parseInt(ultimo.carnet.slice(3));
  return `260${String(numero + 1).padStart(4, "0")}`;
}

export async function GET() {
  try {
    const alumnos = await prisma.alumno.findMany({
      include: { asignaciones: true, carrera: true },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ success: true, data: alumnos });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, apellido, email, carreraId, autoCarnet } = body;

    if (!nombre || !apellido || !email) {
      return Response.json(
        { success: false, error: "nombre, apellido y email personal son requeridos" },
        { status: 400 }
      );
    }

    // Determine carnet
    let carnet;
    if (autoCarnet) {
      carnet = await generarCarnetAutomatico();
    } else {
      if (!body.carnet) {
        return Response.json(
          { success: false, error: "El carnet es requerido para alumnos existentes" },
          { status: 400 }
        );
      }
      carnet = body.carnet.trim();
    }

    // Check duplicate carnet
    const existeCarnet = await prisma.alumno.findUnique({ where: { carnet } });
    if (existeCarnet) {
      return Response.json(
        { success: false, error: `El carnet ${carnet} ya está registrado` },
        { status: 409 }
      );
    }

    // Check duplicate personal email
    const existeEmail = await prisma.alumno.findUnique({ where: { email } });
    if (existeEmail) {
      return Response.json(
        { success: false, error: `El correo personal ${email} ya está registrado` },
        { status: 409 }
      );
    }

    // Generate institutional email only for new students (autoCarnet)
    const correoInstitucional = autoCarnet
      ? await generarCorreoInstitucional(nombre, apellido)
      : null;

    // Generate and hash a temporary password for new students
    const passwordTemporal = autoCarnet ? generarPasswordTemporal() : null;
    const passwordHash = passwordTemporal ? await bcrypt.hash(passwordTemporal, 10) : null;

    const alumno = await prisma.alumno.create({
      data: {
        carnet,
        nombre,
        apellido,
        email,
        correoInstitucional,
        password: passwordHash,
        carreraId: carreraId ?? null,
      },
    });

    // Send welcome email with QR, institutional email, and temporary password
    enviarCorreoBienvenidaConQR({
      nombre:              alumno.nombre,
      apellido:            alumno.apellido,
      email:               alumno.email,
      carnet:              alumno.carnet,
      correoInstitucional: alumno.correoInstitucional,
      passwordTemporal,
    }).catch((err) => {
      console.error("[email] Error enviando correo de bienvenida:", err.message);
    });

    return Response.json(
      {
        success: true,
        data: alumno,
        message: `Alumno registrado con carnet ${alumno.carnet}${alumno.correoInstitucional ? ` y correo institucional ${alumno.correoInstitucional}` : ""}. Se enviará un correo con su información.`,
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
