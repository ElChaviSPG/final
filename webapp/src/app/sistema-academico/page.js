"use client";
import { useState, useEffect } from "react";
import axios from "axios";

// ─── Constantes de período académico ─────────────────────────────────────────
const CICLO_ACTUAL = "2026-1";
const CICLO_SIGUIENTE = "2026-2";
const HOY = new Date();
const INICIO_PERIODO_ASIGNACION = new Date("2026-06-07");
const FIN_PERIODO_ASIGNACION = new Date("2026-07-16");
const EN_PERIODO_ASIGNACION = HOY >= INICIO_PERIODO_ASIGNACION && HOY <= FIN_PERIODO_ASIGNACION;

const BLOQUES_HORARIO = [
  { label: "Viernes — Bloque 1: 6:00pm - 8:15pm", dia: "Viernes", horaInicio: "18:00", horaFin: "20:15" },
  { label: "Viernes — Bloque 2: 8:15pm - 10:30pm", dia: "Viernes", horaInicio: "20:15", horaFin: "22:30" },
  { label: "Sábado — Bloque 1: 7:00am - 9:15am", dia: "Sábado", horaInicio: "07:00", horaFin: "09:15" },
  { label: "Sábado — Bloque 2: 9:15am - 11:30am", dia: "Sábado", horaInicio: "09:15", horaFin: "11:30" },
  { label: "Sábado — Bloque 3: 12:30pm - 2:45pm (post-almuerzo)", dia: "Sábado", horaInicio: "12:30", horaFin: "14:45" },
  { label: "Sábado — Bloque 4: 2:45pm - 5:00pm", dia: "Sábado", horaInicio: "14:45", horaFin: "17:00" },
];

// ─── Componente de Asignaciones ───────────────────────────────────────────────
function AsignacionesPanel({ alumnos, asignaciones, showNotification, onAsignacionCreada }) {
  const [alumnoId, setAlumnoId] = useState("");
  const [cursosDisponibles, setCursosDisponibles] = useState([]);
  const [semestreSeleccionado, setSemestreSeleccionado] = useState("");
  const [cursosSeleccionados, setCursosSeleccionados] = useState([]);
  const [loadingCursos, setLoadingCursos] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [infoAlumno, setInfoAlumno] = useState(null);

  const handleAlumnoChange = async (id) => {
    setAlumnoId(id);
    setCursosDisponibles([]);
    setSemestreSeleccionado("");
    setCursosSeleccionados([]);
    setError("");
    setInfoAlumno(null);
    if (!id) return;

    setLoadingCursos(true);
    try {
      const res = await axios.get(`/api/sistema-academico/cursos-disponibles?alumnoId=${id}`);
      setCursosDisponibles(res.data.data?.semestres || []);
      setInfoAlumno(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || "Error cargando cursos disponibles");
    } finally {
      setLoadingCursos(false);
    }
  };

  const toggleCurso = (cursoId) => {
    setCursosSeleccionados(prev =>
      prev.includes(cursoId) ? prev.filter(id => id !== cursoId) : [...prev, cursoId]
    );
  };

  const handleAsignar = async () => {
    if (!alumnoId || cursosSeleccionados.length === 0) return;
    setSubmitting(true);
    setError("");

    let exitosos = 0;
    const errores = [];

    for (const cursoId of cursosSeleccionados) {
      try {
        await axios.post("/api/sistema-academico/asignaciones", {
          alumnoId: parseInt(alumnoId),
          cursoId,
          ciclo: CICLO_SIGUIENTE,
        });
        exitosos++;
      } catch (err) {
        errores.push(err.response?.data?.error || `Error asignando curso`);
      }
    }

    if (exitosos > 0) showNotification(`${exitosos} curso(s) asignado(s) exitosamente`);
    if (errores.length > 0) setError(errores.join("\n"));

    setCursosSeleccionados([]);
    await handleAlumnoChange(alumnoId);
    onAsignacionCreada();
    setSubmitting(false);
  };

  const semestreData = cursosDisponibles.find(s => s.semestre === parseInt(semestreSeleccionado));

  return (
    <div className="row clearfix">
      <div className="col-lg-5 col-md-12">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Nueva Asignación — Ciclo {CICLO_SIGUIENTE}</h3></div>
          <div className="card-body">

            {/* Banner período */}
            {EN_PERIODO_ASIGNACION ? (
              <div className="alert alert-success py-2 mb-3">
                <i className="fa fa-check-circle mr-2"></i>
                <strong>Período de asignaciones abierto</strong>
                <br /><small>Cierra el 16 de julio de 2026</small>
              </div>
            ) : (
              <div className="alert alert-warning py-2 mb-3">
                <i className="fa fa-clock-o mr-2"></i>
                <strong>Período de asignaciones cerrado</strong>
                <br /><small>Abre el 7 de junio de 2026</small>
              </div>
            )}

            {/* Selector alumno */}
            <div className="form-group">
              <label><strong>1. Seleccionar Alumno</strong></label>
              <select className="form-control" value={alumnoId} onChange={e => handleAlumnoChange(e.target.value)}>
                <option value="">Seleccionar alumno...</option>
                {alumnos.map(a => (
                  <option key={a.id} value={a.id}>{a.carnet} — {a.nombre} {a.apellido}</option>
                ))}
              </select>
            </div>

            {/* Info alumno */}
            {infoAlumno && (
              <div className="alert alert-info py-2 mb-3">
                <i className="fa fa-graduation-cap mr-2"></i>
                <strong>{infoAlumno.alumno?.nombre} {infoAlumno.alumno?.apellido}</strong>
                <br /><small>Carrera: <strong>{infoAlumno.carrera?.nombre}</strong></small>
                <br /><small>Plan: {infoAlumno.plan?.nombre} ({infoAlumno.plan?.version})</small>
              </div>
            )}

            {/* Loading */}
            {loadingCursos && (
              <div className="text-center py-3 text-muted">
                <i className="fa fa-spinner fa-spin mr-2"></i>Cargando cursos disponibles...
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="alert alert-danger py-2">
                <i className="fa fa-exclamation-triangle mr-2"></i>
                {error}
              </div>
            )}

            {/* Selector semestre */}
            {cursosDisponibles.length > 0 && (
              <div className="form-group">
                <label><strong>2. Seleccionar Semestre</strong></label>
                <select className="form-control" value={semestreSeleccionado}
                  onChange={e => { setSemestreSeleccionado(e.target.value); setCursosSeleccionados([]); }}>
                  <option value="">Seleccionar semestre...</option>
                  {cursosDisponibles.map(s => (
                    <option key={s.semestre} value={s.semestre}>
                      Semestre {s.semestre} — {s.totalDisponibles} disponible(s)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Cursos del semestre */}
            {semestreData && (
              <div className="form-group">
                <label><strong>3. Seleccionar Cursos</strong></label>
                <div className="list-group">
                  {semestreData.cursos.map(curso => (
                    <div key={curso.id}
                      className={`list-group-item list-group-item-action ${!curso.disponible ? "disabled bg-light" : ""}`}
                      style={{ cursor: curso.disponible ? "pointer" : "not-allowed" }}
                      onClick={() => curso.disponible && toggleCurso(curso.id)}>
                      <div className="d-flex align-items-start">
                        <input type="checkbox" className="mr-3 mt-1"
                          checked={cursosSeleccionados.includes(curso.id)}
                          onChange={() => {}}
                          disabled={!curso.disponible}
                        />
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center">
                            <strong>{curso.nombre}</strong>
                            <div>
                              {curso.obligatorio
                                ? <span className="tag tag-danger ml-1">Obligatorio</span>
                                : <span className="tag tag-warning ml-1">Optativo</span>}
                              <span className="tag tag-default ml-1">{curso.creditos} cr.</span>
                            </div>
                          </div>
                          <small className="text-muted">{curso.codigo}</small>
                          {curso.yaAprobado && <span className="tag tag-success ml-2">✓ Aprobado</span>}
                          {curso.yaAsignado && <span className="tag tag-warning ml-2">Ya asignado</span>}
                          {!curso.prerrequisitosOk && curso.prerrequisitosFaltantes.length > 0 && (
                            <div className="mt-1">
                              <small className="text-danger">
                                <i className="fa fa-lock mr-1"></i>
                                Prerrequisitos faltantes: {curso.prerrequisitosFaltantes.join(", ")}
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botón asignar */}
            {cursosSeleccionados.length > 0 && (
              <button className="btn btn-primary btn-block mt-3" onClick={handleAsignar} disabled={submitting}>
                {submitting
                  ? <><i className="fa fa-spinner fa-spin mr-2"></i>Asignando...</>
                  : <><i className="fa fa-check mr-2"></i>Asignar {cursosSeleccionados.length} curso(s) — Ciclo {CICLO_SIGUIENTE}</>
                }
              </button>
            )}

            {cursosDisponibles.length === 0 && alumnoId && !loadingCursos && !error && (
              <div className="alert alert-warning py-2 mt-3">
                <i className="fa fa-info-circle mr-2"></i>
                Este alumno no tiene carrera asignada o no hay plan de estudios activo.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de asignaciones */}
      <div className="col-lg-7 col-md-12">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Asignaciones Registradas ({asignaciones.length})</h3></div>
          <div className="table-responsive">
            <table className="table table-hover table-vcenter table-striped mb-0">
              <thead>
                <tr><th>Carnet</th><th>Alumno</th><th>Curso</th><th>Ciclo</th></tr>
              </thead>
              <tbody>
                {asignaciones.map(a => (
                  <tr key={a.id}>
                    <td><span className="tag tag-primary">{a.alumno?.carnet}</span></td>
                    <td>{a.alumno?.nombre} {a.alumno?.apellido}</td>
                    <td>
                      <strong>{a.curso?.nombre}</strong>
                      <br /><small className="text-muted">{a.curso?.codigo}</small>
                    </td>
                    <td><span className="tag tag-success">{a.ciclo}</span></td>
                  </tr>
                ))}
                {asignaciones.length === 0 && (
                  <tr><td colSpan="4" className="text-center text-muted py-4">No hay asignaciones registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SistemaAcademicoPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [alumnos, setAlumnos] = useState([]);
  const [catedraticos, setCatedraticos] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

  const [newAlumno, setNewAlumno] = useState({ carnet: "", nombre: "", apellido: "", email: "" });
  const [autoCarnet, setAutoCarnet] = useState(false);
  const [newCatedratico, setNewCatedratico] = useState({ codigo: "", nombre: "", apellido: "", email: "" });
  const [newCurso, setNewCurso] = useState({ codigo: "", nombre: "", creditos: "" });
  const [newCarrera, setNewCarrera] = useState({ codigo: "", nombre: "", facultad: "" });
  const [newHorario, setNewHorario] = useState({ cursoId: "", catedraticoId: "", dia: "", horaInicio: "", horaFin: "", salon: "", esAsincrono: false });
  const [newAsistencia, setNewAsistencia] = useState({ alumnoId: "", horarioId: "", fecha: "", presente: true });

  const handleDeleteAlumno = async (id, carnet) => {
    if (!confirm(`¿Eliminar al alumno con carnet ${carnet}? Esta acción también eliminará sus asignaciones y asistencias.`)) return;
    try {
      await axios.delete(`/api/sistema-academico/alumnos/${id}`);
      showNotification(`Alumno ${carnet} eliminado correctamente`);
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || error.message, "danger");
    }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resAlumnos, resCatedraticos, resCursos, resCarreras, resAsignaciones, resHorarios, resAsistencias, resSolicitudes] = await Promise.all([
        axios.get("/api/sistema-academico/alumnos"),
        axios.get("/api/sistema-academico/catedraticos"),
        axios.get("/api/sistema-academico/cursos"),
        axios.get("/api/sistema-academico/carreras"),
        axios.get("/api/sistema-academico/asignaciones"),
        axios.get("/api/sistema-academico/horarios"),
        axios.get("/api/sistema-academico/asistencias"),
        axios.get("/api/sistema-academico/solicitudes"),
      ]);
      setAlumnos(resAlumnos.data.data || []);
      setCatedraticos(resCatedraticos.data.data || []);
      setCursos(resCursos.data.data || []);
      setCarreras(resCarreras.data.data || []);
      setAsignaciones(resAsignaciones.data.data || []);
      setHorarios(resHorarios.data.data || []);
      setAsistencias(resAsistencias.data.data || []);
      setSolicitudes(resSolicitudes.data.data || []);
    } catch (error) {
      showNotification("Error cargando datos: " + (error.response?.data?.error || error.message), "danger");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 3000);
  };

  const handleCreateAlumno = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newAlumno, autoCarnet };
      const res = await axios.post("/api/sistema-academico/alumnos", payload);
      showNotification(res.data.message || "Alumno registrado exitosamente");
      setNewAlumno({ carnet: "", nombre: "", apellido: "", email: "" });
      setAutoCarnet(false);
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || error.message, "danger");
    }
  };

  const handleCreateCatedratico = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/sistema-academico/catedraticos", newCatedratico);
      showNotification("Catedrático registrado exitosamente");
      setNewCatedratico({ codigo: "", nombre: "", apellido: "", email: "" });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || error.message, "danger");
    }
  };

  const handleCreateCurso = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/sistema-academico/cursos", newCurso);
      showNotification("Curso creado exitosamente");
      setNewCurso({ codigo: "", nombre: "", creditos: "" });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || error.message, "danger");
    }
  };

  const handleCreateCarrera = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/sistema-academico/carreras", newCarrera);
      showNotification("Carrera creada exitosamente");
      setNewCarrera({ codigo: "", nombre: "", facultad: "" });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || error.message, "danger");
    }
  };

  const handleCreateHorario = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/sistema-academico/horarios", newHorario);
      showNotification("Horario creado exitosamente");
      setNewHorario({ cursoId: "", catedraticoId: "", dia: "", horaInicio: "", horaFin: "", salon: "", esAsincrono: false });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || error.message, "danger");
    }
  };

  const handleCreateAsistencia = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/sistema-academico/asistencias", newAsistencia);
      showNotification("Asistencia registrada exitosamente");
      setNewAsistencia({ alumnoId: "", horarioId: "", fecha: "", presente: true });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || error.message, "danger");
    }
  };

  const handleSolicitud = async (id, estado, motivo = null) => {
    try {
      await axios.put("/api/sistema-academico/solicitudes", { id, estado, motivo });
      showNotification(estado === "APROBADA" ? "Solicitud aprobada y alumno creado" : "Solicitud rechazada");
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || error.message, "danger");
    }
  };

  return (
    <div className="section-body">
      {notification.show && (
        <div className={`alert alert-${notification.type} position-fixed`} style={{ top: "20px", right: "20px", zIndex: 9999, minWidth: "300px" }}>
          {notification.message}
        </div>
      )}

      <div className="container-fluid">
        {/* TABS */}
        <div className="row clearfix">
          <div className="col-lg-12">
            <div className="card">
              <div className="card-body">
                <ul className="nav nav-tabs page-header-tab">
                  {[
                    { key: "dashboard", icon: "fa-dashboard", label: "Dashboard" },
                    { key: "alumnos", icon: "fa-users", label: "Alumnos" },
                    { key: "catedraticos", icon: "fa-chalkboard-teacher", label: "Catedráticos" },
                    { key: "cursos", icon: "fa-book", label: "Cursos" },
                    { key: "carreras", icon: "fa-graduation-cap", label: "Carreras" },
                    { key: "asignaciones", icon: "fa-link", label: "Asignaciones" },
                    { key: "horarios", icon: "fa-calendar", label: "Horarios" },
                    { key: "asistencias", icon: "fa-check-square", label: "Asistencias" },
                    { key: "solicitudes", icon: "fa-inbox", label: "Solicitudes" },
                  ].map(tab => (
                    <li className="nav-item" key={tab.key}>
                      <a className={`nav-link ${activeTab === tab.key ? "active" : ""}`} onClick={() => setActiveTab(tab.key)} href="#">
                        <i className={`fa ${tab.icon} mr-2`}></i>{tab.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <>
            <div className="row clearfix">
              {[
                { label: "Alumnos", value: alumnos.length, icon: "fa-users", color: "primary" },
                { label: "Catedráticos", value: catedraticos.length, icon: "fa-chalkboard-teacher", color: "success" },
                { label: "Cursos", value: cursos.length, icon: "fa-book", color: "warning" },
                { label: "Carreras", value: carreras.length, icon: "fa-graduation-cap", color: "info" },
                { label: "Asignaciones", value: asignaciones.length, icon: "fa-link", color: "danger" },
                { label: "Solicitudes Pendientes", value: solicitudes.filter(s => s.estado === "PENDIENTE").length, icon: "fa-inbox", color: "secondary" },
              ].map(card => (
                <div className="col-lg-2 col-md-4 col-sm-6" key={card.label}>
                  <div className="card">
                    <div className="card-body text-center p-4">
                      <div className={`h1 m-0 text-${card.color}`}><i className={`fa ${card.icon}`}></i> {card.value}</div>
                      <div className="text-muted mt-2">{card.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="row clearfix">
              <div className="col-lg-6">
                <div className="card">
                  <div className="card-header"><h3 className="card-title">Últimos Alumnos Registrados</h3></div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover table-vcenter table-striped mb-0">
                        <thead><tr><th>Carnet</th><th>Nombre</th><th>Carrera</th></tr></thead>
                        <tbody>
                          {alumnos.slice(0, 5).map(a => (
                            <tr key={a.id}>
                              <td><span className="tag tag-primary">{a.carnet}</span></td>
                              <td>{a.nombre} {a.apellido}</td>
                              <td className="text-muted">{a.carrera?.nombre || "—"}</td>
                            </tr>
                          ))}
                          {alumnos.length === 0 && <tr><td colSpan="3" className="text-center text-muted">Sin alumnos registrados</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="card">
                  <div className="card-header"><h3 className="card-title">Horarios por Día</h3></div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover table-vcenter table-striped mb-0">
                        <thead><tr><th>Curso</th><th>Catedrático</th><th>Día</th><th>Bloque</th></tr></thead>
                        <tbody>
                          {horarios.slice(0, 5).map(h => (
                            <tr key={h.id}>
                              <td>{h.curso?.nombre}</td>
                              <td>{h.catedratico?.nombre} {h.catedratico?.apellido}</td>
                              <td><span className="tag tag-info">{h.dia}</span></td>
                              <td>{h.esAsincrono ? <span className="tag tag-warning">Asincrónico</span> : `${h.horaInicio} - ${h.horaFin}`}</td>
                            </tr>
                          ))}
                          {horarios.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Sin horarios registrados</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ALUMNOS */}
        {activeTab === "alumnos" && (
          <div className="row clearfix">
            <div className="col-lg-4 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Nuevo Alumno</h3></div>
                <div className="card-body">
                  <form onSubmit={handleCreateAlumno}>
                    <div className="form-group">
                      <label>Tipo de registro</label>
                      <div className="d-flex" style={{ gap: "10px" }}>
                        <button type="button" className={`btn btn-sm ${!autoCarnet ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => setAutoCarnet(false)}>
                          <i className="fa fa-user mr-1"></i> Alumno existente
                        </button>
                        <button type="button" className={`btn btn-sm ${autoCarnet ? "btn-success" : "btn-outline-secondary"}`} onClick={() => setAutoCarnet(true)}>
                          <i className="fa fa-magic mr-1"></i> Alumno nuevo
                        </button>
                      </div>
                      <small className="text-muted mt-1 d-block">
                        {autoCarnet ? "Se generará un carnet automático con formato 260XXXX" : "Ingresa el carnet del alumno existente"}
                      </small>
                    </div>
                    {!autoCarnet && (
                      <div className="form-group">
                        <label>Carnet</label>
                        <input type="text" className="form-control" placeholder="Ej: 2400111" value={newAlumno.carnet} onChange={e => setNewAlumno({ ...newAlumno, carnet: e.target.value })} required={!autoCarnet} />
                      </div>
                    )}
                    <div className="form-group">
                      <label>Nombre</label>
                      <input type="text" className="form-control" placeholder="Nombre" value={newAlumno.nombre} onChange={e => setNewAlumno({ ...newAlumno, nombre: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Apellido</label>
                      <input type="text" className="form-control" placeholder="Apellido" value={newAlumno.apellido} onChange={e => setNewAlumno({ ...newAlumno, apellido: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" className="form-control" placeholder="correo@gmail.com" value={newAlumno.email} onChange={e => setNewAlumno({ ...newAlumno, email: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Registrar Alumno</button>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-lg-8 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Listado de Alumnos ({alumnos.length})</h3></div>
                <div className="table-responsive">
                  <table className="table table-hover table-vcenter table-striped mb-0 text-nowrap">
                    <thead><tr><th>Carnet</th><th>Nombre</th><th>Email</th><th>Correo Inst.</th><th>Carrera</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>
                      {alumnos.map(a => (
                        <tr key={a.id}>
                          <td><span className="tag tag-primary">{a.carnet}</span></td>
                          <td>{a.nombre} {a.apellido}</td>
                          <td className="text-muted">{a.email}</td>
                          <td>{a.correoInstitucional ? <span className="tag tag-info">{a.correoInstitucional}</span> : <span className="text-muted">—</span>}</td>
                          <td>{a.carrera?.nombre || <span className="text-muted">—</span>}</td>
                          <td><span className={`tag ${a.activo ? "tag-success" : "tag-danger"}`}>{a.activo ? "Activo" : "Inactivo"}</span></td>
                          <td>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteAlumno(a.id, a.carnet)} title="Eliminar">
                              <i className="fa fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {alumnos.length === 0 && <tr><td colSpan="7" className="text-center text-muted">No hay alumnos registrados</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CATEDRÁTICOS */}
        {activeTab === "catedraticos" && (
          <div className="row clearfix">
            <div className="col-lg-4 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Nuevo Catedrático</h3></div>
                <div className="card-body">
                  <form onSubmit={handleCreateCatedratico}>
                    <div className="form-group">
                      <label>Código</label>
                      <input type="text" className="form-control" placeholder="Ej: CAT-001" value={newCatedratico.codigo} onChange={e => setNewCatedratico({ ...newCatedratico, codigo: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Nombre</label>
                      <input type="text" className="form-control" placeholder="Nombre" value={newCatedratico.nombre} onChange={e => setNewCatedratico({ ...newCatedratico, nombre: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Apellido</label>
                      <input type="text" className="form-control" placeholder="Apellido" value={newCatedratico.apellido} onChange={e => setNewCatedratico({ ...newCatedratico, apellido: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" className="form-control" placeholder="correo@uspg.edu.gt" value={newCatedratico.email} onChange={e => setNewCatedratico({ ...newCatedratico, email: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Registrar Catedrático</button>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-lg-8 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Listado de Catedráticos ({catedraticos.length})</h3></div>
                <div className="table-responsive">
                  <table className="table table-hover table-vcenter table-striped mb-0 text-nowrap">
                    <thead><tr><th>Código</th><th>Nombre</th><th>Email</th><th>Estado</th><th>Horarios</th></tr></thead>
                    <tbody>
                      {catedraticos.map(c => (
                        <tr key={c.id}>
                          <td><span className="tag tag-success">{c.codigo}</span></td>
                          <td>{c.nombre} {c.apellido}</td>
                          <td className="text-muted">{c.email}</td>
                          <td><span className={`tag ${c.activo ? "tag-success" : "tag-danger"}`}>{c.activo ? "Activo" : "Inactivo"}</span></td>
                          <td><span className="tag tag-default">{c.horarios?.length || 0} horarios</span></td>
                        </tr>
                      ))}
                      {catedraticos.length === 0 && <tr><td colSpan="5" className="text-center text-muted">No hay catedráticos registrados</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CURSOS */}
        {activeTab === "cursos" && (
          <div className="row clearfix">
            <div className="col-lg-4 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Nuevo Curso</h3></div>
                <div className="card-body">
                  <form onSubmit={handleCreateCurso}>
                    <div className="form-group">
                      <label>Código</label>
                      <input type="text" className="form-control" placeholder="Ej: ISC-101" value={newCurso.codigo} onChange={e => setNewCurso({ ...newCurso, codigo: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Nombre</label>
                      <input type="text" className="form-control" placeholder="Nombre del curso" value={newCurso.nombre} onChange={e => setNewCurso({ ...newCurso, nombre: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Créditos</label>
                      <input type="number" className="form-control" min="1" max="10" placeholder="Ej: 4" value={newCurso.creditos} onChange={e => setNewCurso({ ...newCurso, creditos: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Crear Curso</button>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-lg-8 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Catálogo de Cursos ({cursos.length})</h3></div>
                <div className="card-body p-0">
                  {/* Agrupar por carrera */}
                  {carreras.map(carrera => {
                    const cursosDeCarrera = cursos.filter(c => c.codigo.startsWith(carrera.codigo));
                    if (cursosDeCarrera.length === 0) return null;
                    return (
                      <div key={carrera.id} className="mb-0">
                        <div className="px-4 py-2" style={{ background: "#f8f9fa", borderBottom: "1px solid #dee2e6" }}>
                          <strong><i className="fa fa-graduation-cap mr-2 text-primary"></i>{carrera.nombre}</strong>
                          <span className="tag tag-default ml-2">{cursosDeCarrera.length} cursos</span>
                        </div>
                        <div className="table-responsive">
                          <table className="table table-hover table-vcenter mb-0">
                            <tbody>
                              {cursosDeCarrera.map(c => (
                                <tr key={c.id}>
                                  <td><span className="tag tag-warning">{c.codigo}</span></td>
                                  <td>{c.nombre}</td>
                                  <td><span className="tag tag-default">{c.creditos} cr.</span></td>
                                  <td><span className="tag tag-info">{c.horarios?.length || 0} horarios</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                  {cursos.length === 0 && <div className="text-center text-muted py-4">No hay cursos registrados</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CARRERAS */}
        {activeTab === "carreras" && (
          <div className="row clearfix">
            <div className="col-lg-4 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Nueva Carrera</h3></div>
                <div className="card-body">
                  <form onSubmit={handleCreateCarrera}>
                    <div className="form-group">
                      <label>Código</label>
                      <input type="text" className="form-control" placeholder="Ej: ISC" value={newCarrera.codigo} onChange={e => setNewCarrera({ ...newCarrera, codigo: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Nombre</label>
                      <input type="text" className="form-control" placeholder="Nombre de la carrera" value={newCarrera.nombre} onChange={e => setNewCarrera({ ...newCarrera, nombre: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Facultad</label>
                      <input type="text" className="form-control" placeholder="Ej: Ciencias Empresariales" value={newCarrera.facultad} onChange={e => setNewCarrera({ ...newCarrera, facultad: e.target.value })} />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Crear Carrera</button>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-lg-8 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Listado de Carreras ({carreras.length})</h3></div>
                <div className="table-responsive">
                  <table className="table table-hover table-vcenter table-striped mb-0 text-nowrap">
                    <thead><tr><th>Código</th><th>Nombre</th><th>Nivel</th><th>Facultad</th><th>Alumnos</th></tr></thead>
                    <tbody>
                      {carreras.map(c => (
                        <tr key={c.id}>
                          <td><span className="tag tag-info">{c.codigo}</span></td>
                          <td>{c.nombre}</td>
                          <td><span className="tag tag-default">{c.nivel}</span></td>
                          <td className="text-muted">{c.facultad || "—"}</td>
                          <td><span className="tag tag-default">{c._count?.alumnos || 0} alumnos</span></td>
                        </tr>
                      ))}
                      {carreras.length === 0 && <tr><td colSpan="5" className="text-center text-muted">No hay carreras registradas</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ASIGNACIONES */}
        {activeTab === "asignaciones" && (
          <AsignacionesPanel
            alumnos={alumnos}
            asignaciones={asignaciones}
            showNotification={showNotification}
            onAsignacionCreada={fetchData}
          />
        )}

        {/* HORARIOS */}
        {activeTab === "horarios" && (
          <div className="row clearfix">
            <div className="col-lg-4 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Nuevo Horario</h3></div>
                <div className="card-body">
                  <form onSubmit={handleCreateHorario}>
                    <div className="form-group">
                      <label>Curso</label>
                      <select className="form-control" value={newHorario.cursoId} onChange={e => setNewHorario({ ...newHorario, cursoId: e.target.value })} required>
                        <option value="">Seleccionar curso...</option>
                        {cursos.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Catedrático</label>
                      <select className="form-control" value={newHorario.catedraticoId} onChange={e => setNewHorario({ ...newHorario, catedraticoId: e.target.value })} required>
                        <option value="">Seleccionar catedrático...</option>
                        {catedraticos.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Tipo de clase</label>
                      <select className="form-control" value={newHorario.esAsincrono}
                        onChange={e => setNewHorario({ ...newHorario, esAsincrono: e.target.value === "true", dia: "", horaInicio: "", horaFin: "" })}>
                        <option value="false">Presencial / Sincrónica</option>
                        <option value="true">Asincrónica (sin horario fijo)</option>
                      </select>
                    </div>
                    {!newHorario.esAsincrono && (
                      <div className="form-group">
                        <label>Día y Bloque</label>
                        <select className="form-control"
                          value={`${newHorario.dia}|${newHorario.horaInicio}|${newHorario.horaFin}`}
                          onChange={e => {
                            const [dia, horaInicio, horaFin] = e.target.value.split("|");
                            setNewHorario({ ...newHorario, dia, horaInicio, horaFin });
                          }} required={!newHorario.esAsincrono}>
                          <option value="||">Seleccionar bloque...</option>
                          <optgroup label="── Viernes ──">
                            {BLOQUES_HORARIO.filter(b => b.dia === "Viernes").map(b => (
                              <option key={b.label} value={`${b.dia}|${b.horaInicio}|${b.horaFin}`}>{b.label}</option>
                            ))}
                          </optgroup>
                          <optgroup label="── Sábado ──">
                            {BLOQUES_HORARIO.filter(b => b.dia === "Sábado").map(b => (
                              <option key={b.label} value={`${b.dia}|${b.horaInicio}|${b.horaFin}`}>{b.label}</option>
                            ))}
                          </optgroup>
                        </select>
                        {newHorario.dia && (
                          <div className="alert alert-info py-2 mt-2">
                            <i className="fa fa-calendar mr-2"></i>
                            <strong>{newHorario.dia}</strong> de <strong>{newHorario.horaInicio}</strong> a <strong>{newHorario.horaFin}</strong>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="form-group">
                      <label>Salón {newHorario.esAsincrono && <small className="text-muted">(opcional para asincrónicos)</small>}</label>
                      <input type="text" className="form-control" placeholder="Ej: S-01" value={newHorario.salon}
                        onChange={e => setNewHorario({ ...newHorario, salon: e.target.value })}
                        required={!newHorario.esAsincrono} />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Crear Horario</button>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-lg-8 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Horarios Registrados ({horarios.length})</h3></div>
                <div className="card-body p-0">
                  {["Viernes", "Sábado"].map(dia => {
                    const horariosDelDia = horarios.filter(h => h.dia === dia);
                    if (horariosDelDia.length === 0) return null;
                    return (
                      <div key={dia}>
                        <div className="px-4 py-2" style={{ background: "#6B2C3E", color: "white" }}>
                          <strong><i className="fa fa-calendar mr-2"></i>{dia}</strong>
                          <span className="ml-2" style={{ opacity: 0.8, fontSize: "12px" }}>
                            {dia === "Sábado" ? "7:00am - 5:00pm (almuerzo 11:30am - 12:30pm)" : "6:00pm - 10:30pm"}
                          </span>
                        </div>
                        <div className="table-responsive">
                          <table className="table table-hover table-vcenter mb-0">
                            <thead><tr><th>Bloque</th><th>Curso</th><th>Catedrático</th><th>Salón</th><th>Tipo</th></tr></thead>
                            <tbody>
                              {horariosDelDia.sort((a, b) => a.horaInicio?.localeCompare(b.horaInicio)).map(h => (
                                <tr key={h.id}>
                                  <td><span className="tag tag-info">{h.esAsincrono ? "Flexible" : `${h.horaInicio} - ${h.horaFin}`}</span></td>
                                  <td><strong>{h.curso?.nombre}</strong><br /><small className="text-muted">{h.curso?.codigo}</small></td>
                                  <td>{h.catedratico?.nombre} {h.catedratico?.apellido}</td>
                                  <td>{h.salon || <span className="text-muted">—</span>}</td>
                                  <td><span className={`tag ${h.esAsincrono ? "tag-warning" : "tag-success"}`}>{h.esAsincrono ? "Asincrónica" : "Presencial"}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                  {/* Asincrónicos */}
                  {horarios.filter(h => h.esAsincrono).length > 0 && (
                    <div>
                      <div className="px-4 py-2" style={{ background: "#e67e22", color: "white" }}>
                        <strong><i className="fa fa-clock-o mr-2"></i>Asincrónicos</strong>
                      </div>
                      <div className="table-responsive">
                        <table className="table table-hover table-vcenter mb-0">
                          <thead><tr><th>Curso</th><th>Catedrático</th><th>Tipo</th></tr></thead>
                          <tbody>
                            {horarios.filter(h => h.esAsincrono).map(h => (
                              <tr key={h.id}>
                                <td><strong>{h.curso?.nombre}</strong><br /><small className="text-muted">{h.curso?.codigo}</small></td>
                                <td>{h.catedratico?.nombre} {h.catedratico?.apellido}</td>
                                <td><span className="tag tag-warning">Sin horario fijo</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {horarios.length === 0 && <div className="text-center text-muted py-4">No hay horarios registrados</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ASISTENCIAS */}
        {activeTab === "asistencias" && (
          <div className="row clearfix">
            <div className="col-lg-4 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Registrar Asistencia</h3></div>
                <div className="card-body">
                  <form onSubmit={handleCreateAsistencia}>
                    <div className="form-group">
                      <label>Alumno</label>
                      <select className="form-control" value={newAsistencia.alumnoId} onChange={e => setNewAsistencia({ ...newAsistencia, alumnoId: e.target.value })} required>
                        <option value="">Seleccionar alumno...</option>
                        {alumnos.map(a => <option key={a.id} value={a.id}>{a.carnet} — {a.nombre} {a.apellido}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Horario</label>
                      <select className="form-control" value={newAsistencia.horarioId} onChange={e => setNewAsistencia({ ...newAsistencia, horarioId: e.target.value })} required>
                        <option value="">Seleccionar horario...</option>
                        {horarios.map(h => <option key={h.id} value={h.id}>{h.curso?.nombre} — {h.dia} {h.horaInicio}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Fecha</label>
                      <input type="date" className="form-control" value={newAsistencia.fecha} onChange={e => setNewAsistencia({ ...newAsistencia, fecha: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Estado</label>
                      <select className="form-control" value={newAsistencia.presente} onChange={e => setNewAsistencia({ ...newAsistencia, presente: e.target.value === "true" })}>
                        <option value="true">Presente</option>
                        <option value="false">Ausente</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Registrar Asistencia</button>
                  </form>
                </div>
              </div>
            </div>
            <div className="col-lg-8 col-md-12">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Registro de Asistencias ({asistencias.length})</h3></div>
                <div className="table-responsive">
                  <table className="table table-hover table-vcenter table-striped mb-0 text-nowrap">
                    <thead><tr><th>Alumno</th><th>Curso</th><th>Fecha</th><th>Estado</th></tr></thead>
                    <tbody>
                      {asistencias.map(a => (
                        <tr key={a.id}>
                          <td>{a.alumno?.nombre} {a.alumno?.apellido}</td>
                          <td>{a.horario?.curso?.nombre}</td>
                          <td>{new Date(a.fecha).toLocaleDateString()}</td>
                          <td><span className={`tag ${a.presente ? "tag-success" : "tag-danger"}`}>{a.presente ? "Presente" : "Ausente"}</span></td>
                        </tr>
                      ))}
                      {asistencias.length === 0 && <tr><td colSpan="4" className="text-center text-muted">No hay asistencias registradas</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SOLICITUDES */}
        {activeTab === "solicitudes" && (
          <div className="row clearfix">
            <div className="col-lg-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Solicitudes de Inscripción ({solicitudes.length})</h3>
                  <div className="card-options">
                    <span className="tag tag-warning mr-2">{solicitudes.filter(s => s.estado === "PENDIENTE").length} pendientes</span>
                    <span className="tag tag-success mr-2">{solicitudes.filter(s => s.estado === "APROBADA").length} aprobadas</span>
                    <span className="tag tag-danger">{solicitudes.filter(s => s.estado === "RECHAZADA").length} rechazadas</span>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover table-vcenter table-striped mb-0">
                    <thead>
                      <tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Carrera</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {solicitudes.map(s => (
                        <tr key={s.id}>
                          <td><strong>{s.nombre} {s.apellido}</strong></td>
                          <td className="text-muted">{s.email}</td>
                          <td>{s.telefono}</td>
                          <td>{s.carrera?.nombre}</td>
                          <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                          <td><span className={`tag ${s.estado === "PENDIENTE" ? "tag-warning" : s.estado === "APROBADA" ? "tag-success" : "tag-danger"}`}>{s.estado}</span></td>
                          <td>
                            {s.estado === "PENDIENTE" && (
                              <>
                                <button className="btn btn-sm btn-success mr-1" onClick={() => handleSolicitud(s.id, "APROBADA")}>
                                  <i className="fa fa-check mr-1"></i>Aprobar
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleSolicitud(s.id, "RECHAZADA", "No cumple requisitos")}>
                                  <i className="fa fa-times mr-1"></i>Rechazar
                                </button>
                              </>
                            )}
                            {s.estado !== "PENDIENTE" && <span className="text-muted">—</span>}
                          </td>
                        </tr>
                      ))}
                      {solicitudes.length === 0 && (
                        <tr><td colSpan="7" className="text-center text-muted py-4"><i className="fa fa-inbox fa-2x mb-2 d-block"></i>No hay solicitudes</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}