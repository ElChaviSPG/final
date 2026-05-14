import { getLaboratorios } from './actions'
import LaboratoriosClient from './LaboratoriosClient'

export const dynamic = 'force-dynamic'; // Aseguramos que los datos se actualicen

export default async function LaboratoriosPage() {
  const laboratorios = await getLaboratorios()
  
  return <LaboratoriosClient laboratorios={laboratorios} />
}
