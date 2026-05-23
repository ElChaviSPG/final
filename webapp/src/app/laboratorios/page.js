import { getDashboardData, getUsuariosSelect } from './actions'
import { serialize } from '@/lib/serialize'
import LaboratoriosDashboard from './LaboratoriosDashboard'

export const dynamic = 'force-dynamic'

export default async function LaboratoriosPage() {
  const [data, usuarios] = await Promise.all([getDashboardData(), getUsuariosSelect()])

  return (
    <LaboratoriosDashboard
      initialData={serialize({ ...data, usuarios })}
    />
  )
}
