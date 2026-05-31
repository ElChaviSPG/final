-- ─── Sistema Académico – Grupo 1 ─────────────────────────────────────────────
-- Schema: grupo1_academico  |  Base de datos: defaultdb (Aiven)

CREATE SCHEMA IF NOT EXISTS grupo1_academico;

SET search_path TO grupo1_academico;

CREATE TABLE IF NOT EXISTS "Carrera" (
    "id"        SERIAL PRIMARY KEY,
    "codigo"    TEXT NOT NULL UNIQUE,
    "nombre"    TEXT NOT NULL,
    "facultad"  TEXT,
    "nivel"     TEXT NOT NULL DEFAULT 'LICENCIATURA',
    "activo"    BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Alumno" (
    "id"        SERIAL PRIMARY KEY,
    "carnet"    TEXT NOT NULL UNIQUE,
    "nombre"    TEXT NOT NULL,
    "apellido"  TEXT NOT NULL,
    "email"     TEXT NOT NULL UNIQUE,
    "password"  TEXT,
    "carreraId" INTEGER REFERENCES "Carrera"("id"),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CatedraticoAcademico" (
    "id"        SERIAL PRIMARY KEY,
    "codigo"    TEXT NOT NULL UNIQUE,
    "nombre"    TEXT NOT NULL,
    "apellido"  TEXT NOT NULL,
    "email"     TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Curso" (
    "id"        SERIAL PRIMARY KEY,
    "codigo"    TEXT NOT NULL UNIQUE,
    "nombre"    TEXT NOT NULL,
    "creditos"  INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Asignacion" (
    "id"        SERIAL PRIMARY KEY,
    "alumnoId"  INTEGER NOT NULL REFERENCES "Alumno"("id"),
    "cursoId"   INTEGER NOT NULL REFERENCES "Curso"("id"),
    "ciclo"     TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("alumnoId", "cursoId", "ciclo")
);

CREATE TABLE IF NOT EXISTS "Horario" (
    "id"            SERIAL PRIMARY KEY,
    "cursoId"       INTEGER NOT NULL REFERENCES "Curso"("id"),
    "catedraticoId" INTEGER NOT NULL REFERENCES "CatedraticoAcademico"("id"),
    "dia"           TEXT NOT NULL,
    "horaInicio"    TEXT NOT NULL,
    "horaFin"       TEXT NOT NULL,
    "salon"         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Asistencia" (
    "id"        SERIAL PRIMARY KEY,
    "alumnoId"  INTEGER NOT NULL REFERENCES "Alumno"("id"),
    "horarioId" INTEGER NOT NULL REFERENCES "Horario"("id"),
    "fecha"     TIMESTAMP(3) NOT NULL,
    "presente"  BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("alumnoId", "horarioId", "fecha")
);

CREATE TABLE IF NOT EXISTS "SolicitudInscripcion" (
    "id"        SERIAL PRIMARY KEY,
    "nombre"    TEXT NOT NULL,
    "apellido"  TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "telefono"  TEXT NOT NULL,
    "carreraId" INTEGER NOT NULL REFERENCES "Carrera"("id"),
    "estado"    TEXT NOT NULL DEFAULT 'PENDIENTE',
    "motivo"    TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PlanEstudio" (
    "id"            SERIAL PRIMARY KEY,
    "carreraId"     INTEGER NOT NULL REFERENCES "Carrera"("id"),
    "nombre"        TEXT NOT NULL,
    "version"       TEXT NOT NULL,
    "totalCreditos" INTEGER NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CursoPlan" (
    "id"            SERIAL PRIMARY KEY,
    "planEstudioId" INTEGER NOT NULL REFERENCES "PlanEstudio"("id"),
    "cursoId"       INTEGER NOT NULL REFERENCES "Curso"("id"),
    "semestre"      INTEGER NOT NULL,
    "obligatorio"   BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE ("planEstudioId", "cursoId")
);
