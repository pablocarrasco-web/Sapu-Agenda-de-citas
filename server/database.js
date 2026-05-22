const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'sapu.db');

async function getDatabaseConnection() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

// Inicialización de la base de datos SQLite y tablas necesarias
async function initializeDatabase() {
  const db = await getDatabaseConnection();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      dob TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      motive TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  const patientCount = await db.get('SELECT COUNT(*) as count FROM patients');
  
  // Insertar datos iniciales de prueba si la base de datos está vacía
  if (patientCount.count === 0) {
    console.log('Base de datos vacía. Insertando datos de prueba...');

    const seedPatients = [
      { name: 'Mateo González', email: 'mateo.gonzalez@example.com', phone: '+56912345678', dob: '2018-05-12' },
      { name: 'Sofía Muñoz', email: 'sofia.munoz@example.com', phone: '+56923456789', dob: '2015-11-23' },
      { name: 'Tomás Riquelme', email: 'tomas.riq@example.com', phone: '+56934567890', dob: '2021-02-14' },
      { name: 'Camila Silva', email: 'camila.silva@example.com', phone: '+56945678901', dob: '1995-08-30' },
      { name: 'Diego Soto', email: 'diego.soto@example.com', phone: '+56956789012', dob: '1988-04-15' },
      { name: 'Valentina Rojas', email: 'val.rojas@example.com', phone: '+56967890123', dob: '2001-12-05' },
      { name: 'Javier Valenzuela', email: 'javier.val@example.com', phone: '+56978901234', dob: '1975-07-22' },
      { name: 'María Inés Carrasco', email: 'maria.carrasco@example.com', phone: '+56989012345', dob: '1955-03-18' },
      { name: 'Manuel Contreras', email: 'manuel.contreras@example.com', phone: '+56990123456', dob: '1948-10-09' },
      { name: 'Rosa Ester Tapia', email: 'rosa.tapia@example.com', phone: '+56991234567', dob: '1951-06-25' }
    ];

    const insertedPatients = [];
    for (const p of seedPatients) {
      const result = await db.run(
        'INSERT INTO patients (name, email, phone, dob) VALUES (?, ?, ?, ?)',
        [p.name, p.email, p.phone, p.dob]
      );
      insertedPatients.push({ ...p, id: result.lastID });
    }

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];
    const threeDaysAgo = new Date(Date.now() - 259200000).toISOString().split('T')[0];

    const seedAppointments = [
      { patient_id: insertedPatients[0].id, date: twoDaysAgo, time: '09:30', motive: 'Control Niño Sano', status: 'Confirmed' },
      { patient_id: insertedPatients[1].id, date: threeDaysAgo, time: '10:00', motive: 'Vacunación Escolar', status: 'Confirmed' },
      { patient_id: insertedPatients[3].id, date: yesterday, time: '14:30', motive: 'Consulta General', status: 'Confirmed' },
      { patient_id: insertedPatients[4].id, date: twoDaysAgo, time: '11:15', motive: 'Urgencia Odontológica', status: 'Cancelled' },
      { patient_id: insertedPatients[7].id, date: threeDaysAgo, time: '16:00', motive: 'Control Cardiovascular', status: 'Confirmed' },
      { patient_id: insertedPatients[8].id, date: yesterday, time: '08:45', motive: 'Control Crónicos', status: 'Confirmed' },
      { patient_id: insertedPatients[2].id, date: today, time: '10:15', motive: 'Control Niño Sano', status: 'Pending' },
      { patient_id: insertedPatients[5].id, date: today, time: '11:30', motive: 'Consulta General', status: 'Confirmed' },
      { patient_id: insertedPatients[9].id, date: today, time: '15:00', motive: 'Control Cardiovascular', status: 'Pending' },
      { patient_id: insertedPatients[6].id, date: tomorrow, time: '09:00', motive: 'Consulta General', status: 'Pending' },
      { patient_id: insertedPatients[0].id, date: tomorrow, time: '11:00', motive: 'Vacunación Alergias', status: 'Pending' },
      { patient_id: insertedPatients[7].id, date: tomorrow, time: '16:30', motive: 'Control Crónicos', status: 'Pending' }
    ];

    for (const appt of seedAppointments) {
      await db.run(
        'INSERT INTO appointments (patient_id, date, time, motive, status) VALUES (?, ?, ?, ?, ?)',
        [appt.patient_id, appt.date, appt.time, appt.motive, appt.status]
      );
    }
    console.log('Se sembraron los datos de prueba exitosamente.');
  }

  return db;
}

module.exports = {
  getDatabaseConnection,
  initializeDatabase
};
