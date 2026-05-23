-- Sincroniza columnas/tablas faltantes del schema Prisma (ejecutar en schema laboratorios)
-- Uso: npx prisma db execute --file prisma/sync-schema.sql --schema prisma/schema.prisma

-- Tabla configuracion_division (si no existe)
CREATE TABLE IF NOT EXISTS "configuracion_division" (
  "id" SERIAL NOT NULL,
  "laboratorio_id" INTEGER NOT NULL,
  "etiqueta" TEXT NOT NULL,
  "cupo" INTEGER NOT NULL,
  "es_grupo_completo" BOOLEAN NOT NULL DEFAULT false,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "orden" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "configuracion_division_pkey" PRIMARY KEY ("id")
);

-- Columna en reserva
ALTER TABLE "reserva"
  ADD COLUMN IF NOT EXISTS "configuracion_division_id" INTEGER;

-- FK (ignorar si ya existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reserva_configuracion_division_id_fkey'
  ) THEN
    ALTER TABLE "reserva"
      ADD CONSTRAINT "reserva_configuracion_division_id_fkey"
      FOREIGN KEY ("configuracion_division_id")
      REFERENCES "configuracion_division"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'configuracion_division_laboratorio_id_fkey'
  ) THEN
    ALTER TABLE "configuracion_division"
      ADD CONSTRAINT "configuracion_division_laboratorio_id_fkey"
      FOREIGN KEY ("laboratorio_id")
      REFERENCES "laboratorio"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
