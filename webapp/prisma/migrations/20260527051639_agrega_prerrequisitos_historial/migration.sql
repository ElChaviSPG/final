/*
  Warnings:

  - You are about to drop the column `updated_at` on the `carrera` table. All the data in the column will be lost.
  - You are about to drop the column `horaFin` on the `horario` table. All the data in the column will be lost.
  - You are about to drop the column `horaInicio` on the `horario` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[correo_institucional]` on the table `alumno` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hora_fin` to the `horario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hora_inicio` to the `horario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "alumno" ADD COLUMN     "correo_institucional" TEXT;

-- AlterTable
ALTER TABLE "carrera" DROP COLUMN "updated_at",
ADD COLUMN     "nivel" TEXT NOT NULL DEFAULT 'LICENCIATURA';

-- AlterTable
ALTER TABLE "horario" DROP COLUMN "horaFin",
DROP COLUMN "horaInicio",
ADD COLUMN     "hora_fin" TEXT NOT NULL,
ADD COLUMN     "hora_inicio" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "prerrequisito" (
    "id" SERIAL NOT NULL,
    "curso_id" INTEGER NOT NULL,
    "requiere_id" INTEGER NOT NULL,

    CONSTRAINT "prerrequisito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_academico" (
    "id" SERIAL NOT NULL,
    "alumno_id" INTEGER NOT NULL,
    "curso_id" INTEGER NOT NULL,
    "ciclo" TEXT NOT NULL,
    "nota" DECIMAL(4,2),
    "aprobado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_academico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_estudio" (
    "id" SERIAL NOT NULL,
    "carrera_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "total_creditos" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_estudio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curso_plan" (
    "id" SERIAL NOT NULL,
    "plan_estudio_id" INTEGER NOT NULL,
    "curso_id" INTEGER NOT NULL,
    "semestre" INTEGER NOT NULL,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "curso_plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prerrequisito_curso_id_requiere_id_key" ON "prerrequisito"("curso_id", "requiere_id");

-- CreateIndex
CREATE UNIQUE INDEX "historial_academico_alumno_id_curso_id_ciclo_key" ON "historial_academico"("alumno_id", "curso_id", "ciclo");

-- CreateIndex
CREATE UNIQUE INDEX "curso_plan_plan_estudio_id_curso_id_key" ON "curso_plan"("plan_estudio_id", "curso_id");

-- CreateIndex
CREATE UNIQUE INDEX "alumno_correo_institucional_key" ON "alumno"("correo_institucional");

-- AddForeignKey
ALTER TABLE "prerrequisito" ADD CONSTRAINT "prerrequisito_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prerrequisito" ADD CONSTRAINT "prerrequisito_requiere_id_fkey" FOREIGN KEY ("requiere_id") REFERENCES "curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_academico" ADD CONSTRAINT "historial_academico_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_academico" ADD CONSTRAINT "historial_academico_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_estudio" ADD CONSTRAINT "plan_estudio_carrera_id_fkey" FOREIGN KEY ("carrera_id") REFERENCES "carrera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curso_plan" ADD CONSTRAINT "curso_plan_plan_estudio_id_fkey" FOREIGN KEY ("plan_estudio_id") REFERENCES "plan_estudio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curso_plan" ADD CONSTRAINT "curso_plan_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
