from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import io
import csv
from collections import Counter

app = FastAPI(title="SAPU Analytics Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AppointmentData(BaseModel):
    id: Optional[int] = None
    patient_name: str
    patient_email: str
    patient_phone: str
    patient_dob: str  # YYYY-MM-DD
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    motive: str
    status: str

def calculate_age(dob_str: str, ref_date_str: str) -> int:
    try:
        dob = datetime.strptime(dob_str[:10], "%Y-%m-%d")
        ref = datetime.strptime(ref_date_str[:10], "%Y-%m-%d")
        age = ref.year - dob.year - ((ref.month, ref.day) < (dob.month, dob.day))
        return max(0, age)
    except Exception:
        return 30

def get_age_group(age: int) -> str:
    if age < 15:
        return "Niño"
    elif age < 65:
        return "Adulto"
    else:
        return "Adulto Mayor"

# Endpoint principal para procesar métricas de citas
@app.post("/analyze")
def analyze_appointments(appointments: List[AppointmentData]):
    if not appointments:
        return {
            "total_appointments": 0,
            "status_distribution": {},
            "age_group_distribution": {"Niño": 0, "Adulto": 0, "Adulto Mayor": 0},
            "age_group_percentages": {"Niño": 0.0, "Adulto": 0.0, "Adulto Mayor": 0.0},
            "top_motives": [],
            "motives_by_age_group": {"Niño": [], "Adulto": [], "Adulto Mayor": []},
            "appointments_by_day": []
        }

    total = len(appointments)
    statuses = []
    age_groups = []
    motives = []
    motives_by_group = {"Niño": [], "Adulto": [], "Adulto Mayor": []}
    appointments_by_day_dict = {}

    for appt in appointments:
        age = calculate_age(appt.patient_dob, appt.date)
        group = get_age_group(age)
        
        statuses.append(appt.status)
        age_groups.append(group)
        motives.append(appt.motive)
        motives_by_group[group].append(appt.motive)
        
        date_str = appt.date
        appointments_by_day_dict[date_str] = appointments_by_day_dict.get(date_str, 0) + 1

    status_counts = dict(Counter(statuses))

    age_counts = Counter(age_groups)
    age_dist = {
        "Niño": age_counts.get("Niño", 0),
        "Adulto": age_counts.get("Adulto", 0),
        "Adulto Mayor": age_counts.get("Adulto Mayor", 0)
    }
    age_pct = {
        k: round((v / total) * 100, 1) for k, v in age_dist.items()
    }

    motive_counts = Counter(motives)
    top_motives = [{"motive": k, "count": v} for k, v in motive_counts.most_common(5)]

    motives_by_age_summary = {}
    for group, group_motives in motives_by_group.items():
        g_counts = Counter(group_motives)
        motives_by_age_summary[group] = [
            {"motive": k, "count": v} for k, v in g_counts.most_common(5)
        ]

    sorted_days = sorted(appointments_by_day_dict.items(), key=lambda x: x[0])
    appointments_by_day = [{"date": k, "count": v} for k, v in sorted_days]

    return {
        "total_appointments": total,
        "status_distribution": status_counts,
        "age_group_distribution": age_dist,
        "age_group_percentages": age_pct,
        "top_motives": top_motives,
        "motives_by_age_group": motives_by_age_summary,
        "appointments_by_day": appointments_by_day
    }

# Endpoint para generar el reporte de citas en formato CSV
@app.post("/report/csv")
def generate_csv_report(appointments: List[AppointmentData]):
    output = io.StringIO()
    output.write("sep=,\n")
    writer = csv.writer(output)
    
    writer.writerow([
        "ID Cita", "Nombre Paciente", "Email", "Teléfono", 
        "Fecha de Nacimiento", "Edad al Agendar", "Grupo de Edad", 
        "Fecha Cita", "Hora Cita", "Motivo Cita", "Estado"
    ])
    
    for appt in appointments:
        age = calculate_age(appt.patient_dob, appt.date)
        group = get_age_group(age)
        writer.writerow([
            appt.id or "N/A",
            appt.patient_name,
            appt.patient_email,
            appt.patient_phone,
            appt.patient_dob,
            age,
            group,
            appt.date,
            appt.time,
            appt.motive,
            appt.status
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=reporte_sapu_citas.csv"}
    )

# Endpoint para generar el reporte demográfico y de demanda en formato CSV
@app.post("/report/demographics/csv")
def generate_demographics_csv_report(appointments: List[AppointmentData]):
    output = io.StringIO()
    output.write("sep=,\n")
    writer = csv.writer(output)
    
    # 1. Título y Cabecera
    writer.writerow(["Reporte Demográfico y de Demanda SAPU"])
    writer.writerow([f"Generado el: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
    writer.writerow([])
    
    writer.writerow(["CANTIDAD DE CITAS POR TIPO Y RANGO DE EDAD"])
    writer.writerow([
        "Tipo de Cita (Motivo)", "Niños (<15 años)", "Adultos (15-64 años)", 
        "Adultos Mayores (65+ años)", "Total Citas"
    ])
    
    # Procesar agrupaciones
    motives_set = set()
    distribution = {}  # motive -> { "Niño": 0, "Adulto": 0, "Adulto Mayor": 0, "total": 0 }
    age_groups = {"Niño": 0, "Adulto": 0, "Adulto Mayor": 0}
    motives_count = {}
    
    for appt in appointments:
        age = calculate_age(appt.patient_dob, appt.date)
        group = get_age_group(age)
        
        motives_set.add(appt.motive)
        if appt.motive not in distribution:
            distribution[appt.motive] = {"Niño": 0, "Adulto": 0, "Adulto Mayor": 0, "total": 0}
        
        distribution[appt.motive][group] += 1
        distribution[appt.motive]["total"] += 1
        
        age_groups[group] += 1
        motives_count[appt.motive] = motives_count.get(appt.motive, 0) + 1
        
    for m in sorted(list(motives_set)):
        row = distribution[m]
        writer.writerow([m, row["Niño"], row["Adulto"], row["Adulto Mayor"], row["total"]])
        
    writer.writerow([])
    writer.writerow(["RESUMEN DE DEMANDA POR GRUPO DE EDAD"])
    writer.writerow(["Grupo de Edad", "Total Citas", "Porcentaje"])
    total_appts = len(appointments)
    if total_appts > 0:
        for group, count in age_groups.items():
            pct = f"{round((count / total_appts) * 100, 1)}%"
            writer.writerow([group, count, pct])
    else:
        writer.writerow(["Sin citas registradas", 0, "0.0%"])
        
    writer.writerow([])
    writer.writerow(["RANKING DE TIPOS DE CITA MÁS DEMANDADOS"])
    writer.writerow(["Posición", "Tipo de Cita (Motivo)", "Total Citas"])
    
    sorted_motives = sorted(motives_count.items(), key=lambda x: x[1], reverse=True)
    for idx, (motive, count) in enumerate(sorted_motives):
        writer.writerow([idx + 1, motive, count])
        
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=reporte_sapu_demografia.csv"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
