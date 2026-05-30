import { notFound } from 'next/navigation'
import { getLaboratorioById, getUsuariosSelect } from '../actions'
import { serialize } from '@/lib/serialize'
import LaboratorioDetail from './LaboratorioDetail'

export const dynamic = 'force-dynamic'

export default async function LaboratorioDetailPage({ params }) {
  const { id } = await params
  const [lab, usuarios] = await Promise.all([
    getLaboratorioById(id),
    getUsuariosSelect(),
  ])

  if (!lab) notFound()

  return <LaboratorioDetail laboratorio={serialize(lab)} usuarios={serialize(usuarios)} />
}
