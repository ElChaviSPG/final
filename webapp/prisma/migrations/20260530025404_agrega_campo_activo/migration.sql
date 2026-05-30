/*
  Warnings:

  - You are about to drop the column `hora_fin` on the `horario` table. All the data in the column will be lost.
  - You are about to drop the column `hora_inicio` on the `horario` table. All the data in the column will be lost.
  - Added the required column `horaFin` to the `horario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `horaInicio` to the `horario` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- AlterTable
ALTER TABLE "alumno" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "password" TEXT;

-- AlterTable
ALTER TABLE "catedratico_academico" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "horario" DROP COLUMN "hora_fin",
DROP COLUMN "hora_inicio",
ADD COLUMN     "horaFin" TEXT NOT NULL,
ADD COLUMN     "horaInicio" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "solicitud_inscripcion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "carrera_id" INTEGER NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitud_inscripcion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "solicitud_inscripcion" ADD CONSTRAINT "solicitud_inscripcion_carrera_id_fkey" FOREIGN KEY ("carrera_id") REFERENCES "carrera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
