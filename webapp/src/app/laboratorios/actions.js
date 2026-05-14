'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getLaboratorios() {
  try {
    return await prisma.laboratorio.findMany({
      orderBy: { nombre: 'asc' }
    });
  } catch (error) {
    console.error("Error fetching laboratorios:", error);
    return [];
  }
}

export async function crearLaboratorio(formData) {
  try {
    const nombre = formData.get('nombre');
    const descripcion = formData.get('descripcion');
    const capacidadTotal = parseInt(formData.get('capacidadTotal') || '30', 10);
    const permiteDivision = formData.get('permiteDivision') === 'on';

    await prisma.laboratorio.create({
      data: {
        nombre,
        descripcion,
        capacidadTotal,
        permiteDivision,
        estado: 'ACTIVO'
      }
    });

    revalidatePath('/laboratorios');
    return { success: true };
  } catch (error) {
    console.error("Error al crear laboratorio:", error);
    return { success: false, error: 'Ocurrió un error al crear el laboratorio.' };
  }
}

export async function cambiarEstadoLaboratorio(id, nuevoEstado) {
  try {
    await prisma.laboratorio.update({
      where: { id },
      data: { estado: nuevoEstado }
    });

    revalidatePath('/laboratorios');
    return { success: true };
  } catch (error) {
    console.error("Error al cambiar estado:", error);
    return { success: false, error: 'Ocurrió un error al actualizar el estado.' };
  }
}
