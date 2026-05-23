const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const laboratoriosSeed = [
  {
    codigo: 'LAB-COMP',
    nombre: 'Laboratorio de Computación',
    descripcion: '30 estaciones de cómputo. Prioridad Fase 1 — acceso remoto y reservaciones flexibles.',
    ubicacion: 'Edificio Ingeniería — Planta 2',
    tipo: 'COMPUTACION',
    capacidadTotal: 30,
    permiteDivision: true,
    faseImplementacion: 1,
    divisiones: [
      { etiqueta: '1 estación', cupo: 1, orden: 1 },
      { etiqueta: '2 estaciones', cupo: 2, orden: 2 },
      { etiqueta: '5 estaciones', cupo: 5, orden: 3 },
      { etiqueta: '6 estaciones', cupo: 6, orden: 4 },
      { etiqueta: '15 estaciones (media sala)', cupo: 15, orden: 5 },
      { etiqueta: '30 estaciones (sala completa)', cupo: 30, esGrupoCompleto: true, orden: 6 },
    ],
    estaciones: [],
    equipos: [
      { codigoInventario: 'COMP-PC-001', nombre: 'Estación 01', esServidor: false },
      { codigoInventario: 'COMP-PC-002', nombre: 'Estación 02', esServidor: false },
      { codigoInventario: 'COMP-SRV-01', nombre: 'Servidor universitario', esServidor: true },
    ],
  },
  {
    codigo: 'LAB-PLC',
    nombre: 'Laboratorio PLC / CNC',
    descripcion: 'Tecnología industrial — rotación entre estaciones para 2 grupos de 15.',
    ubicacion: 'Edificio Ingeniería — Planta 1',
    tipo: 'PLC_CNC',
    capacidadTotal: 30,
    permiteDivision: true,
    faseImplementacion: 2,
    divisiones: [
      { etiqueta: 'Grupo A (15 estudiantes)', cupo: 15, orden: 1 },
      { etiqueta: 'Grupo B (15 estudiantes)', cupo: 15, orden: 2 },
      { etiqueta: 'Sala completa (30)', cupo: 30, esGrupoCompleto: true, orden: 3 },
    ],
    estaciones: [
      { nombre: 'Torno', tipo: 'TORNO', orden: 1 },
      { nombre: 'Fresadora', tipo: 'FRESADORA', orden: 2 },
      { nombre: 'CNC', tipo: 'CNC', orden: 3 },
      { nombre: 'PLC', tipo: 'PLC', orden: 4 },
      { nombre: 'Impresora láser', tipo: 'LASER_PRINT', orden: 5 },
      { nombre: 'Cortadora láser', tipo: 'LASER_CUT', orden: 6 },
    ],
    equipos: [],
  },
  {
    codigo: 'LAB-QUIM',
    nombre: 'Laboratorio de Química',
    descripcion: 'Solo reservación de grupo completo por restricciones de seguridad con reactivos.',
    ubicacion: 'Edificio Ciencias — Planta 1',
    tipo: 'QUIMICA',
    capacidadTotal: 30,
    permiteDivision: false,
    faseImplementacion: 3,
    divisiones: [
      { etiqueta: 'Grupo completo (30)', cupo: 30, esGrupoCompleto: true, orden: 1 },
    ],
    estaciones: [],
    equipos: [],
  },
  {
    codigo: 'LAB-FIS',
    nombre: 'Laboratorio de Física',
    descripcion: 'Grupo completo de 30 o dos subgrupos de 15.',
    ubicacion: 'Edificio Ciencias — Planta 2',
    tipo: 'FISICA',
    capacidadTotal: 30,
    permiteDivision: true,
    faseImplementacion: 4,
    divisiones: [
      { etiqueta: 'Subgrupo (15)', cupo: 15, orden: 1 },
      { etiqueta: 'Grupo completo (30)', cupo: 30, esGrupoCompleto: true, orden: 2 },
    ],
    estaciones: [],
    equipos: [],
  },
]

async function main() {
  const reglamento = await prisma.reglamento.upsert({
    where: { version: '1.0' },
    update: {},
    create: {
      version: '1.0',
      titulo: 'Reglamento de uso de laboratorios USPG',
      contenido:
        'El usuario se compromete a utilizar los equipos de forma responsable, respetar las reservaciones aprobadas y cumplir las normas de la Dirección Académica de Ingeniería.',
      activo: true,
    },
  })

  const admin = await prisma.usuario.upsert({
    where: { correo: 'admin.labs@uspg.edu.gt' },
    update: {},
    create: {
      correo: 'admin.labs@uspg.edu.gt',
      nombre: 'Administrador',
      apellido: 'Laboratorios',
      rol: 'ADMINISTRADOR',
      categoria: 'ESTUDIANTE_UNIVERSITARIO',
      reglamentoAcep: true,
    },
  })

  const tecnico = await prisma.usuario.upsert({
    where: { correo: 'tecnico.labs@uspg.edu.gt' },
    update: {},
    create: {
      correo: 'tecnico.labs@uspg.edu.gt',
      nombre: 'Técnico',
      apellido: 'Encargado',
      rol: 'TECNICO',
      categoria: 'ESTUDIANTE_UNIVERSITARIO',
      reglamentoAcep: true,
    },
  })

  for (const lab of laboratoriosSeed) {
    const { divisiones, estaciones, equipos, ...data } = lab
    await prisma.laboratorio.upsert({
      where: { codigo: data.codigo },
      update: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        ubicacion: data.ubicacion,
        tipo: data.tipo,
        capacidadTotal: data.capacidadTotal,
        permiteDivision: data.permiteDivision,
        faseImplementacion: data.faseImplementacion,
      },
      create: {
        ...data,
        configuraciones: {
          create: divisiones.map((d) => ({
            etiqueta: d.etiqueta,
            cupo: d.cupo,
            esGrupoCompleto: d.esGrupoCompleto ?? false,
            orden: d.orden,
          })),
        },
        estaciones: {
          create: estaciones,
        },
        equipos: {
          create: equipos,
        },
      },
    })
  }

  console.log('Seed OK:', { reglamento: reglamento.version, admin: admin.correo, tecnico: tecnico.correo })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
