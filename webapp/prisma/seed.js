// prisma/seed.js — Smart Parking USPG, Grupo 5
// Ejecutar: npm run seed
// Limpia toda la BD y crea datos frescos y coherentes.

import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({
  connectionString: (process.env.DATABASE_URL5 ?? process.env.DATABASE_URL).replace('sslmode=require', 'sslmode=no-verify'),
  ssl: { rejectUnauthorized: false },
  options: '-c search_path=grupo5_parqueo',
});
const adapter = new PrismaPg(pool);

// ── Cliente académico ───────────────────────────────────────────────────────
const poolAcademico = new pg.Pool({
  connectionString: process.env.DATABASE_URL.replace('sslmode=require', 'sslmode=no-verify'),
  ssl: { rejectUnauthorized: false },
  options: '-c search_path=grupo1_academico',
});
const adapterAcademico = new PrismaPg(poolAcademico);
const prismaAcademico = new PrismaClient({ adapter: adapterAcademico });
const prisma = new PrismaClient({ adapter });

// ── Generador de session_code único ────────────────────────────────────────────
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const usedCodes = new Set();
function makeSessionCode() {
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
    if (!usedCodes.has(code)) { usedCodes.add(code); return code; }
  }
  throw new Error('No se pudo generar código de sesión único');
}

// ── Wipe completo en orden FK-safe ─────────────────────────────────────────────
async function wipeAll() {
  console.log('🗑️  Limpiando base de datos...');
  await prisma.blockchainAudit.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.visitorQR.deleteMany();
  await prisma.barrierLog.deleteMany();
  await prisma.parkingSession.deleteMany();
  await prisma.blacklist.deleteMany();
  await prisma.cardReplacement.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.monthlyBill.deleteMany();
  await prisma.parkingSubscription.deleteMany();
  await prisma.parkingEvent.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.parkingSpace.deleteMany();
  await prisma.tariffConfig.deleteMany();
  await prisma.camera.deleteMany();
  await prisma.user.deleteMany();
  await prisma.campus.deleteMany();
  console.log('✅ BD limpia\n');
}

async function main() {
  console.log('🌱 Iniciando seed — Smart Parking USPG Grupo 5\n');

  await wipeAll();

  // ── Campus ─────────────────────────────────────────────────────────────────
  const campus = await prisma.campus.create({
    data: {
      name: 'Universidad San Pablo Guatemala',
      address: '13 Calle 4-65, Zona 10, Guatemala City',
      lat: 14.5847, lng: -90.5085, zoom: 18, total_spaces: 500,
    },
  });
  console.log(`✅ Campus: ${campus.name}`);

  // ── Usuarios ───────────────────────────────────────────────────────────────
  const [hashAdmin, hashTeacher, hashStudent, hashSecurity] = await Promise.all([
    bcrypt.hash('Admin2026!',    10),
    bcrypt.hash('Teacher2026!',  10),
    bcrypt.hash('Student2026!',  10),
    bcrypt.hash('Security2026!', 10),
  ]);

  const usersData = [
    {
      email: 'admin@uspg.edu.gt',      password_hash: hashAdmin,
      role: 'ADMIN',    first_name: 'José',     last_name: 'Galicia',
      carnet: null,     nfc_card_id: 'NFC-ADMIN-001',
      qr_code: 'USP-QR-ADMIN-001',    phone: '5500-0001',
    },
    {
      email: 'docente01@uspg.edu.gt',  password_hash: hashTeacher,
      role: 'TEACHER',  first_name: 'María',    last_name: 'López',
      carnet: 'DOC-2020-001', nfc_card_id: 'NFC-DOC-001',
      qr_code: 'USP-QR-DOC-001',      phone: '5500-0002',
    },
    {
      email: 'docente02@uspg.edu.gt',  password_hash: hashTeacher,
      role: 'TEACHER',  first_name: 'Roberto',  last_name: 'Méndez',
      carnet: 'DOC-2019-002', nfc_card_id: null,
      qr_code: 'USP-QR-DOC-002',      phone: '5500-0003',
    },
    {
      email: 'est001@uspg.edu.gt',     password_hash: hashStudent,
      role: 'STUDENT',  first_name: 'Carlos',   last_name: 'Pérez',
      carnet: '2021-0001', nfc_card_id: 'NFC-EST-001',
      qr_code: 'USP-QR-EST-001',      phone: '5500-1001',
    },
    {
      email: 'est002@uspg.edu.gt',     password_hash: hashStudent,
      role: 'STUDENT',  first_name: 'Ana',      last_name: 'García',
      carnet: '2021-0002', nfc_card_id: 'NFC-EST-002',
      qr_code: 'USP-QR-EST-002',      phone: '5500-1002',
    },
    {
      email: 'est003@uspg.edu.gt',     password_hash: hashStudent,
      role: 'STUDENT',  first_name: 'Luis',     last_name: 'Herrera',
      carnet: '2022-0003', nfc_card_id: null,
      qr_code: 'USP-QR-EST-003',      phone: '5500-1003',
    },
    {
      email: 'guardia01@uspg.edu.gt',  password_hash: hashSecurity,
      role: 'SECURITY', first_name: 'Pedro',    last_name: 'Morales',
      carnet: null,     nfc_card_id: 'NFC-SEC-001',
      qr_code: 'USP-QR-SEC-001',      phone: '5500-2001',
    },
    {
      email: 'guardia02@uspg.edu.gt',  password_hash: hashSecurity,
      role: 'SECURITY', first_name: 'Rosa',     last_name: 'Fuentes',
      carnet: null,     nfc_card_id: 'NFC-SEC-002',
      qr_code: 'USP-QR-SEC-002',      phone: '5500-2002',
    },
  ];

  const users = {};
  for (const ud of usersData) {
    const u = await prisma.user.create({ data: ud });
    users[ud.email] = u;
  }
  console.log(`✅ Usuarios: ${usersData.length} creados`);

  const admin     = users['admin@uspg.edu.gt'];
  const doc01     = users['docente01@uspg.edu.gt'];
  const doc02     = users['docente02@uspg.edu.gt'];
  const est001    = users['est001@uspg.edu.gt'];
  const est002    = users['est002@uspg.edu.gt'];
  const est003    = users['est003@uspg.edu.gt'];
  const guardia01 = users['guardia01@uspg.edu.gt'];
  const guardia02 = users['guardia02@uspg.edu.gt'];

  // ── Vehículos ──────────────────────────────────────────────────────────────
  const vehiclesData = [
    { user_id: admin.id,     placa: 'P-123ABC', brand: 'Toyota',     model: 'Fortuner',  color: 'Blanco',   year: 2022, vehicle_type: 'STANDARD', is_authorized: true },
    { user_id: doc01.id,     placa: 'C-456XYZ', brand: 'Honda',      model: 'CR-V',      color: 'Gris',     year: 2020, vehicle_type: 'TEACHER',  is_authorized: true },
    { user_id: doc02.id,     placa: 'M-345STU', brand: 'Volkswagen', model: 'Jetta',     color: 'Plateado', year: 2021, vehicle_type: 'TEACHER',  is_authorized: true },
    { user_id: est001.id,    placa: 'P-789DEF', brand: 'Hyundai',    model: 'Tucson',    color: 'Negro',    year: 2019, vehicle_type: 'STANDARD', is_authorized: true },
    { user_id: est001.id,    placa: 'M-001GHI', brand: 'Suzuki',     model: 'Swift',     color: 'Rojo',     year: 2021, vehicle_type: 'MOTORCYCLE',is_authorized: true },
    { user_id: est002.id,    placa: 'C-234JKL', brand: 'Kia',        model: 'Sportage',  color: 'Azul',     year: 2023, vehicle_type: 'STANDARD', is_authorized: true },
    { user_id: est003.id,    placa: 'C-678VWX', brand: 'Chevrolet',  model: 'Sail',      color: 'Café',     year: 2020, vehicle_type: 'STANDARD', is_authorized: false, blacklisted: true, blacklist_reason: 'Ingreso sin autorización — 3er reincidente' },
    { user_id: guardia01.id, placa: 'P-890PQR', brand: 'Toyota',     model: 'Hilux',     color: 'Plateado', year: 2018, vehicle_type: 'STANDARD', is_authorized: true },
    { user_id: guardia02.id, placa: 'O-567MNO', brand: 'Nissan',     model: 'Versa',     color: 'Blanco',   year: 2020, vehicle_type: 'STANDARD', is_authorized: true },
  ];

  const vehicles = {};
  for (const vd of vehiclesData) {
    const v = await prisma.vehicle.create({ data: vd });
    vehicles[vd.placa] = v;
  }
  console.log(`✅ Vehículos: ${vehiclesData.length} creados`);

  // Blacklist record para el vehículo bloqueado
  await prisma.blacklist.create({
    data: {
      vehicle_id: vehicles['C-678VWX'].id,
      reason: 'Ingreso sin autorización — 3er reincidente',
      added_by_user_id: admin.id,
      is_active: true,
    },
  });
  console.log('✅ Lista negra: 1 vehículo registrado');

  // ── Espacios de parqueo ────────────────────────────────────────────────────
  const zoneDefs = [
    { zone: 'A', count: 220, handicapped: 5, electric: 10 },
    { zone: 'B', count: 150, handicapped: 3, electric:  6 },
    { zone: 'C', count: 100, handicapped: 2, electric:  0 },
    { zone: 'D', count:  30, handicapped: 0, electric:  0 },
  ];

  const spaceIds = {};
  let spacesCreated = 0;

  for (const def of zoneDefs) {
    const batch = [];
    for (let n = 1; n <= def.count; n++) {
      const code = `${def.zone}-${String(n).padStart(3, '0')}`;
      let type = 'STANDARD';
      if (def.zone === 'D') {
        type = n <= 15 ? 'TEACHER' : n <= 20 ? 'VIP' : 'RESERVED';
      } else if (n <= def.handicapped) {
        type = 'HANDICAPPED';
      } else if (n <= def.handicapped + def.electric) {
        type = 'ELECTRIC';
      }
      batch.push({ code, campus_id: campus.id, zone: def.zone, type, status: 'AVAILABLE' });
    }
    // createMany es mucho más rápido que N creates individuales
    await prisma.parkingSpace.createMany({ data: batch });
    spacesCreated += batch.length;
  }

  // Guardamos algunos IDs de espacios que usaremos para sesiones
  const spaceCodes = ['A-001','A-002','A-003','A-004','A-005',
                      'B-001','B-005','B-010',
                      'C-001','C-010',
                      'D-001','D-002',
                      'A-010','A-020','A-030'];
  for (const code of spaceCodes) {
    const s = await prisma.parkingSpace.findFirst({ where: { code } });
    if (s) spaceIds[code] = s;
  }
  console.log(`✅ Espacios: ${spacesCreated} creados`);

  // ── Tarifas ────────────────────────────────────────────────────────────────
  const tariffsData = [
    { role: 'ADMIN',    hourly_rate: 0,  is_free: true,  max_free_hours: null },
    { role: 'SECURITY', hourly_rate: 0,  is_free: true,  max_free_hours: null },
    { role: 'TEACHER',  hourly_rate: 0,  is_free: true,  max_free_hours: 8    },
    { role: 'STUDENT',  hourly_rate: 5,  is_free: false, max_free_hours: null },
    { role: 'VISITOR',  hourly_rate: 10, is_free: false, max_free_hours: null },
  ];
  await prisma.tariffConfig.createMany({ data: tariffsData });
  console.log('✅ Tarifas: configuradas (STUDENT Q5/h, VISITOR Q10/h, resto gratis)');

  // ── Suscripciones ──────────────────────────────────────────────────────────
  const now = new Date();
  const DAY = 86400000;

  await prisma.parkingSubscription.createMany({
    data: [
      {
        user_id: est001.id, type: 'MONTHLY', status: 'ACTIVE',
        start_date: new Date(now.getTime() - 15 * DAY),
        end_date:   new Date(now.getTime() + 15 * DAY),
        amount_paid: 150.00, payment_reference: 'REF-MAY-2026-001', auto_renew: false,
      },
      {
        user_id: est002.id, type: 'SEMESTER', status: 'ACTIVE',
        start_date: new Date(now.getTime() - 30 * DAY),
        end_date:   new Date(now.getTime() + 150 * DAY),
        amount_paid: 600.00, payment_reference: 'REF-ENE-2026-002', auto_renew: true,
      },
      {
        user_id: doc02.id, type: 'MONTHLY', status: 'EXPIRED',
        start_date: new Date(now.getTime() - 40 * DAY),
        end_date:   new Date(now.getTime() - 10 * DAY),
        amount_paid: 150.00, payment_reference: 'REF-ABR-2026-003', auto_renew: false,
      },
    ],
  });
  console.log('✅ Suscripciones: 3 creadas (2 activas, 1 expirada)');

  // ── Eventos ────────────────────────────────────────────────────────────────
  await prisma.parkingEvent.createMany({
    data: [
      {
        name: 'Graduación Junio 2026',
        description: 'Ceremonia de graduación — Semestre II, todos los programas.',
        event_date:  new Date('2026-06-15'),
        start_time:  new Date('2026-06-15T17:00:00Z'),
        end_time:    new Date('2026-06-16T03:00:00Z'),
        tariff_mode: 'FLAT_RATE', flat_rate: 25.00,
        affected_zones: 'A,B,C,D', status: 'SCHEDULED',
        created_by_user_id: admin.id,
        uses_external_parking: true,
        external_parking_name: 'Terreno Auxiliar Norte',
        shuttle_available: true,
      },
      {
        name: 'Conferencia de Tecnología 2026',
        description: 'Evento académico anual de la Facultad de Ingeniería.',
        event_date:  new Date(now.getTime() - 3 * DAY),
        start_time:  new Date(now.getTime() - 3 * DAY + 14 * 3600000),
        end_time:    new Date(now.getTime() - 3 * DAY + 22 * 3600000),
        tariff_mode: 'HOURLY', flat_rate: null,
        affected_zones: 'A,B', status: 'COMPLETED',
        created_by_user_id: admin.id,
        uses_external_parking: false, shuttle_available: false,
      },
    ],
  });
  console.log('✅ Eventos: 2 creados (1 programado, 1 finalizado)');

  // ── Sesiones ACTIVAS (5) ───────────────────────────────────────────────────
  // Cada una ocupa su espacio
  const activeSessions = [
    { vehicle: 'P-789DEF', user: est001,    space: 'A-001', method: 'QR',    hoursAgo: 2   },
    { vehicle: 'C-234JKL', user: est002,    space: 'A-002', method: 'QR',    hoursAgo: 1   },
    { vehicle: 'C-456XYZ', user: doc01,     space: 'D-001', method: 'NFC',   hoursAgo: 3   },
    { vehicle: 'P-890PQR', user: guardia01, space: 'B-001', method: 'NFC',   hoursAgo: 0.5 },
    { vehicle: 'P-123ABC', user: admin,     space: 'A-005', method: 'NFC',   hoursAgo: 4   },
  ];

  const activeSessionIds = [];
  for (const s of activeSessions) {
    const sp = spaceIds[s.space];
    if (!sp) continue;
    const session = await prisma.parkingSession.create({
      data: {
        session_code: makeSessionCode(),
        vehicle_id:   vehicles[s.vehicle].id,
        space_id:     sp.id,
        user_id:      s.user.id,
        entry_method: s.method,
        entry_time:   new Date(now.getTime() - s.hoursAgo * 3600000),
        status:       'ACTIVE',
      },
    });
    await prisma.parkingSpace.update({ where: { id: sp.id }, data: { status: 'OCCUPIED' } });
    activeSessionIds.push(session.id);
  }
  console.log(`✅ Sesiones activas: ${activeSessionIds.length} creadas`);

  // ── Historial de sesiones (30 días) ───────────────────────────────────────
  // Datos realistas: de lunes a viernes, ~6 sesiones/día
  const histVehicles = [
    { placa: 'P-789DEF', user: est001,    role: 'STUDENT' },
    { placa: 'C-234JKL', user: est002,    role: 'STUDENT' },
    { placa: 'M-001GHI', user: est001,    role: 'STUDENT' },
    { placa: 'C-456XYZ', user: doc01,     role: 'TEACHER' },
    { placa: 'M-345STU', user: doc02,     role: 'TEACHER' },
    { placa: 'P-890PQR', user: guardia01, role: 'SECURITY'},
    { placa: 'O-567MNO', user: guardia02, role: 'SECURITY'},
  ];
  const histSpaceCodes = ['A-010','A-020','A-030','B-005','B-010','C-001','C-010'];
  const histSpaces = [];
  for (const code of histSpaceCodes) {
    const s = await prisma.parkingSpace.findFirst({ where: { code } });
    if (s) histSpaces.push(s);
  }

  // Duraciones y métodos variados por rol
  const durations = { STUDENT: [60,90,120,150,180,240], TEACHER: [120,180,240,300,360,420], SECURITY: [480,540,600] };
  const methods   = ['QR','QR','QR','NFC','MANUAL'];
  let histCreated = 0;

  for (let daysBack = 1; daysBack <= 30; daysBack++) {
    // Fin de semana: reducir actividad
    const date = new Date(now.getTime() - daysBack * DAY);
    const dow  = date.getDay(); // 0=Dom, 6=Sáb
    const sessionsThisDay = (dow === 0 || dow === 6) ? 2 : 6;

    for (let s = 0; s < sessionsThisDay; s++) {
      const vInfo  = histVehicles[(daysBack * 7 + s) % histVehicles.length];
      const space  = histSpaces[(daysBack + s) % histSpaces.length];
      const durs   = durations[vInfo.role] ?? [90,120];
      const dur    = durs[(daysBack + s) % durs.length];
      const method = methods[(daysBack + s) % methods.length];

      const entryHour  = 7 + (s * 2); // de 7am a 7pm
      const entryTime  = new Date(date);
      entryTime.setHours(entryHour, 0, 0, 0);
      const exitTime   = new Date(entryTime.getTime() + dur * 60000);

      // Calcular monto según rol
      const tariff = tariffsData.find(t => t.role === vInfo.role);
      let amount = 0;
      if (!tariff?.is_free) {
        amount = parseFloat(((dur / 60) * (tariff?.hourly_rate ?? 5)).toFixed(2));
      } else if (tariff?.max_free_hours && dur > tariff.max_free_hours * 60) {
        const excedente = dur - tariff.max_free_hours * 60;
        amount = parseFloat(((excedente / 60) * 5).toFixed(2));
      }

      const session = await prisma.parkingSession.create({
        data: {
          session_code:     makeSessionCode(),
          vehicle_id:       vehicles[vInfo.placa].id,
          space_id:         space.id,
          user_id:          vInfo.user.id,
          entry_method:     method,
          entry_time:       entryTime,
          exit_time:        exitTime,
          status:           'COMPLETED',
          duration_minutes: dur,
          amount_due:       amount,
          is_paid:          true,
        },
      });

      // Pago para sesiones con monto > 0
      if (amount > 0) {
        await prisma.payment.create({
          data: {
            session_id:            session.id,
            user_id:               vInfo.user.id,
            amount,
            payment_method:        s % 2 === 0 ? 'CASH' : 'CARD',
            status:                'COMPLETED',
            transaction_reference: `TRX-${session.session_code}`,
            paid_at:               exitTime,
          },
        });
      }
      histCreated++;
    }
  }
  console.log(`✅ Historial: ${histCreated} sesiones (+ pagos incluidos)`);

  // ── Reservas ───────────────────────────────────────────────────────────────
  const spA010 = spaceIds['A-010'];
  const spA020 = spaceIds['A-020'];
  const spD002 = spaceIds['D-002'] ?? spaceIds['D-001'];

  const reservationsData = [];
  if (spA010) reservationsData.push({
    user_id:    est001.id,
    vehicle_id: vehicles['P-789DEF'].id,
    space_id:   spA010.id,
    start_time: new Date(now.getTime() + 1 * DAY + 8 * 3600000),  // mañana 8am
    end_time:   new Date(now.getTime() + 1 * DAY + 12 * 3600000), // mañana 12pm
    status:     'CONFIRMED',
    type:       'STANDARD',
    notes:      'Reserva para clase presencial',
  });
  if (spA020) reservationsData.push({
    user_id:    est002.id,
    vehicle_id: vehicles['C-234JKL'].id,
    space_id:   spA020.id,
    start_time: new Date(now.getTime() - 1 * DAY + 9 * 3600000),  // ayer 9am
    end_time:   new Date(now.getTime() - 1 * DAY + 11 * 3600000), // ayer 11am
    status:     'USED',
    type:       'STANDARD',
    notes:      null,
  });
  if (spD002) reservationsData.push({
    user_id:    doc01.id,
    vehicle_id: vehicles['C-456XYZ'].id,
    space_id:   spD002.id,
    start_time: new Date(now.getTime() + 14 * 3600000), // hoy en 14h
    end_time:   new Date(now.getTime() + 18 * 3600000), // hoy en 18h
    status:     'CONFIRMED',
    type:       'PERSONAL',
    notes:      'Reunión con decano',
  });

  if (reservationsData.length) {
    await prisma.reservation.createMany({ data: reservationsData });
  }
  console.log(`✅ Reservas: ${reservationsData.length} creadas`);

  // ── Reposición de tarjeta NFC ──────────────────────────────────────────────
  await prisma.cardReplacement.create({
    data: {
      user_id:              est001.id,
      old_nfc_token:        'NFC-EST-001-OLD',
      new_nfc_token:        'NFC-EST-001',
      reason:               'LOST',
      replacement_fee:      50.00,
      fee_paid:             false,
      requested_at:         new Date(now.getTime() - 5 * DAY),
      processed_by_user_id: admin.id,
      processed_at:         new Date(now.getTime() - 5 * DAY + 2 * 3600000),
      notes:                'Reportó pérdida en secretaría el lunes pasado',
    },
  });
  console.log('✅ Reposición NFC: 1 registrada (est001, cargo Q50 pendiente)');

  // ── Notificaciones ─────────────────────────────────────────────────────────
  // Solo notificaciones que reflejan datos reales del seed (sin inventar ocupación)
  const notificationsData = [
    {
      user_id: est001.id, type: 'PAYMENT_REQUIRED', is_read: false,
      title: 'Cargo pendiente — reposición NFC',
      message: 'Tienes un cargo de Q50.00 pendiente por reposición de tarjeta NFC.',
    },
    {
      user_id: est001.id, type: 'RESERVATION_EXPIRING', is_read: false,
      title: 'Recordatorio de reserva',
      message: 'Tu reserva en espacio A-010 inicia mañana a las 8:00 AM.',
    },
    {
      user_id: doc02.id, type: 'PAYMENT_REQUIRED', is_read: false,
      title: 'Suscripción vencida',
      message: 'Tu suscripción mensual venció hace 10 días. Renuévala para acceder al parqueo.',
    },
  ];
  await prisma.notification.createMany({ data: notificationsData });
  console.log(`✅ Notificaciones: ${notificationsData.length} creadas`);

  // ── Audit log ─────────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      { user_id: admin.id,  action: 'LOGIN',  resource: 'User', resource_id: admin.id  },
      { user_id: doc01.id,  action: 'LOGIN',  resource: 'User', resource_id: doc01.id  },
      { user_id: est001.id, action: 'LOGIN',  resource: 'User', resource_id: est001.id },
      { user_id: admin.id,  action: 'BLACKLIST_VEHICLE', resource: 'Vehicle', resource_id: vehicles['C-678VWX'].id },
    ],
  });

  // ── Resumen final ──────────────────────────────────────────────────────────
  console.log('\n🎉 Seed completado exitosamente!\n');
  console.log('═══════════════════════════════════════');
  console.log('  CREDENCIALES DE ACCESO');
  console.log('═══════════════════════════════════════');
  console.log('  admin@uspg.edu.gt        / Admin2026!');
  console.log('  docente01@uspg.edu.gt    / Teacher2026!   (NFC-DOC-001, suscripción n/a)');
  console.log('  docente02@uspg.edu.gt    / Teacher2026!   (suscripción EXPIRADA)');
  console.log('  est001@uspg.edu.gt       / Student2026!   (carnet 2021-0001, sub MENSUAL activa)');
  console.log('  est002@uspg.edu.gt       / Student2026!   (carnet 2021-0002, sub SEMESTRAL activa)');
  console.log('  est003@uspg.edu.gt       / Student2026!   (vehículo en lista negra)');
  console.log('  guardia01@uspg.edu.gt    / Security2026!');
  console.log('  guardia02@uspg.edu.gt    / Security2026!');
  console.log('═══════════════════════════════════════');
  console.log('\n  QR de prueba para escanear:');
  console.log('  est001  → USP-QR-EST-001  (en sesión activa A-001)');
  console.log('  est002  → USP-QR-EST-002  (en sesión activa A-002)');
  console.log('  doc01   → USP-QR-DOC-001  (en sesión activa D-001)');
  console.log('═══════════════════════════════════════\n');
}

async function seedAcademico() {
  console.log('\n📚 Seeding sistema académico...');

  const q = (text, values) => poolAcademico.query(text, values);

  // Wipe en orden FK-safe
  await q(`SET search_path TO grupo1_academico`);
  await q(`TRUNCATE "CursoPlan","PlanEstudio","SolicitudInscripcion","Asistencia","Asignacion","Horario","Alumno","CatedraticoAcademico","Curso","Carrera" RESTART IDENTITY CASCADE`);

  // Carreras
  const { rows: [ing] } = await q(`INSERT INTO "Carrera"(codigo,nombre,facultad,nivel) VALUES('ING-SIS','Ingeniería en Sistemas','Ingeniería','LICENCIATURA') RETURNING id`);
  const { rows: [adm] } = await q(`INSERT INTO "Carrera"(codigo,nombre,facultad,nivel) VALUES('ADM-EMP','Administración de Empresas','Ciencias Económicas','LICENCIATURA') RETURNING id`);
  const { rows: [der] } = await q(`INSERT INTO "Carrera"(codigo,nombre,facultad,nivel) VALUES('DER-GEN','Derecho','Ciencias Jurídicas','LICENCIATURA') RETURNING id`);
  console.log('  ✅ Carreras: 3');

  // Catedráticos
  const { rows: [cat1] } = await q(`INSERT INTO "CatedraticoAcademico"(codigo,nombre,apellido,email) VALUES('CAT-001','Roberto','Méndez','rmendez@uspg.edu.gt') RETURNING id`);
  const { rows: [cat2] } = await q(`INSERT INTO "CatedraticoAcademico"(codigo,nombre,apellido,email) VALUES('CAT-002','María','González','mgonzalez@uspg.edu.gt') RETURNING id`);
  const { rows: [cat3] } = await q(`INSERT INTO "CatedraticoAcademico"(codigo,nombre,apellido,email) VALUES('CAT-003','Carlos','Pérez','cperez@uspg.edu.gt') RETURNING id`);
  console.log('  ✅ Catedráticos: 3');

  // Cursos
  const { rows: [prog1]  } = await q(`INSERT INTO "Curso"(codigo,nombre,creditos) VALUES('SIS-101','Programación I',4) RETURNING id`);
  const { rows: [prog2]  } = await q(`INSERT INTO "Curso"(codigo,nombre,creditos) VALUES('SIS-201','Programación II',4) RETURNING id`);
  const { rows: [bd]     } = await q(`INSERT INTO "Curso"(codigo,nombre,creditos) VALUES('SIS-301','Bases de Datos',5) RETURNING id`);
  const { rows: [redes]  } = await q(`INSERT INTO "Curso"(codigo,nombre,creditos) VALUES('SIS-401','Redes de Computadoras',4) RETURNING id`);
  const { rows: [contab] } = await q(`INSERT INTO "Curso"(codigo,nombre,creditos) VALUES('ADM-101','Contabilidad I',4) RETURNING id`);
  console.log('  ✅ Cursos: 5');

  // Horarios
  const { rows: [h1] } = await q(`INSERT INTO "Horario"("cursoId","catedraticoId",dia,"horaInicio","horaFin",salon) VALUES($1,$2,'LUNES','08:00','10:00','A-101') RETURNING id`, [prog1.id, cat1.id]);
  const { rows: [h3] } = await q(`INSERT INTO "Horario"("cursoId","catedraticoId",dia,"horaInicio","horaFin",salon) VALUES($1,$2,'MIERCOLES','10:00','12:00','B-201') RETURNING id`, [bd.id, cat2.id]);
  await q(`INSERT INTO "Horario"("cursoId","catedraticoId",dia,"horaInicio","horaFin",salon) VALUES($1,$2,'MARTES','08:00','10:00','A-101')`, [prog2.id, cat1.id]);
  await q(`INSERT INTO "Horario"("cursoId","catedraticoId",dia,"horaInicio","horaFin",salon) VALUES($1,$2,'JUEVES','14:00','16:00','C-301')`, [redes.id, cat3.id]);
  console.log('  ✅ Horarios: 4');

  // Alumnos
  const { rows: [al1] } = await q(`INSERT INTO "Alumno"(carnet,nombre,apellido,email,password,"carreraId") VALUES('2600001','Ana','López','alopez@alumno.uspg.edu.gt','USPG-2600001',$1) RETURNING id`, [ing.id]);
  const { rows: [al2] } = await q(`INSERT INTO "Alumno"(carnet,nombre,apellido,email,password,"carreraId") VALUES('2600002','Pedro','Ramírez','pramirez@alumno.uspg.edu.gt','USPG-2600002',$1) RETURNING id`, [ing.id]);
  const { rows: [al3] } = await q(`INSERT INTO "Alumno"(carnet,nombre,apellido,email,password,"carreraId") VALUES('2600003','Sofía','Castro','scastro@alumno.uspg.edu.gt','USPG-2600003',$1) RETURNING id`, [adm.id]);
  console.log('  ✅ Alumnos: 3');

  // Asignaciones
  await q(`INSERT INTO "Asignacion"("alumnoId","cursoId",ciclo) VALUES($1,$2,'2026-1'),($1,$3,'2026-1'),($4,$2,'2026-1'),($4,$5,'2026-1'),($6,$7,'2026-1')`,
    [al1.id, prog1.id, bd.id, al2.id, redes.id, al3.id, contab.id]);
  console.log('  ✅ Asignaciones: 5');

  // Asistencias
  await q(`INSERT INTO "Asistencia"("alumnoId","horarioId",fecha,presente) VALUES($1,$2,'2026-05-31',true),($3,$2,'2026-05-31',true),($1,$4,'2026-05-31',false)`,
    [al1.id, h1.id, al2.id, h3.id]);
  console.log('  ✅ Asistencias: 3');

  // Solicitudes
  await q(`INSERT INTO "SolicitudInscripcion"(nombre,apellido,email,telefono,"carreraId",estado) VALUES('Luis','Morales','lmorales@gmail.com','55551234',$1,'PENDIENTE'),('Diana','Flores','dflores@gmail.com','55555678',$2,'PENDIENTE')`,
    [ing.id, der.id]);
  console.log('  ✅ Solicitudes: 2');

  // Plan de estudio
  const { rows: [plan] } = await q(`INSERT INTO "PlanEstudio"("carreraId",nombre,version,"totalCreditos") VALUES($1,'Plan 2024','2024',200) RETURNING id`, [ing.id]);
  await q(`INSERT INTO "CursoPlan"("planEstudioId","cursoId",semestre,obligatorio) VALUES($1,$2,1,true),($1,$3,2,true),($1,$4,3,true),($1,$5,4,true)`,
    [plan.id, prog1.id, prog2.id, bd.id, redes.id]);
  console.log('  ✅ Plan de estudio: 1 plan, 4 cursos');

  console.log('\n📚 Seed académico completado!');
  console.log('═══════════════════════════════════════');
  console.log('  ALUMNOS DE PRUEBA');
  console.log('═══════════════════════════════════════');
  console.log('  carnet: 2600001  / pass: USPG-2600001  (Ing. Sistemas)');
  console.log('  carnet: 2600002  / pass: USPG-2600002  (Ing. Sistemas)');
  console.log('  carnet: 2600003  / pass: USPG-2600003  (Administración)');
  console.log('═══════════════════════════════════════\n');
}

main()
  .then(() => seedAcademico())
  .catch(e => { console.error('\n❌ Error en seed:', e.message); console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await prismaAcademico.$disconnect(); });
