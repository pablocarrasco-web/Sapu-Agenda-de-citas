# 🗓️ SAPU - Sistema de Agendas Médicas

Una solución integral y moderna para la programación y análisis de citas médicas en el **Servicio de Atención Primaria de Urgencia (SAPU)**. Este proyecto consta de una arquitectura distribuida que integra un frontend interactivo en React, una API Backend robusta en Node.js/Express, y un microservicio de analítica avanzada en Python/FastAPI.

---

## 🏗️ Arquitectura del Proyecto

El sistema está dividido en tres módulos principales:

```
Sapu_agendas/
├── client/        # Frontend: React + Vite + CSS Custom (Puerto 8080)
├── server/        # Backend: Node.js + Express.js + SQLite (sapu.db) (Puerto 5000)
└── analytics/     # Analytics Engine: Python + FastAPI + Uvicorn (Puerto 8081)
```

1. **Frontend (`/client`)**: Interfaz de usuario interactiva construida con React y Vite. Permite la visualización de agendas, ingreso de nuevos pacientes, agendamiento de citas y acceso a un panel de control con métricas en tiempo real. **Corre en el puerto 8080.**
2. **Backend API (`/server`)**: API REST que gestiona las reglas del negocio, la persistencia en base de datos SQLite y el envío automático de notificaciones por correo electrónico mediante Nodemailer. **Corre en el puerto 5000.**
3. **Servicio de Analítica (`/analytics`)**: Servicio en Python que procesa los datos de las citas y genera segmentaciones demográficas por grupos de edad (Niños, Adultos y Adultos Mayores), análisis de motivos de consulta más recurrentes y reportes en formato CSV de alto rendimiento. **Corre en el puerto 8081.**

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado en tu equipo:
*   [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada)
*   [Python](https://www.python.org/) (Versión 3.8 o superior)
*   [PowerShell](https://learn.microsoft.com/es-es/powershell/scripting/install/installing-powershell) (si deseas utilizar el script de inicio rápido en Windows)

---

## ⚡ Inicio Rápido (Recomendado para Windows)

El proyecto incluye un script de PowerShell (`run_dev.ps1`) en la raíz que se encarga de recargar variables del entorno, instalar dependencias faltantes e iniciar los tres servicios de manera concurrente en ventanas independientes de terminal.

Para ejecutarlo:

1. Abre una terminal de **PowerShell** en la raíz del proyecto.
2. Ejecuta el script:
   ```powershell
   ./run_dev.ps1
   ```

> [!TIP]
> Si recibes un error sobre las políticas de ejecución de scripts en PowerShell, puedes ejecutar temporalmente:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` y luego volver a lanzar `./run_dev.ps1`.

---

## 🚀 Inicio Manual Paso a Paso

Si prefieres ejecutar cada servicio de forma individual o estás en un sistema operativo diferente a Windows (macOS/Linux), sigue estas instrucciones:

### 1. Motor de Analítica (Python + FastAPI)
El backend requiere que el motor analítico esté en funcionamiento para desplegar las estadísticas demográficas.

```bash
# 1. Navegar al directorio del servicio
cd analytics

# 2. (Recomendado) Crear y activar un entorno virtual
# En Windows:
python -m venv venv
.\venv\Scripts\activate

# En macOS/Linux:
# python3 -m venv venv
# source venv/bin/activate

# 3. Instalar las dependencias necesarias
pip install -r requirements.txt

# 4. Iniciar el servicio con Uvicorn
python -m uvicorn main:app --host 127.0.0.1 --port 8081 --reload
```
*   **URL de la API de Analítica**: `http://127.0.0.1:8081`
*   **Documentación Interactiva (Swagger UI)**: `http://127.0.0.1:8081/docs`

---

### 2. Backend API (Node.js + Express)
El backend se encarga de inicializar la base de datos y proveer los datos al cliente web.

```bash
# 1. Navegar al directorio del servidor
cd server

# 2. Instalar las dependencias de Node.js
npm install

# 3. Iniciar el servidor en modo desarrollo
npm run dev
```

> [!NOTE]
> Al iniciar el servidor por primera vez, este detectará si la base de datos `sapu.db` (SQLite) está vacía. Si es así, **sembrará datos de prueba automáticamente (Seed Data)** con pacientes ficticios y citas en fechas pasadas, actuales y futuras para que puedas visualizar la plataforma con información real desde el primer segundo.

*   **URL de la API Backend**: `http://localhost:5000`

---

### 3. Frontend Web (React + Vite)
El portal de administración y agendamiento web.

```bash
# 1. Navegar al directorio del cliente
cd client

# 2. Instalar las dependencias de Node.js
npm install

# 3. Iniciar el servidor de desarrollo de Vite
npm run dev
```
*   **URL de la Aplicación**: `http://localhost:8080`

---

## ⚙️ Configuración y Variables de Entorno

El servidor backend (`/server`) puede configurarse mediante variables de entorno. Puedes crear un archivo `.env` en la carpeta `/server` para personalizar los siguientes parámetros:

| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto de escucha del backend Express | `5000` |
| `PYTHON_SERVICE_URL` | Endpoint del microservicio de analítica | `http://127.0.0.1:8081` |
| `SMTP_HOST` | Host SMTP para notificaciones por correo | `smtp.ethereal.email` |
| `SMTP_PORT` | Puerto SMTP | `587` |
| `SMTP_USER` | Usuario/Correo SMTP | *Ninguno (Desactivado)* |
| `SMTP_PASS` | Contraseña SMTP | *Ninguno (Desactivado)* |

> [!IMPORTANT]
> Si no se configuran credenciales SMTP reales (`SMTP_USER` y `SMTP_PASS`), el sistema utilizará de forma automática cuentas de prueba gratuitas de **Ethereal Email**. Los correos de confirmación salientes se imprimirán en la consola del backend y se guardará un registro local en `/server/emails_sent.json`.

---

## 📊 Resumen de Puertos y Servicios

Una vez que el proyecto esté corriendo, puedes acceder a los siguientes servicios en tu navegador o cliente API:

| Servicio | Tecnología | URL Local |
| :--- | :--- | :--- |
| **Frontend Web** | React (Vite) | [http://localhost:8080](http://localhost:8080) |
| **Backend REST API** | Express | [http://localhost:5000](http://localhost:5000) |
| **Microservicio Analítico** | FastAPI | [http://localhost:8081](http://localhost:8081) |
| **Documentación Swagger** | OpenAPI | [http://localhost:8081/docs](http://localhost:8081/docs) |
