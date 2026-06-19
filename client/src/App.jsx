import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Users,
  BarChart3,
  Mail,
  MapPin,
  Clock,
  Phone,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  User,
  Search,
  Download,
  Menu,
  X,
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react';

const API_BASE = "https://sapu-backend.onrender.com/api";

export default function App() {
  const [view, setView] = useState('client'); // 'client' | 'admin'
  const [adminTab, setAdminTab] = useState('appointments'); // 'appointments' | 'patients' | 'dashboard' | 'emails' | 'reports'

  // Formulario
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    date: '',
    time: '09:00',
    motive: 'Consulta General'
  });

  const [calculatedAge, setCalculatedAge] = useState(null);
  const [ageGroup, setAgeGroup] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Datos Admin
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [emailLogs, setEmailLogs] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [apptFilter, setApptFilter] = useState('All');

  const mapInstance = useRef(null);

  // Calcular edad en base a la fecha de nacimiento en el formulario
  useEffect(() => {
    if (!formData.dob) {
      setCalculatedAge(null);
      setAgeGroup('');
      return;
    }
    const dobDate = new Date(formData.dob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }

    const finalAge = isNaN(age) ? null : Math.max(0, age);
    setCalculatedAge(finalAge);

    if (finalAge !== null) {
      if (finalAge < 15) {
        setAgeGroup('Niño');
      } else if (finalAge < 65) {
        setAgeGroup('Adulto');
      } else {
        setAgeGroup('Adulto Mayor');
      }
    }
  }, [formData.dob]);

  // Cargar mapa Leaflet en la vista de cliente
  useEffect(() => {
    if (view === 'client' && !bookingSuccess) {
      // Pequeño delay para asegurar que el div del mapa ya está renderizado
      const timer = setTimeout(() => {
        const mapContainer = document.getElementById('sapu-map');
        if (mapContainer && !mapInstance.current) {
          try {
            // SAPU Santa Rosa de Chena: -33.564063, -70.795882 (Teniente Sanz 823, Padre Hurtado)
            const map = window.L.map('sapu-map', {
              scrollWheelZoom: false
            }).setView([-33.564063, -70.795882], 16);

            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; OpenStreetMap'
            }).addTo(map);

            const marker = window.L.marker([-33.564063, -70.795882]).addTo(map);
            marker.bindPopup(`
              <div style="font-family: 'Inter', sans-serif; color: #1f2937;">
                <h4 style="margin: 0 0 4px 0; color: #0d9488;">SAPU Santa Rosa de Chena</h4>
                <p style="margin: 0; font-size: 12px;">Teniente Sanz 823, Padre Hurtado</p>
              </div>
            `).openPopup();

            mapInstance.current = map;
          } catch (e) {
            console.error('Error al inicializar el mapa Leaflet:', e);
          }
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }
      };
    }
  }, [view, bookingSuccess]);

  // Cargar datos de administración cuando cambiamos a la vista admin
  useEffect(() => {
    if (view === 'admin') {
      fetchAdminData();
    }
  }, [view, adminTab]);

  const fetchAdminData = async () => {
    setAdminLoading(true);
    try {
      const apptsRes = await fetch(`${API_BASE}/appointments`);
      const apptsData = await apptsRes.json();
      setAppointments(apptsData);

      const ptsRes = await fetch(`${API_BASE}/patients`);
      const ptsData = await ptsRes.json();
      setPatients(ptsData);

      const dashRes = await fetch(`${API_BASE}/dashboard`);
      const dashData = await dashRes.json();
      setDashboardData(dashData);

      const emailRes = await fetch(`${API_BASE}/emails/logs`);
      const emailData = await emailRes.json();
      setEmailLogs(emailData.reverse()); // Mostrar los más recientes primero
    } catch (error) {
      console.error('Error al cargar datos del panel:', error);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingLoading(true);
    setBookingError('');
    try {
      const response = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error al agendar.');
      }

      setBookingSuccess(true);
      // Limpiar formulario
      setFormData({
        name: '',
        email: '',
        phone: '',
        dob: '',
        date: '',
        time: '09:00',
        motive: 'Consulta General'
      });
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleStatusChange = async (apptId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/appointments/${apptId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        // Recargar datos para refrescar la lista y gráficos
        fetchAdminData();
        // Si hay un paciente seleccionado, refrescar también sus detalles
        if (selectedPatient) {
          const updatedPatient = patients.find(p => p.id === selectedPatient.id);
          if (updatedPatient) {
            // Actualizar paciente seleccionado
            const updatedHistory = selectedPatient.history.map(h =>
              h.id === apptId ? { ...h, status: newStatus } : h
            );
            setSelectedPatient({ ...selectedPatient, history: updatedHistory });
          }
        }
      }
    } catch (error) {
      console.error('Error al actualizar estado:', error);
    }
  };

  const downloadReport = () => {
    window.open(`${API_BASE}/report/csv`, '_blank');
  };

  const getPatientAgeGroup = (dobStr, apptDateStr) => {
    const dob = new Date(dobStr);
    const appt = new Date(apptDateStr);
    let age = appt.getFullYear() - dob.getFullYear();
    const m = appt.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && appt.getDate() < dob.getDate())) {
      age--;
    }
    const finalAge = isNaN(age) ? 30 : age;
    if (finalAge < 15) return 'Niño';
    if (finalAge < 65) return 'Adulto';
    return 'Adulto Mayor';
  };

  // Filtrado de citas
  const filteredAppointments = appointments.filter(appt => {
    const matchesStatus = apptFilter === 'All' || appt.status === apptFilter;
    const matchesSearch =
      appt.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.patient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.motive.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filtrado de pacientes
  const filteredPatients = patients.filter(pt => {
    return (
      pt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pt.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pt.phone.includes(searchQuery)
    );
  });

  return (
    <div className="app-container">
      {/* Header */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-main)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '1rem 1.5rem'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setView('client')}>
            <span style={{ fontSize: '2rem' }}>🏥</span>
            <div>
              <h1 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                SAPU <span style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 600, background: 'var(--color-primary-glow)', padding: '2px 8px', borderRadius: '4px' }}>Padre Hurtado</span>
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Portal Digital de Agendamiento</p>
            </div>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => {
              setView(view === 'client' ? 'admin' : 'client');
              setSelectedPatient(null);
              setSelectedEmail(null);
              setSearchQuery('');
            }}
          >
            {view === 'client' ? (
              <>
                <ShieldAlert size={18} style={{ color: 'var(--color-pending)' }} />
                <span>Panel de Administración</span>
              </>
            ) : (
              <>
                <User size={18} style={{ color: 'var(--color-primary-light)' }} />
                <span>Ir al Portal de Pacientes</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">

        {/* =============================================================== */}
        {/* 1. PORTAL DE PACIENTES */}
        {/* =============================================================== */}
        {view === 'client' && (
          <div className="animate-fade-in">
            {bookingSuccess ? (
              <div className="glass-card" style={{ maxWidth: '600px', margin: '4rem auto', padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ background: 'var(--color-success-bg)', padding: '1rem', borderRadius: '50%', color: 'var(--color-success)' }}>
                  <CheckCircle2 size={64} />
                </div>
                <h2 style={{ fontSize: '2rem', color: 'var(--text-dark)' }}>¡Solicitud Enviada Exitosamente!</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '450px' }}>
                  Tu cita ha sido ingresada en nuestro sistema con estado <strong style={{ color: 'var(--color-pending)' }}>Pendiente</strong>. Hemos enviado un correo a tu casilla electrónica para confirmar la solicitud.
                </p>
                <div style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid var(--border-main)', padding: '1rem 1.5rem', borderRadius: '8px', width: '100%', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  💡 Recuerda revisar tu bandeja de entrada (y la carpeta de spam). Te enviaremos otro correo en cuanto tu cita sea confirmada por el personal de administración.
                </div>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setBookingSuccess(false)}>
                  Agendar otra Hora
                </button>
              </div>
            ) : (
              <div>
                {/* Hero Banner */}
                <div className="glass-card" style={{
                  padding: '2.5rem',
                  marginBottom: '2rem',
                  background: 'linear-gradient(135deg, rgba(219, 39, 119, 0.08) 0%, rgba(244, 63, 94, 0.03) 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', right: '-50px', bottom: '-50px', fontSize: '12rem', opacity: 0.08 }}>🩺</div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', letterSpacing: '0.1em' }}>Servicio de Atención Primaria de Urgencia</span>
                  <h2 style={{ fontSize: '2.25rem', color: 'var(--text-dark)', maxWidth: '800px', lineHeight: 1.2 }}>
                    Agenda tu Cita Médica de Forma Rápida y Digital
                  </h2>
                  <p style={{ color: 'var(--text-muted)', maxWidth: '650px', fontSize: '1.05rem', margin: 0 }}>
                    Evita las largas esperas solicitando tu hora en línea. El sistema clasificará automáticamente al paciente según su rango de edad (Niño, Adulto, Adulto Mayor) para brindarte la atención especializada correspondiente.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      <Clock size={16} style={{ color: 'var(--color-primary-light)' }} />
                      <span>Atención SAPU: Lun-Vie 08:00 - 20:00 | Sáb-Dom 24 Horas</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      <MapPin size={16} style={{ color: 'var(--color-primary-light)' }} />
                      <span>Teniente Sanz 823, Padre Hurtado</span>
                    </div>
                  </div>
                </div>

                {/* Formulario & Mapa Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="grid-cols-dashboard">

                  {/* Formulario */}
                  <div className="glass-card" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.5rem', color: 'var(--text-dark)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar style={{ color: 'var(--color-primary)' }} />
                      Formulario de Agendamiento
                    </h3>

                    {bookingError && (
                      <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <XCircle size={18} />
                        <span>{bookingError}</span>
                      </div>
                    )}

                    <form onSubmit={handleBookingSubmit}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label htmlFor="name">Nombre Completo del Paciente</label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            placeholder="Ej: Juan Pérez"
                            className="input-field"
                            value={formData.name}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="email">Correo Electrónico (para notificaciones)</label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            placeholder="ejemplo@correo.com"
                            className="input-field"
                            value={formData.email}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label htmlFor="phone">Teléfono de Contacto</label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            required
                            placeholder="Ej: +56912345678"
                            className="input-field"
                            value={formData.phone}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="dob">Fecha de Nacimiento</label>
                          <input
                            type="date"
                            id="dob"
                            name="dob"
                            required
                            min={new Date(new Date().setFullYear(new Date().getFullYear() - 120)).toISOString().split('T')[0]}
                            max={new Date().toISOString().split('T')[0]}
                            className="input-field"
                            value={formData.dob}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      {/* Visualizador de Categoría de Edad en Tiempo Real */}
                      {calculatedAge !== null && (
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.5)',
                          border: '1px solid var(--border-main)',
                          borderRadius: '8px',
                          padding: '0.75rem 1rem',
                          marginBottom: '1.25rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Clasificación del Paciente:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{calculatedAge} años</span>
                            <span className={`badge ${ageGroup === 'Niño' ? 'badge-kid' :
                              ageGroup === 'Adulto' ? 'badge-adult' : 'badge-senior'
                              }`}>
                              {ageGroup}
                            </span>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label htmlFor="date">Fecha de la Cita</label>
                          <input
                            type="date"
                            id="date"
                            name="date"
                            required
                            min={new Date().toISOString().split('T')[0]}
                            max={new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]}
                            className="input-field"
                            value={formData.date}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="time">Bloque Horario</label>
                          <select
                            id="time"
                            name="time"
                            required
                            className="input-field"
                            value={formData.time}
                            onChange={handleInputChange}
                          >
                            <option value="08:00">08:00 hrs</option>
                            <option value="08:30">08:30 hrs</option>
                            <option value="09:00">09:00 hrs</option>
                            <option value="09:30">09:30 hrs</option>
                            <option value="10:00">10:00 hrs</option>
                            <option value="10:30">10:30 hrs</option>
                            <option value="11:00">11:00 hrs</option>
                            <option value="11:30">11:30 hrs</option>
                            <option value="12:00">12:00 hrs</option>
                            <option value="12:30">12:30 hrs</option>
                            <option value="14:00">14:00 hrs</option>
                            <option value="14:30">14:30 hrs</option>
                            <option value="15:00">15:00 hrs</option>
                            <option value="15:30">15:30 hrs</option>
                            <option value="16:00">16:00 hrs</option>
                            <option value="16:30">16:30 hrs</option>
                            <option value="17:00">17:00 hrs</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="motive">Motivo de la Consulta / Tipo de Cita</label>
                        <select
                          id="motive"
                          name="motive"
                          required
                          className="input-field"
                          value={formData.motive}
                          onChange={handleInputChange}
                        >
                          <option value="Consulta General">Consulta General</option>
                          <option value="Control Niño Sano">Control Niño Sano</option>
                          <option value="Control Cardiovascular">Control Cardiovascular</option>
                          <option value="Control Crónicos">Control Crónicos</option>
                          <option value="Vacunación">Vacunación</option>
                          <option value="Urgencia Respiratoria">Urgencia Respiratoria</option>
                          <option value="Atención Dental">Atención Dental</option>
                          <option value="Otros">Otro motivo</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={bookingLoading}
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem', height: '48px' }}
                      >
                        {bookingLoading ? 'Procesando Cita...' : 'Confirmar y Agendar Hora'}
                        <ArrowRight size={18} />
                      </button>
                    </form>
                  </div>

                  {/* Mapa e Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <h3 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <MapPin style={{ color: 'var(--color-primary)' }} />
                        Ubicación del SAPU
                      </h3>

                      <div id="sapu-map"></div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        <p style={{ margin: 0, color: 'var(--text-main)' }}><strong>Dirección:</strong> Teniente Sanz 823, Padre Hurtado, Región Metropolitana.</p>
                        <p style={{ margin: 0 }}>📍 SAPU asociado al CESFAM Santa Rosa de Chena. Ubicado a pocas cuadras de la Av. Camino a Melipilla.</p>
                        <a
                          href="https://www.google.com/maps/search/?api=1&query=Teniente+Sanz+823,+Padre+Hurtado"
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{ textDecoration: 'none', width: '100%', marginTop: '0.5rem', fontSize: '0.85rem' }}
                        >
                          Ver indicaciones en Google Maps
                        </a>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* =============================================================== */}
        {/* 2. PORTAL DE ADMINISTRACIÓN */}
        {/* =============================================================== */}
        {view === 'admin' && (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>

            {/* Admin navigation bar */}
            <div className="glass-card" style={{ padding: '0.75rem 1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className={`btn ${adminTab === 'appointments' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setAdminTab('appointments'); setSelectedPatient(null); }}
                >
                  <Calendar size={16} />
                  <span>Citas Pendientes/Hacer</span>
                </button>
                <button
                  className={`btn ${adminTab === 'patients' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setAdminTab('patients'); setSelectedPatient(null); }}
                >
                  <Users size={16} />
                  <span>Historial de Clientes</span>
                </button>
                <button
                  className={`btn ${adminTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setAdminTab('dashboard'); setSelectedPatient(null); }}
                >
                  <BarChart3 size={16} />
                  <span>Dashboard y Analítica</span>
                </button>
                <button
                  className={`btn ${adminTab === 'emails' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setAdminTab('emails'); setSelectedPatient(null); }}
                >
                  <Mail size={16} />
                  <span>Simulador de Correos</span>
                </button>
                <button
                  className={`btn ${adminTab === 'reports' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setAdminTab('reports'); setSelectedPatient(null); setSearchQuery(''); }}
                >
                  <FileText size={16} />
                  <span>Reportes y Descargas</span>
                </button>
              </div>

              {adminTab !== 'dashboard' && adminTab !== 'emails' && adminTab !== 'reports' && (
                <div style={{ position: 'relative', width: '250px' }}>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="input-field"
                    style={{ width: '100%', paddingLeft: '2.25rem', height: '36px', fontSize: '0.85rem' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '11px', color: 'var(--text-muted)' }} />
                </div>
              )}

              {adminTab === 'dashboard' && (
                <button className="btn btn-secondary" onClick={downloadReport} style={{ height: '38px', gap: '0.35rem', fontSize: '0.85rem' }}>
                  <Download size={14} />
                  <span>Descargar Reporte CSV</span>
                </button>
              )}
            </div>

            {/* TAB: CITAS POR HACER */}
            {adminTab === 'appointments' && (
              <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar style={{ color: 'var(--color-primary)' }} />
                    Citas Médicas Programadas
                  </h3>

                  <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.03)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
                    {['All', 'Pending', 'Confirmed', 'Cancelled'].map(filter => (
                      <button
                        key={filter}
                        onClick={() => setApptFilter(filter)}
                        style={{
                          background: apptFilter === filter ? 'var(--color-primary)' : 'transparent',
                          color: apptFilter === filter ? '#fff' : 'var(--text-muted)',
                          border: 'none',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {filter === 'All' ? 'Todas' :
                          filter === 'Pending' ? 'Pendientes' :
                            filter === 'Confirmed' ? 'Confirmadas' : 'Canceladas'}
                      </button>
                    ))}
                  </div>
                </div>

                {adminLoading ? (
                  <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                    Cargando citas del sistema...
                  </div>
                ) : filteredAppointments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                    No se encontraron citas con los criterios actuales.
                  </div>
                ) : (
                  <div className="custom-table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Paciente</th>
                          <th>Edad/Grupo</th>
                          <th>Fecha y Hora</th>
                          <th>Motivo</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAppointments.map(appt => {
                          const patientAgeGroup = getPatientAgeGroup(appt.patient_dob, appt.date);
                          return (
                            <tr key={appt.id}>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{appt.patient_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{appt.patient_email}</div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span className={`badge ${patientAgeGroup === 'Niño' ? 'badge-kid' :
                                    patientAgeGroup === 'Adulto' ? 'badge-adult' : 'badge-senior'
                                    }`}>
                                    {patientAgeGroup}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 500 }}>{appt.date}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Clock size={12} />
                                  {appt.time} hrs
                                </div>
                              </td>
                              <td style={{ fontWeight: 500 }}>{appt.motive}</td>
                              <td>
                                <span className={`badge ${appt.status === 'Pending' ? 'badge-pending' :
                                  appt.status === 'Confirmed' ? 'badge-confirmed' : 'badge-cancelled'
                                  }`}>
                                  {appt.status === 'Pending' ? 'Pendiente' :
                                    appt.status === 'Confirmed' ? 'Confirmada' : 'Cancelada'}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  {appt.status === 'Pending' && (
                                    <>
                                      <button
                                        className="btn btn-secondary"
                                        style={{
                                          padding: '4px 8px',
                                          fontSize: '0.75rem',
                                          borderColor: 'var(--color-success)',
                                          color: 'var(--color-success)',
                                          background: 'rgba(16, 185, 129, 0.05)'
                                        }}
                                        onClick={() => handleStatusChange(appt.id, 'Confirmed')}
                                      >
                                        Aprobar
                                      </button>
                                      <button
                                        className="btn btn-secondary"
                                        style={{
                                          padding: '4px 8px',
                                          fontSize: '0.75rem',
                                          borderColor: 'var(--color-danger)',
                                          color: 'var(--color-danger)',
                                          background: 'rgba(244, 63, 94, 0.05)'
                                        }}
                                        onClick={() => handleStatusChange(appt.id, 'Cancelled')}
                                      >
                                        Rechazar
                                      </button>
                                    </>
                                  )}
                                  {appt.status === 'Confirmed' && (
                                    <button
                                      className="btn btn-secondary"
                                      style={{
                                        padding: '4px 8px',
                                        fontSize: '0.75rem',
                                        borderColor: 'var(--color-danger)',
                                        color: 'var(--color-danger)',
                                        background: 'rgba(244, 63, 94, 0.05)'
                                      }}
                                      onClick={() => handleStatusChange(appt.id, 'Cancelled')}
                                    >
                                      Cancelar Cita
                                    </button>
                                  )}
                                  {appt.status === 'Cancelled' && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sin acciones</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: HISTORIAL DE CLIENTES */}
            {adminTab === 'patients' && (
              <div style={{ display: 'grid', gridTemplateColumns: selectedPatient ? '1fr 1fr' : '1fr', gap: '2rem', transition: 'all 0.3s ease' }}>
                {/* Tabla de Pacientes */}
                <div className="glass-card" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--text-dark)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users style={{ color: 'var(--color-primary)' }} />
                    Directorio de Clientes / Pacientes
                  </h3>

                  {adminLoading ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                      Cargando directorio...
                    </div>
                  ) : filteredPatients.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                      No se encontraron pacientes.
                    </div>
                  ) : (
                    <div className="custom-table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Paciente</th>
                            <th>Contacto</th>
                            <th>Citas</th>
                            <th>Preferencia Cita</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPatients.map(pt => {
                            // Calcular grupo de edad para el listado del paciente
                            const today = new Date();
                            const dobDate = new Date(pt.dob);
                            let age = today.getFullYear() - dobDate.getFullYear();
                            const m = today.getMonth() - dobDate.getMonth();
                            if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
                              age--;
                            }
                            const pGroup = age < 15 ? 'Niño' : age < 65 ? 'Adulto' : 'Adulto Mayor';

                            return (
                              <tr
                                key={pt.id}
                                onClick={() => setSelectedPatient(pt)}
                                style={{
                                  cursor: 'pointer',
                                  background: selectedPatient?.id === pt.id ? 'var(--color-primary-glow)' : ''
                                }}
                              >
                                <td>
                                  <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{pt.name}</div>
                                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2px' }}>
                                    <span className={`badge ${pGroup === 'Niño' ? 'badge-kid' :
                                      pGroup === 'Adulto' ? 'badge-adult' : 'badge-senior'
                                      }`} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                                      {pGroup}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ fontSize: '0.85rem' }}>{pt.email}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pt.phone}</div>
                                </td>
                                <td style={{ fontWeight: 600 }}>{pt.appointments_count}</td>
                                <td>
                                  <span style={{ fontSize: '0.85rem', color: 'var(--color-primary-light)', background: 'var(--color-primary-glow)', padding: '2px 8px', borderRadius: '4px' }}>
                                    {pt.favorite_motive}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Perfil e Historial Detallado del Cliente Seleccionado */}
                {selectedPatient && (
                  <div className="glass-card animate-fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderLeft: '3px solid var(--color-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600, textTransform: 'uppercase' }}>Ficha de Paciente</span>
                        <h3 style={{ fontSize: '1.75rem', color: 'var(--text-dark)', marginTop: '0.25rem' }}>{selectedPatient.name}</h3>
                      </div>
                      <button
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        onClick={() => setSelectedPatient(null)}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Información Básica */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(219, 39, 119, 0.03)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-dark)', wordBreak: 'break-all' }}>{selectedPatient.email}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Teléfono</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-dark)' }}>{selectedPatient.phone}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fecha Nacimiento</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-dark)' }}>{selectedPatient.dob}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tipo de Cita más Frecuente</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 600 }}>{selectedPatient.favorite_motive}</div>
                      </div>
                    </div>

                    {/* Historial de Citas */}
                    <div>
                      <h4 style={{ fontSize: '1.1rem', color: 'var(--text-dark)', marginBottom: '0.75rem' }}>Historial Completo de Citas</h4>
                      <div className="custom-table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                          <thead>
                            <tr>
                              <th>Fecha/Hora</th>
                              <th>Motivo</th>
                              <th>Estado</th>
                              <th>Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPatient.history.map(h => (
                              <tr key={h.id}>
                                <td>
                                  <div>{h.date}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.time} hrs</div>
                                </td>
                                <td>{h.motive}</td>
                                <td>
                                  <span className={`badge ${h.status === 'Pending' ? 'badge-pending' :
                                    h.status === 'Confirmed' ? 'badge-confirmed' : 'badge-cancelled'
                                    }`} style={{ fontSize: '0.65rem' }}>
                                    {h.status === 'Pending' ? 'Pendiente' :
                                      h.status === 'Confirmed' ? 'Confirmada' : 'Cancelada'}
                                  </span>
                                </td>
                                <td>
                                  {h.status === 'Pending' && (
                                    <button
                                      className="btn btn-secondary"
                                      style={{ padding: '2px 6px', fontSize: '0.65rem', borderColor: 'var(--color-success)', color: 'var(--color-success)' }}
                                      onClick={() => handleStatusChange(h.id, 'Confirmed')}
                                    >
                                      Aprobar
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: DASHBOARD Y METRICAS */}
            {adminTab === 'dashboard' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {adminLoading || !dashboardData ? (
                  <div className="glass-card" style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Cargando y procesando analíticas en el motor de Python...
                  </div>
                ) : (
                  <div>
                    {/* Tarjetas Principales */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--color-primary)' }}>
                        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'var(--color-primary-glow)', color: 'var(--color-primary)' }}>
                          <Calendar size={24} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Citas Totales Registradas</p>
                          <h4 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-dark)' }}>{dashboardData.total_appointments}</h4>
                        </div>
                      </div>

                      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--color-success)' }}>
                        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Citas Confirmadas</p>
                          <h4 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-dark)' }}>{dashboardData.status_distribution.Confirmed || 0}</h4>
                        </div>
                      </div>

                      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--color-pending)' }}>
                        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'var(--color-pending-bg)', color: 'var(--color-pending)' }}>
                          <Clock size={24} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Citas Pendientes</p>
                          <h4 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-dark)' }}>{dashboardData.status_distribution.Pending || 0}</h4>
                        </div>
                      </div>

                      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--color-danger)' }}>
                        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
                          <XCircle size={24} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Citas Canceladas</p>
                          <h4 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-dark)' }}>{dashboardData.status_distribution.Cancelled || 0}</h4>
                        </div>
                      </div>
                    </div>

                    {/* Gráficos Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="grid-cols-dashboard">

                      {/* Gráfico 1: Tipo de Paciente más frecuente (Por Edad) */}
                      <div className="glass-card" style={{ padding: '2rem' }}>
                        <h4 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Users size={20} style={{ color: 'var(--color-primary)' }} />
                          Segmentación de Pacientes por Rango de Edad
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          {/* Donut Chart Visualizer en SVG */}
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', width: '160px', height: '160px' }}>
                              <svg width="100%" height="100%" viewBox="0 0 42 42" className="donut" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(0,0,0,0.03)" strokeWidth="4"></circle>

                                {/* Niños: Purple */}
                                <circle
                                  cx="21"
                                  cy="21"
                                  r="15.915"
                                  fill="transparent"
                                  stroke="var(--color-tag-kid)"
                                  strokeWidth="4"
                                  strokeDasharray={`${dashboardData.age_group_percentages.Niño} ${100 - dashboardData.age_group_percentages.Niño}`}
                                  strokeDashoffset="0"
                                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                                ></circle>

                                {/* Adultos: Blue */}
                                <circle
                                  cx="21"
                                  cy="21"
                                  r="15.915"
                                  fill="transparent"
                                  stroke="var(--color-tag-adult)"
                                  strokeWidth="4"
                                  strokeDasharray={`${dashboardData.age_group_percentages.Adulto} ${100 - dashboardData.age_group_percentages.Adulto}`}
                                  strokeDashoffset={-dashboardData.age_group_percentages.Niño}
                                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                                ></circle>

                                {/* Adultos Mayores: Pink */}
                                <circle
                                  cx="21"
                                  cy="21"
                                  r="15.915"
                                  fill="transparent"
                                  stroke="var(--color-tag-senior)"
                                  strokeWidth="4"
                                  strokeDasharray={`${dashboardData.age_group_percentages["Adulto Mayor"]} ${100 - dashboardData.age_group_percentages["Adulto Mayor"]}`}
                                  strokeDashoffset={-(dashboardData.age_group_percentages.Niño + dashboardData.age_group_percentages.Adulto)}
                                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                                ></circle>
                              </svg>
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-dark)' }}>{dashboardData.total_appointments}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Citas</span>
                              </div>
                            </div>

                            {/* Etiquetas y Leyenda */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flexGrow: 1, minWidth: '150px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-tag-kid)' }}></span>
                                  <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Niños (&lt;15 años)</span>
                                </div>
                                <strong style={{ color: 'var(--text-dark)' }}>{dashboardData.age_group_distribution.Niño} ({dashboardData.age_group_percentages.Niño}%)</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-tag-adult)' }}></span>
                                  <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Adultos (15-64 años)</span>
                                </div>
                                <strong style={{ color: 'var(--text-dark)' }}>{dashboardData.age_group_distribution.Adulto} ({dashboardData.age_group_percentages.Adulto}%)</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-tag-senior)' }}></span>
                                  <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Adultos Mayores (65+)</span>
                                </div>
                                <strong style={{ color: 'var(--text-dark)' }}>{dashboardData.age_group_distribution["Adulto Mayor"]} ({dashboardData.age_group_percentages["Adulto Mayor"]}%)</strong>
                              </div>
                            </div>
                          </div>

                          {dashboardData._fallback && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-pending)', textAlign: 'center', padding: '4px', background: 'var(--color-pending-bg)', borderRadius: '4px' }}>
                              ⚠️ Modo local: El cálculo del dashboard se ejecutó en NodeJS (Python desconectado).
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Gráfico 2: Motivos de Consulta más comunes */}
                      <div className="glass-card" style={{ padding: '2rem' }}>
                        <h4 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <TrendingUp size={20} style={{ color: 'var(--color-primary)' }} />
                          Tipos de Cita más Demandados (Top 5 Motivos)
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {dashboardData.top_motives.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No hay motivos registrados</div>
                          ) : (
                            dashboardData.top_motives.map((m, idx) => {
                              const maxCount = Math.max(...dashboardData.top_motives.map(item => item.count));
                              const pctWidth = maxCount > 0 ? (m.count / maxCount) * 100 : 0;
                              return (
                                <div key={m.motive} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{idx + 1}. {m.motive}</span>
                                    <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{m.count} citas</span>
                                  </div>
                                  <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                      width: `${pctWidth}%`,
                                      height: '100%',
                                      background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
                                      borderRadius: '4px',
                                      transition: 'width 0.5s ease-out'
                                    }}></div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Gráfico 3 (Fila completa): Tipos de Cita Según el Rango de Edad */}
                    <div className="glass-card" style={{ padding: '2rem', marginTop: '2rem' }}>
                      <h4 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={20} style={{ color: 'var(--color-primary)' }} />
                        ¿Qué tipo de cita toma cada tipo de paciente? (Detalle por Rango de Edad)
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {/* Niños */}
                        <div style={{ background: 'rgba(147, 51, 234, 0.02)', border: '1px solid rgba(147, 51, 234, 0.1)', padding: '1.25rem', borderRadius: '12px' }}>
                          <h5 style={{ color: 'var(--color-tag-kid)', fontSize: '1.05rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-tag-kid)' }}></span>
                            Citas de Niños (&lt;15)
                          </h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {(!dashboardData.motives_by_age_group.Niño || dashboardData.motives_by_age_group.Niño.length === 0) ? (
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Sin citas registradas</p>
                            ) : (
                              dashboardData.motives_by_age_group.Niño.map((m, idx) => (
                                <div key={m.motive} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid var(--border-main)', paddingBottom: '4px' }}>
                                  <span style={{ color: 'var(--text-main)' }}>{idx + 1}. {m.motive}</span>
                                  <span style={{ color: 'var(--color-tag-kid)', fontWeight: 600 }}>{m.count}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Adultos */}
                        <div style={{ background: 'rgba(37, 99, 235, 0.02)', border: '1px solid rgba(37, 99, 235, 0.1)', padding: '1.25rem', borderRadius: '12px' }}>
                          <h5 style={{ color: 'var(--color-tag-adult)', fontSize: '1.05rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-tag-adult)' }}></span>
                            Citas de Adultos (15-64)
                          </h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {(!dashboardData.motives_by_age_group.Adulto || dashboardData.motives_by_age_group.Adulto.length === 0) ? (
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Sin citas registradas</p>
                            ) : (
                              dashboardData.motives_by_age_group.Adulto.map((m, idx) => (
                                <div key={m.motive} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid var(--border-main)', paddingBottom: '4px' }}>
                                  <span style={{ color: 'var(--text-main)' }}>{idx + 1}. {m.motive}</span>
                                  <span style={{ color: 'var(--color-tag-adult)', fontWeight: 600 }}>{m.count}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Adultos Mayores */}
                        <div style={{ background: 'rgba(219, 39, 119, 0.02)', border: '1px solid rgba(219, 39, 119, 0.1)', padding: '1.25rem', borderRadius: '12px' }}>
                          <h5 style={{ color: 'var(--color-tag-senior)', fontSize: '1.05rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-tag-senior)' }}></span>
                            Citas de Adultos Mayores (65+)
                          </h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {(!dashboardData.motives_by_age_group["Adulto Mayor"] || dashboardData.motives_by_age_group["Adulto Mayor"].length === 0) ? (
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Sin citas registradas</p>
                            ) : (
                              dashboardData.motives_by_age_group["Adulto Mayor"].map((m, idx) => (
                                <div key={m.motive} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid var(--border-main)', paddingBottom: '4px' }}>
                                  <span style={{ color: 'var(--text-main)' }}>{idx + 1}. {m.motive}</span>
                                  <span style={{ color: 'var(--color-tag-senior)', fontWeight: 600 }}>{m.count}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: REGISTRO DE CORREOS */}
            {adminTab === 'emails' && (
              <div style={{ display: 'grid', gridTemplateColumns: selectedEmail ? '1.2fr 1fr' : '1fr', gap: '2rem', transition: 'all 0.3s ease' }}>

                {/* Tabla de Logs de Correos */}
                <div className="glass-card" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--text-dark)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail style={{ color: 'var(--color-primary)' }} />
                    Registro Histórico de Notificaciones por Correo
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Visualiza y simula las notificaciones disparadas por el sistema al agendar, confirmar o cancelar citas médicas. Haz clic en una fila para ver el cuerpo del correo.
                  </p>

                  {emailLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                      No se han disparado notificaciones por correo aún.
                    </div>
                  ) : (
                    <div className="custom-table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Destinatario</th>
                            <th>Asunto / Tipo</th>
                            <th>Fecha Envió</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emailLogs.map(log => (
                            <tr
                              key={log.id}
                              onClick={() => setSelectedEmail(log)}
                              style={{
                                cursor: 'pointer',
                                background: selectedEmail?.id === log.id ? 'var(--color-primary-glow)' : ''
                              }}
                            >
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{log.to}</div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span className={`badge ${log.type === 'Pending' ? 'badge-pending' :
                                    log.type === 'Confirmed' ? 'badge-confirmed' : 'badge-cancelled'
                                    }`} style={{ fontSize: '0.65rem' }}>
                                    {log.type === 'Pending' ? 'Pendiente' :
                                      log.type === 'Confirmed' ? 'Confirmado' : 'Cancelado'}
                                  </span>
                                  <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                    {log.subject}
                                  </span>
                                </div>
                              </td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Vista previa del correo electrónico */}
                {selectedEmail && (
                  <div className="glass-card animate-fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderLeft: '3px solid var(--color-primary-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', fontWeight: 600, textTransform: 'uppercase' }}>Visualizador de Correo Electrónico</span>
                        <h4 style={{ fontSize: '1.2rem', color: '#fff', marginTop: '0.25rem' }}>{selectedEmail.subject}</h4>
                      </div>
                      <button
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        onClick={() => setSelectedEmail(null)}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem', borderBottom: '1px solid var(--border-main)', paddingBottom: '0.75rem' }}>
                      <div><strong style={{ color: 'var(--text-muted)' }}>Para:</strong> <span style={{ color: '#fff' }}>{selectedEmail.to}</span></div>
                      <div><strong style={{ color: 'var(--text-muted)' }}>Fecha:</strong> {new Date(selectedEmail.timestamp).toLocaleString()}</div>
                      <div>
                        <strong style={{ color: 'var(--text-muted)' }}>Tipo de Disparador:</strong>{' '}
                        <span className={`badge ${selectedEmail.type === 'Pending' ? 'badge-pending' :
                          selectedEmail.type === 'Confirmed' ? 'badge-confirmed' : 'badge-cancelled'
                          }`} style={{ fontSize: '0.6rem', padding: '1px 4px' }}>
                          {selectedEmail.type}
                        </span>
                      </div>
                    </div>

                    {/* Simulación del contenedor de correo */}
                    <div style={{
                      background: '#fff',
                      color: '#1f2937',
                      padding: '1.5rem',
                      borderRadius: '8px',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
                      maxHeight: '400px',
                      overflowY: 'auto'
                    }}>
                      {/* Renderizar el cuerpo HTML simplificado si es que existe o texto plano */}
                      <div
                        dangerouslySetInnerHTML={{
                          __html: selectedEmail.type === 'Pending' ? `
                            <div style="font-family: Arial, sans-serif;">
                              <h2 style="color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-top:0;">Solicitud de Cita Recibida</h2>
                              <p>Hola <strong>Paciente</strong>,</p>
                              <p>Hemos recibido tu solicitud para agendar una cita médica en nuestro establecimiento.</p>
                              <div style="background: #f0fdfa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0d9488;">
                                <h3 style="margin-top:0; color:#115e59;">Detalles de la Cita</h3>
                                <p style="margin: 5px 0;"><strong>Dirección:</strong> Teniente Sanz 823, Padre Hurtado</p>
                              </div>
                              <p style="color: #6b7280; font-style: italic;">Estado actual: <strong>Pendiente de Confirmación</strong>.</p>
                            </div>
                          ` : selectedEmail.type === 'Confirmed' ? `
                            <div style="font-family: Arial, sans-serif;">
                              <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px; margin-top:0;">¡Cita Médica Confirmada!</h2>
                              <p>Hola <strong>Paciente</strong>,</p>
                              <p>Tu cita médica ha sido revisada y confirmada exitosamente.</p>
                              <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981;">
                                <h3 style="margin-top:0; color:#065f46;">Detalles de la Cita</h3>
                                <p style="margin: 5px 0;"><strong>Dirección:</strong> Teniente Sanz 823, Padre Hurtado</p>
                              </div>
                              <p><strong>Indicación:</strong> Por favor preséntate 15 minutos antes de tu hora en la recepción con tu cédula de identidad.</p>
                            </div>
                          ` : `
                            <div style="font-family: Arial, sans-serif;">
                              <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 10px; margin-top:0;">Cita Médica Cancelada</h2>
                              <p>Hola <strong>Paciente</strong>,</p>
                              <p>Te informamos que tu cita médica agendada en nuestro centro ha sido cancelada.</p>
                              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ef4444;">
                                <h3 style="margin-top:0; color:#991b1b;">Detalles de la Cita Cancelada</h3>
                              </div>
                              <p>Si deseas programar una nueva atención, por favor ingresa nuevamente a nuestra página web.</p>
                            </div>
                          `
                        }}
                      />

                      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed #e5e7eb', fontSize: '0.8rem', color: '#6b7280' }}>
                        <span style={{ fontWeight: 600 }}>Texto Plano Alternativo:</span>
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', marginTop: '0.5rem', background: '#f9fafb', padding: '0.75rem', borderRadius: '4px' }}>
                          {selectedEmail.bodyText}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB: REPORTES Y DESCARGAS */}
            {adminTab === 'reports' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }} className="grid-cols-dashboard">

                  {/* Tarjeta 1: Reporte General */}
                  <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.5rem', color: 'var(--text-dark)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText style={{ color: 'var(--color-primary)' }} />
                        Reporte General de Pacientes y Citas
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                        Descarga la nómina completa de pacientes registrados junto con el historial de sus citas médicas, correos de contacto, teléfonos, edad y estados de agendamiento.
                      </p>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => window.open(`${API_BASE}/reports/general/csv`, '_blank')}
                      style={{ width: '100%', gap: '0.5rem', height: '44px' }}
                    >
                      <Download size={16} />
                      <span>Descargar Reporte General (CSV)</span>
                    </button>
                  </div>

                  {/* Tarjeta 2: Reporte Demográfico y de Demanda */}
                  <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.5rem', color: 'var(--text-dark)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart3 style={{ color: 'var(--color-primary-light)' }} />
                        Reporte Demográfico y de Demanda
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                        Descarga el análisis estadístico consolidado que detalla la cantidad de pacientes que toman cada tipo de cita cruzado por su rango de edad (Niño, Adulto, Adulto Mayor) e identifica las mayores demandas.
                      </p>
                    </div>
                    <button
                      className="btn btn-secondary"
                      onClick={() => window.open(`${API_BASE}/reports/demographics/csv`, '_blank')}
                      style={{ width: '100%', gap: '0.5rem', height: '44px', borderColor: 'var(--color-primary-light)', color: 'var(--color-primary-light)', background: 'var(--color-primary-glow)' }}
                    >
                      <Download size={16} />
                      <span>Descargar Reporte Demográfico (CSV)</span>
                    </button>
                  </div>

                </div>

                {/* Previsualizaciones */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>

                  {/* Vista Previa: Distribución de Citas por Motivo y Edad */}
                  <div className="glass-card" style={{ padding: '2rem' }}>
                    <h4 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <BarChart3 size={20} style={{ color: 'var(--color-primary)' }} />
                      Vista Previa: Distribución de Citas por Motivo y Rango de Edad
                    </h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                      Esta tabla muestra en tiempo real la cantidad de citas solicitadas por tipo de atención cruzada con la clasificación de edad del paciente.
                    </p>

                    <div className="custom-table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Tipo de Cita (Motivo)</th>
                            <th>Niños (&lt;15 años)</th>
                            <th>Adultos (15-64 años)</th>
                            <th>Adultos Mayores (65+ años)</th>
                            <th>Total Citas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const motives = [
                              "Consulta General", "Control Niño Sano", "Control Cardiovascular",
                              "Control Crónicos", "Vacunación", "Urgencia Respiratoria",
                              "Atención Dental", "Otros"
                            ];
                            appointments.forEach(appt => {
                              if (!motives.includes(appt.motive)) {
                                motives.push(appt.motive);
                              }
                            });

                            const stats = motives.reduce((acc, motive) => {
                              acc[motive] = { kids: 0, adults: 0, seniors: 0, total: 0 };
                              return acc;
                            }, {});

                            appointments.forEach(appt => {
                              const ageGroup = getPatientAgeGroup(appt.patient_dob, appt.date);
                              if (stats[appt.motive]) {
                                if (ageGroup === 'Niño') stats[appt.motive].kids++;
                                else if (ageGroup === 'Adulto') stats[appt.motive].adults++;
                                else if (ageGroup === 'Adulto Mayor') stats[appt.motive].seniors++;
                                stats[appt.motive].total++;
                              }
                            });

                            const activeMotives = motives.filter(m => stats[m].total > 0).sort();

                            if (activeMotives.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay datos disponibles para mostrar.</td>
                                </tr>
                              );
                            }

                            return activeMotives.map(m => (
                              <tr key={m}>
                                <td style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{m}</td>
                                <td>{stats[m].kids}</td>
                                <td>{stats[m].adults}</td>
                                <td>{stats[m].seniors}</td>
                                <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{stats[m].total}</td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Vista Previa: Listado General de Citas y Pacientes */}
                  <div className="glass-card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Users size={20} style={{ color: 'var(--color-primary)' }} />
                          Vista Previa: Nómina de Pacientes y Citas
                        </h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                          Muestra los registros generales de citas agendadas con sus respectivos pacientes.
                        </p>
                      </div>

                      <div style={{ position: 'relative', width: '250px' }}>
                        <input
                          type="text"
                          placeholder="Buscar en vista previa..."
                          className="input-field"
                          style={{ width: '100%', paddingLeft: '2.25rem', height: '36px', fontSize: '0.85rem' }}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '11px', color: 'var(--text-muted)' }} />
                      </div>
                    </div>

                    {filteredAppointments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No se encontraron registros que coincidan con la búsqueda.
                      </div>
                    ) : (
                      <div className="custom-table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                        <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                          <thead>
                            <tr>
                              <th>Nombre Paciente</th>
                              <th>Contacto (Email/Teléfono)</th>
                              <th>Edad/Grupo</th>
                              <th>Fecha/Hora Cita</th>
                              <th>Motivo</th>
                              <th>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAppointments.map(appt => {
                              const ageGroup = getPatientAgeGroup(appt.patient_dob, appt.date);
                              const dobDate = new Date(appt.patient_dob);
                              const apptDate = new Date(appt.date);
                              let age = apptDate.getFullYear() - dobDate.getFullYear();
                              const m = apptDate.getMonth() - dobDate.getMonth();
                              if (m < 0 || (m === 0 && apptDate.getDate() < dobDate.getDate())) {
                                age--;
                              }
                              const finalAge = isNaN(age) ? 30 : Math.max(0, age);

                              return (
                                <tr key={appt.id}>
                                  <td style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{appt.patient_name}</td>
                                  <td>
                                    <div>{appt.patient_email}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{appt.patient_phone}</div>
                                  </td>
                                  <td>
                                    <div>{finalAge} años</div>
                                    <span className={`badge ${ageGroup === 'Niño' ? 'badge-kid' :
                                      ageGroup === 'Adulto' ? 'badge-adult' : 'badge-senior'
                                      }`} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                                      {ageGroup}
                                    </span>
                                  </td>
                                  <td>
                                    <div>{appt.date}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-primary-light)' }}>{appt.time} hrs</div>
                                  </td>
                                  <td style={{ fontWeight: 500 }}>{appt.motive}</td>
                                  <td>
                                    <span className={`badge ${appt.status === 'Pending' ? 'badge-pending' :
                                      appt.status === 'Confirmed' ? 'badge-confirmed' : 'badge-cancelled'
                                      }`} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                                      {appt.status === 'Pending' ? 'Pendiente' :
                                        appt.status === 'Confirmed' ? 'Confirmada' : 'Cancelada'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderTop: '1px solid var(--border-main)',
        padding: '1.5rem',
        marginTop: '3rem',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
          <p style={{ margin: 0 }}>© {new Date().getFullYear()} SAPU Padre Hurtado - Pablo Carrasco.</p>
        </div>
      </footer>
    </div>
  );
}
