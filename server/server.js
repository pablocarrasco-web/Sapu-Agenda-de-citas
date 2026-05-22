const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const nodemailer = require('nodemailer');
require('dotenv').config();

const { initializeDatabase, getDatabaseConnection } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8081';
const EMAILS_LOG_PATH = path.join(__dirname, 'emails_sent.json');

app.use(cors());
app.use(express.json());

if (!fs.existsSync(EMAILS_LOG_PATH)) {
  fs.writeFileSync(EMAILS_LOG_PATH, JSON.stringify([], null, 2));
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null
  }
});

// Envía correos de notificación a los pacientes y los registra localmente
async function sendNotificationEmail(patientEmail, patientName, appointmentDate, appointmentTime, motive, type) {
  let subject = '';
  let bodyText = '';
  let bodyHtml = '';

  const sapuAddress = 'Teniente Sanz 823, Padre Hurtado';

  if (type === 'Pending') {
    subject = 'Solicitud de Cita Médica Pendiente - SAPU Padre Hurtado';
    bodyText = `Hola ${patientName},\n\nHemos recibido tu solicitud para agendar una cita médica.\n\nDetalles de la cita:\n- Motivo: ${motive}\n- Fecha: ${appointmentDate}\n- Hora: ${appointmentTime}\n- Lugar: SAPU (Teniente Sanz 823, Padre Hurtado)\n\nTu cita se encuentra en estado PENDIENTE DE CONFIRMACIÓN. Te notificaremos una vez que sea aprobada por nuestro equipo de administración.\n\nAtentamente,\nEquipo de Salud SAPU`;
    bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #fbfbfb;">
        <h2 style="color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px;">Solicitud de Cita Recibida</h2>
        <p>Hola <strong>${patientName}</strong>,</p>
        <p>Hemos recibido tu solicitud para agendar una cita médica en nuestro establecimiento.</p>
        <div style="background: #f0fdfa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0d9488;">
          <h3 style="margin-top:0; color:#115e59;">Detalles de la Cita</h3>
          <p style="margin: 5px 0;"><strong>Motivo:</strong> ${motive}</p>
          <p style="margin: 5px 0;"><strong>Fecha:</strong> ${appointmentDate}</p>
          <p style="margin: 5px 0;"><strong>Hora:</strong> ${appointmentTime}</p>
          <p style="margin: 5px 0;"><strong>Dirección:</strong> ${sapuAddress}</p>
        </div>
        <p style="color: #6b7280; font-style: italic;">Estado actual: <strong>Pendiente de Confirmación</strong>. Te enviaremos otro correo cuando un administrador la confirme.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <small style="color: #9ca3af; display: block; text-align: center;">Este es un correo automático. Por favor no respondas a este mensaje.</small>
      </div>
    `;
  } else if (type === 'Confirmed') {
    subject = 'Cita Médica CONFIRMADA - SAPU Padre Hurtado';
    bodyText = `Hola ${patientName},\n\nNos complace informarte que tu cita médica ha sido CONFIRMADA.\n\nDetalles de la cita:\n- Motivo: ${motive}\n- Fecha: ${appointmentDate}\n- Hora: ${appointmentTime}\n- Lugar: SAPU (Teniente Sanz 823, Padre Hurtado)\n\nPor favor, llega 15 minutos antes de la hora programada y lleva tu cédula de identidad.\n\nAtentamente,\nEquipo de Salud SAPU`;
    bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #fbfbfb;">
        <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px;">¡Cita Médica Confirmada!</h2>
        <p>Hola <strong>${patientName}</strong>,</p>
        <p>Tu cita médica ha sido revisada y confirmada exitosamente.</p>
        <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981;">
          <h3 style="margin-top:0; color:#065f46;">Detalles de la Cita</h3>
          <p style="margin: 5px 0;"><strong>Motivo:</strong> ${motive}</p>
          <p style="margin: 5px 0;"><strong>Fecha:</strong> ${appointmentDate}</p>
          <p style="margin: 5px 0;"><strong>Hora:</strong> ${appointmentTime}</p>
          <p style="margin: 5px 0;"><strong>Dirección:</strong> ${sapuAddress}</p>
        </div>
        <p><strong>Indicación:</strong> Por favor preséntate 15 minutos antes de tu hora en la recepción con tu cédula de identidad.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <small style="color: #9ca3af; display: block; text-align: center;">Este es un correo automático. Por favor no respondas a este mensaje.</small>
      </div>
    `;
  } else if (type === 'Cancelled') {
    subject = 'Cita Médica CANCELADA - SAPU Padre Hurtado';
    bodyText = `Hola ${patientName},\n\nTe informamos que tu cita médica programada ha sido CANCELADA.\n\nDetalles de la cita cancelada:\n- Motivo: ${motive}\n- Fecha: ${appointmentDate}\n- Hora: ${appointmentTime}\n\nSi necesitas agendar una nueva hora, puedes hacerlo a través de nuestro sitio web.\n\nAtentamente,\nEquipo de Salud SAPU`;
    bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #fbfbfb;">
        <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">Cita Médica Cancelada</h2>
        <p>Hola <strong>${patientName}</strong>,</p>
        <p>Te informamos que tu cita médica agendada en nuestro centro ha sido cancelada.</p>
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ef4444;">
          <h3 style="margin-top:0; color:#991b1b;">Detalles de la Cita Cancelada</h3>
          <p style="margin: 5px 0;"><strong>Motivo:</strong> ${motive}</p>
          <p style="margin: 5px 0;"><strong>Fecha:</strong> ${appointmentDate}</p>
          <p style="margin: 5px 0;"><strong>Hora:</strong> ${appointmentTime}</p>
        </div>
        <p>Si deseas programar una nueva atención, por favor ingresa nuevamente a nuestra página web o acércate a nuestro módulo SAPU.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <small style="color: #9ca3af; display: block; text-align: center;">Este es un correo automático. Por favor no respondas a este mensaje.</small>
      </div>
    `;
  }

  try {
    const rawData = fs.readFileSync(EMAILS_LOG_PATH);
    const emails = JSON.parse(rawData);
    emails.push({
      id: Date.now().toString(),
      to: patientEmail,
      subject,
      bodyText,
      timestamp: new Date().toISOString(),
      type
    });
    fs.writeFileSync(EMAILS_LOG_PATH, JSON.stringify(emails, null, 2));
    console.log(`[Email Log] Notificación ${type} registrada para: ${patientEmail}`);
  } catch (err) {
    console.error('Error al registrar correo en JSON local:', err);
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await transporter.sendMail({
        from: `"SAPU Padre Hurtado" <${process.env.SMTP_USER}>`,
        to: patientEmail,
        subject: subject,
        text: bodyText,
        html: bodyHtml
      });
      console.log(`[SMTP] Correo electrónico enviado a: ${patientEmail}`);
    } catch (error) {
      console.error('[SMTP Error] No se pudo enviar el correo real:', error.message);
    }
  }
}

// Endpoint para agendar una cita (Crea paciente si no existe)
app.post('/api/appointments', async (req, res) => {
  const { name, email, phone, dob, date, time, motive } = req.body;

  if (!name || !email || !phone || !dob || !date || !time || !motive) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const dobDate = new Date(dob);
  if (isNaN(dobDate.getTime())) {
    return res.status(400).json({ error: 'La fecha de nacimiento no es válida.' });
  }
  
  const today = new Date();
  const dobOnly = new Date(dobDate.getFullYear(), dobDate.getMonth(), dobDate.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  if (dobOnly > todayOnly) {
    return res.status(400).json({ error: 'La fecha de nacimiento no puede ser en el futuro.' });
  }
  
  let age = todayOnly.getFullYear() - dobOnly.getFullYear();
  const monthDiff = todayOnly.getMonth() - dobOnly.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && todayOnly.getDate() < dobOnly.getDate())) {
    age--;
  }
  
  if (age > 120) {
    return res.status(400).json({ error: 'La edad del paciente no puede ser superior a 120 años.' });
  }

  const apptDate = new Date(date);
  if (isNaN(apptDate.getTime())) {
    return res.status(400).json({ error: 'La fecha de la cita no es válida.' });
  }
  
  const dateOnly = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate());
  if (dateOnly < todayOnly) {
    return res.status(400).json({ error: 'No se pueden agendar citas para fechas pasadas.' });
  }
  
  const maxFutureDate = new Date(todayOnly.getFullYear() + 1, todayOnly.getMonth(), todayOnly.getDate());
  if (dateOnly > maxFutureDate) {
    return res.status(400).json({ error: 'No se pueden agendar citas con más de un año de anticipación.' });
  }

  try {
    const db = await getDatabaseConnection();

    const existingAppts = await db.all(
      'SELECT * FROM appointments WHERE date = ? AND time = ? AND status != "Cancelled"',
      [date, time]
    );

    if (existingAppts.length >= 2) {
      return res.status(400).json({ 
        error: 'El bloque de horario seleccionado ya está completo (máximo 2 citas simultáneas por personal limitado).' 
      });
    }

    if (existingAppts.length === 1 && existingAppts[0].motive.toLowerCase() === motive.toLowerCase()) {
      return res.status(400).json({ 
        error: `Ya existe una cita programada para este horario con el mismo tipo de atención (${motive}).` 
      });
    }

    let patient = await db.get('SELECT * FROM patients WHERE email = ?', [email]);
    let patientId;

    if (!patient) {
      const result = await db.run(
        'INSERT INTO patients (name, email, phone, dob) VALUES (?, ?, ?, ?)',
        [name, email, phone, dob]
      );
      patientId = result.lastID;
    } else {
      patientId = patient.id;
      await db.run(
        'UPDATE patients SET name = ?, phone = ?, dob = ? WHERE id = ?',
        [name, phone, dob, patientId]
      );
    }

    const apptResult = await db.run(
      'INSERT INTO appointments (patient_id, date, time, motive, status) VALUES (?, ?, ?, ?, ?)',
      [patientId, date, time, motive, 'Pending']
    );

    await sendNotificationEmail(email, name, date, time, motive, 'Pending');

    res.status(201).json({
      message: 'Cita agendada correctamente. Pendiente de confirmación.',
      appointmentId: apptResult.lastID
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor al agendar cita.' });
  }
});

// Endpoint para obtener listado de citas con datos del paciente
app.get('/api/appointments', async (req, res) => {
  try {
    const db = await getDatabaseConnection();
    const appointments = await db.all(`
      SELECT 
        a.id, a.date, a.time, a.motive, a.status, a.created_at,
        p.name as patient_name, p.email as patient_email, 
        p.phone as patient_phone, p.dob as patient_dob
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      ORDER BY a.date DESC, a.time DESC
    `);
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener las citas.' });
  }
});

// Endpoint para confirmar o cancelar una cita médica
app.put('/api/appointments/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Confirmed', 'Cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Estado no válido. Debe ser Confirmed o Cancelled.' });
  }

  try {
    const db = await getDatabaseConnection();

    const appt = await db.get(`
      SELECT a.*, p.name, p.email 
      FROM appointments a 
      JOIN patients p ON a.patient_id = p.id 
      WHERE a.id = ?
    `, [id]);

    if (!appt) {
      return res.status(404).json({ error: 'Cita no encontrada.' });
    }

    await db.run('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);

    await sendNotificationEmail(appt.email, appt.name, appt.date, appt.time, appt.motive, status);

    res.json({ message: `Cita ${status === 'Confirmed' ? 'confirmada' : 'cancelada'} correctamente.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el estado de la cita.' });
  }
});

// Endpoint para obtener pacientes y sus respectivos historiales de citas
app.get('/api/patients', async (req, res) => {
  try {
    const db = await getDatabaseConnection();
    const patients = await db.all('SELECT * FROM patients ORDER BY name ASC');
    
    const patientsWithHistory = [];
    for (const p of patients) {
      const history = await db.all(
        'SELECT id, date, time, motive, status FROM appointments WHERE patient_id = ? ORDER BY date DESC',
        [p.id]
      );
      
      const motives = history.map(h => h.motive);
      let favoriteMotive = 'N/A';
      if (motives.length > 0) {
        const counts = motives.reduce((acc, curr) => {
          acc[curr] = (acc[curr] || 0) + 1;
          return acc;
        }, {});
        favoriteMotive = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      }

      patientsWithHistory.push({
        ...p,
        appointments_count: history.length,
        favorite_motive: favoriteMotive,
        history
      });
    }

    res.json(patientsWithHistory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el historial de pacientes.' });
  }
});

// Función para escapar valores para CSV de forma segura
function escapeCSVValue(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Funciones de cálculo demográfico local (respaldo del servicio Python)
function calculateAgeJS(dobStr, refDateStr) {
  const dob = new Date(dobStr);
  const ref = new Date(refDateStr);
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) {
    age--;
  }
  return isNaN(age) ? 30 : Math.max(0, age);
}

function getAgeGroupJS(age) {
  if (age < 15) return 'Niño';
  if (age < 65) return 'Adulto';
  return 'Adulto Mayor';
}

// Endpoint del Dashboard integrado (consulta analíticas a Python con fallback en JS)
app.get('/api/dashboard', async (req, res) => {
  try {
    const db = await getDatabaseConnection();
    const appointments = await db.all(`
      SELECT 
        a.id, a.date, a.time, a.motive, a.status,
        p.name as patient_name, p.email as patient_email, 
        p.phone as patient_phone, p.dob as patient_dob
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
    `);

    try {
      console.log(`[Python Request] Consultando analítica a ${PYTHON_SERVICE_URL}/analyze...`);
      const response = await axios.post(`${PYTHON_SERVICE_URL}/analyze`, appointments, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 3000
      });
      console.log('[Python Response] Analítica obtenida con éxito desde Python.');
      return res.json(response.data);
    } catch (pythonError) {
      console.warn('[Python Fallback] Usando cálculos locales en JS de respaldo:', pythonError.message);
      
      if (appointments.length === 0) {
        return res.json({
          total_appointments: 0,
          status_distribution: {},
          age_group_distribution: { Niño: 0, Adulto: 0, "Adulto Mayor": 0 },
          age_group_percentages: { Niño: 0, Adulto: 0, "Adulto Mayor": 0 },
          top_motives: [],
          motives_by_age_group: { Niño: [], Adulto: [], "Adulto Mayor": [] },
          appointments_by_day: []
        });
      }

      const total = appointments.length;
      const status_dist = {};
      const age_dist = { Niño: 0, Adulto: 0, 'Adulto Mayor': 0 };
      const motivesCount = {};
      const motivesByGroup = { Niño: {}, Adulto: {}, 'Adulto Mayor': {} };
      const appointmentsByDay = {};

      appointments.forEach(appt => {
        status_dist[appt.status] = (status_dist[appt.status] || 0) + 1;
        
        const age = calculateAgeJS(appt.patient_dob, appt.date);
        const group = getAgeGroupJS(age);
        age_dist[group] = (age_dist[group] || 0) + 1;

        motivesCount[appt.motive] = (motivesCount[appt.motive] || 0) + 1;

        motivesByGroup[group][appt.motive] = (motivesByGroup[group][appt.motive] || 0) + 1;

        appointmentsByDay[appt.date] = (appointmentsByDay[appt.date] || 0) + 1;
      });

      const age_pct = {
        Niño: parseFloat(((age_dist.Niño / total) * 100).toFixed(1)),
        Adulto: parseFloat(((age_dist.Adulto / total) * 100).toFixed(1)),
        'Adulto Mayor': parseFloat(((age_dist['Adulto Mayor'] / total) * 100).toFixed(1)),
      };

      const top_motives = Object.entries(motivesCount)
        .map(([motive, count]) => ({ motive, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const motives_by_age_group = {};
      Object.keys(motivesByGroup).forEach(group => {
        motives_by_age_group[group] = Object.entries(motivesByGroup[group])
          .map(([motive, count]) => ({ motive, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      });

      const appointments_by_day = Object.entries(appointmentsByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return res.json({
        total_appointments: total,
        status_distribution: status_dist,
        age_group_distribution: age_dist,
        age_group_percentages: age_pct,
        top_motives,
        motives_by_age_group,
        appointments_by_day,
        _fallback: true
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar el dashboard.' });
  }
});

// Endpoint para descargar reporte general CSV (generación vía Python con fallback local)
app.get(['/api/report/csv', '/api/reports/general/csv'], async (req, res) => {
  try {
    const db = await getDatabaseConnection();
    const appointments = await db.all(`
      SELECT 
        a.id, a.date, a.time, a.motive, a.status,
        p.name as patient_name, p.email as patient_email, 
        p.phone as patient_phone, p.dob as patient_dob
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
    `);

    try {
      console.log(`[Python Request] Solicitando CSV general a ${PYTHON_SERVICE_URL}/report/csv...`);
      const response = await axios.post(`${PYTHON_SERVICE_URL}/report/csv`, appointments, {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'arraybuffer'
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=reporte_sapu_citas.csv');
      return res.send(response.data);
    } catch (pythonError) {
      console.warn('[Python Fallback] Usando generación local de CSV general:', pythonError.message);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=reporte_sapu_citas.csv');
      res.write('\uFEFF'); // BOM para Excel
      res.write('sep=,\n'); // Forzar delimitador de comas en Excel
      res.write('ID Cita,Nombre Paciente,Email,Telefono,Fecha de Nacimiento,Edad al Agendar,Grupo de Edad,Fecha Cita,Hora Cita,Motivo Cita,Estado\n');
      
      appointments.forEach(appt => {
        const age = calculateAgeJS(appt.patient_dob, appt.date);
        const group = getAgeGroupJS(age);
        res.write([
          appt.id,
          escapeCSVValue(appt.patient_name),
          escapeCSVValue(appt.patient_email),
          escapeCSVValue(appt.patient_phone),
          appt.patient_dob,
          age,
          escapeCSVValue(group),
          appt.date,
          appt.time,
          escapeCSVValue(appt.motive),
          escapeCSVValue(appt.status)
        ].join(',') + '\n');
      });
      
      return res.end();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar el reporte CSV general.' });
  }
});

// Endpoint para descargar reporte demográfico y de demanda CSV (generación vía Python con fallback local)
app.get('/api/reports/demographics/csv', async (req, res) => {
  try {
    const db = await getDatabaseConnection();
    const appointments = await db.all(`
      SELECT 
        a.id, a.date, a.time, a.motive, a.status,
        p.name as patient_name, p.email as patient_email, 
        p.phone as patient_phone, p.dob as patient_dob
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
    `);

    try {
      console.log(`[Python Request] Solicitando CSV demográfico a ${PYTHON_SERVICE_URL}/report/demographics/csv...`);
      const response = await axios.post(`${PYTHON_SERVICE_URL}/report/demographics/csv`, appointments, {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'arraybuffer'
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=reporte_sapu_demografia.csv');
      return res.send(response.data);
    } catch (pythonError) {
      console.warn('[Python Fallback] Usando generación local de CSV demográfico:', pythonError.message);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=reporte_sapu_demografia.csv');
      res.write('\uFEFF'); // BOM para Excel
      res.write('sep=,\n'); // Forzar delimitador de comas en Excel
      
      res.write('Reporte Demográfico y de Demanda SAPU\n');
      res.write(`Generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`);
      
      res.write('CANTIDAD DE CITAS POR TIPO Y RANGO DE EDAD\n');
      res.write('Tipo de Cita (Motivo),Niños (<15 años),Adultos (15-64 años),Adultos Mayores (65+ años),Total Citas\n');
      
      const motivesSet = new Set();
      const distribution = {};
      const ageGroups = { Niño: 0, Adulto: 0, 'Adulto Mayor': 0 };
      const motivesCount = {};
      
      appointments.forEach(appt => {
        const age = calculateAgeJS(appt.patient_dob, appt.date);
        const group = getAgeGroupJS(age);
        
        motivesSet.add(appt.motive);
        if (!distribution[appt.motive]) {
          distribution[appt.motive] = { Niño: 0, Adulto: 0, 'Adulto Mayor': 0, total: 0 };
        }
        distribution[appt.motive][group]++;
        distribution[appt.motive].total++;
        
        ageGroups[group]++;
        motivesCount[appt.motive] = (motivesCount[appt.motive] || 0) + 1;
      });
      
      Array.from(motivesSet).sort().forEach(m => {
        const row = distribution[m];
        res.write(`${escapeCSVValue(m)},${row.Niño},${row.Adulto},${row['Adulto Mayor']},${row.total}\n`);
      });
      
      res.write('\nRESUMEN DE DEMANDA POR GRUPO DE EDAD\n');
      res.write('Grupo de Edad,Total Citas,Porcentaje\n');
      const totalAppts = appointments.length;
      if (totalAppts > 0) {
        Object.entries(ageGroups).forEach(([group, count]) => {
          const pct = ((count / totalAppts) * 100).toFixed(1);
          res.write(`${escapeCSVValue(group)},${count},${pct}%\n`);
        });
      } else {
        res.write('Sin citas registradas,0,0%\n');
      }
      
      res.write('\nRANKING DE TIPOS DE CITA MÁS DEMANDADOS\n');
      res.write('Posición,Tipo de Cita (Motivo),Total Citas\n');
      const sortedMotives = Object.entries(motivesCount)
        .sort((a, b) => b[1] - a[1]);
        
      sortedMotives.forEach(([motive, count], idx) => {
        res.write(`${idx + 1},${escapeCSVValue(motive)},${count}\n`);
      });
      
      return res.end();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar el reporte demográfico CSV.' });
  }
});

// Endpoint auxiliar para ver logs de correos
app.get('/api/emails/logs', (req, res) => {
  try {
    const rawData = fs.readFileSync(EMAILS_LOG_PATH);
    const emails = JSON.parse(rawData);
    res.json(emails);
  } catch (err) {
    res.status(500).json({ error: 'Error al leer logs de correo.' });
  }
});

// Inicialización de la base de datos y arranque
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor Node.js corriendo en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error al inicializar la base de datos:', err);
  });
