from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel, validator
from typing import List, Dict, Any, Optional
import joblib
import numpy as np
import sqlite3
import json
import datetime
from pathlib import Path

# Initialize FastAPI app
app = FastAPI(title="Digital Twin Inventory Management System")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Database connection
def get_db():
    conn = sqlite3.connect('inventory.db', check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

# Database initialization
def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Create machines table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS machines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('motor', 'blade')),
            installation_date DATE DEFAULT CURRENT_DATE,
            manufacturer TEXT,
            model TEXT,
            location TEXT,
            status TEXT DEFAULT 'operational' CHECK(status IN ('operational', 'maintenance', 'decommissioned'))
        )
    ''')
    
    # Create motor_details table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS motor_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id TEXT NOT NULL,
            max_current_phase_a FLOAT,
            max_current_phase_b FLOAT,
            max_current_phase_c FLOAT,
            max_power_consumption FLOAT,
            max_temperature FLOAT,
            max_vibration FLOAT,
            nominal_speed FLOAT,
            FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE
        )
    ''')
    
    # Create blade_details table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS blade_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id TEXT NOT NULL,
            max_vibration FLOAT,
            max_torque FLOAT,
            max_speed FLOAT,
            max_noise FLOAT,
            max_temperature FLOAT,
            material TEXT,
            length FLOAT,
            width FLOAT,
            FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE
        )
    ''')
    
    # Create sensor_readings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            current_phase_a FLOAT,
            current_phase_b FLOAT,
            current_phase_c FLOAT,
            power_consumption FLOAT,
            power_factor FLOAT,
            vibration FLOAT,
            temperature FLOAT,
            speed FLOAT,
            torque FLOAT,
            noise FLOAT,
            FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE
        )
    ''')
    
    # Create predictions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            health_status TEXT,
            rul_hours FLOAT,
            confidence FLOAT,
            maintenance_required BOOLEAN,
            FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    print("Database initialized successfully!")

# Load ML models
motor_models = {}
blade_models = {}

def load_models():
    try:
        # Motor models
        motor_models['classifier'] = joblib.load('saved_models/motor_gradient_boosting_classifier.pkl')
        motor_models['regressor'] = joblib.load('saved_models/motor_gradient_boosting_regressor.pkl')
        motor_models['scaler'] = joblib.load('saved_models/motor_scaler.pkl')
        motor_models['encoder'] = joblib.load('saved_models/motor_label_encoder.pkl')
        
        # Blade models
        blade_models['classifier'] = joblib.load('saved_models/blade_gradient_boosting_classifier.pkl')
        blade_models['regressor'] = joblib.load('saved_models/blade_gradient_boosting_regressor.pkl')
        blade_models['scaler'] = joblib.load('saved_models/blade_scaler.pkl')
        blade_models['encoder'] = joblib.load('saved_models/blade_label_encoder.pkl')
        
        print("✅ All models loaded successfully!")
    except Exception as e:
        print(f"❌ Error loading models: {e}")

# Pydantic models
class MachineBase(BaseModel):
    machine_id: str
    name: str
    type: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    location: Optional[str] = None

class MotorDetails(BaseModel):
    max_current_phase_a: float
    max_current_phase_b: float
    max_current_phase_c: float
    max_power_consumption: float
    max_temperature: float
    max_vibration: float
    nominal_speed: float

class BladeDetails(BaseModel):
    max_vibration: float
    max_torque: float
    max_speed: float
    max_noise: float
    max_temperature: float
    material: str
    length: float
    width: float

class MachineCreate(MachineBase):
    motor_details: Optional[MotorDetails] = None
    blade_details: Optional[BladeDetails] = None

    @validator('type')
    def validate_type(cls, v):
        if v not in ['motor', 'blade']:
            raise ValueError('Type must be either "motor" or "blade"')
        return v

class SensorData(BaseModel):
    machine_id: str
    current_phase_a: Optional[float] = None
    current_phase_b: Optional[float] = None
    current_phase_c: Optional[float] = None
    power_consumption: Optional[float] = None
    power_factor: Optional[float] = None
    vibration: Optional[float] = None
    temperature: Optional[float] = None
    speed: Optional[float] = None
    torque: Optional[float] = None
    noise: Optional[float] = None

class PredictionResponse(BaseModel):
    health_status: str
    rul_hours: float
    confidence_scores: Dict[str, float]
    color_code: str
    maintenance_required: bool

# NEW: API endpoint to get machine type for 3D model loading
@app.get("/machines/{machine_id}/type")
async def get_machine_type(machine_id: str):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT type FROM machines WHERE machine_id = ?", (machine_id,))
    machine = cursor.fetchone()
    
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    return {"machine_id": machine_id, "type": machine['type']}

# Startup event
@app.on_event("startup")
async def startup_event():
    init_db()
    load_models()

# Routes
@app.get("/", response_class=HTMLResponse)
async def read_root():
    return FileResponse("static/index.html")

@app.post("/machines/", response_model=Dict[str, Any])
async def create_machine(machine: MachineCreate):
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Insert into machines table
        cursor.execute(
            "INSERT INTO machines (machine_id, name, type, manufacturer, model, location) VALUES (?, ?, ?, ?, ?, ?)",
            (machine.machine_id, machine.name, machine.type, machine.manufacturer, machine.model, machine.location)
        )
        
        # Insert into specific details table
        if machine.type == 'motor' and machine.motor_details:
            cursor.execute(
                """INSERT INTO motor_details 
                (machine_id, max_current_phase_a, max_current_phase_b, max_current_phase_c, 
                 max_power_consumption, max_temperature, max_vibration, nominal_speed) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (machine.machine_id, machine.motor_details.max_current_phase_a, 
                 machine.motor_details.max_current_phase_b, machine.motor_details.max_current_phase_c,
                 machine.motor_details.max_power_consumption, machine.motor_details.max_temperature,
                 machine.motor_details.max_vibration, machine.motor_details.nominal_speed)
            )
        elif machine.type == 'blade' and machine.blade_details:
            cursor.execute(
                """INSERT INTO blade_details 
                (machine_id, max_vibration, max_torque, max_speed, max_noise, max_temperature, material, length, width) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (machine.machine_id, machine.blade_details.max_vibration, 
                 machine.blade_details.max_torque, machine.blade_details.max_speed,
                 machine.blade_details.max_noise, machine.blade_details.max_temperature,
                 machine.blade_details.material, machine.blade_details.length, machine.blade_details.width)
            )
        
        conn.commit()
        return {"message": "Machine added successfully", "machine_id": machine.machine_id}
    
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Machine ID already exists")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding machine: {str(e)}")

@app.get("/machines/", response_model=List[Dict[str, Any]])
async def get_machines():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT m.*, 
               COALESCE((SELECT health_status FROM predictions 
                         WHERE machine_id = m.machine_id 
                         ORDER BY timestamp DESC LIMIT 1), 'Unknown') as current_status,
               COALESCE((SELECT rul_hours FROM predictions 
                         WHERE machine_id = m.machine_id 
                         ORDER BY timestamp DESC LIMIT 1), 0) as current_rul
        FROM machines m
        ORDER BY m.installation_date DESC
    """)
    
    machines = []
    for row in cursor.fetchall():
        machine = dict(row)
        machines.append(machine)
    
    return machines

@app.get("/machines/{machine_id}", response_model=Dict[str, Any])
async def get_machine(machine_id: str):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM machines WHERE machine_id = ?", (machine_id,))
    machine = cursor.fetchone()
    
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    result = dict(machine)
    
    # Get machine-specific details
    if result['type'] == 'motor':
        cursor.execute("SELECT * FROM motor_details WHERE machine_id = ?", (machine_id,))
        details = cursor.fetchone()
        if details:
            result['details'] = dict(details)
    else:
        cursor.execute("SELECT * FROM blade_details WHERE machine_id = ?", (machine_id,))
        details = cursor.fetchone()
        if details:
            result['details'] = dict(details)
    
    # Get latest prediction
    cursor.execute("""
        SELECT * FROM predictions 
        WHERE machine_id = ? 
        ORDER BY timestamp DESC 
        LIMIT 1
    """, (machine_id,))
    
    prediction = cursor.fetchone()
    if prediction:
        result['latest_prediction'] = dict(prediction)
    
    return result

@app.post("/predict/", response_model=PredictionResponse)
async def predict_health(sensor_data: SensorData):
    conn = get_db()
    cursor = conn.cursor()
    
    # Get machine type
    cursor.execute("SELECT type FROM machines WHERE machine_id = ?", (sensor_data.machine_id,))
    machine = cursor.fetchone()
    
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    machine_type = machine['type']
    
    try:
        if machine_type == 'motor':
            # Prepare features for motor
            features = np.array([[
                sensor_data.current_phase_a or 0,
                sensor_data.current_phase_b or 0,
                sensor_data.current_phase_c or 0,
                sensor_data.power_consumption or 0,
                sensor_data.power_factor or 0,
                sensor_data.vibration or 0,
                sensor_data.temperature or 0,
                sensor_data.speed or 0
            ]])
            
            # Preprocess features
            scaled_features = motor_models['scaler'].transform(features)
            
            # Predict health status
            health_encoded = motor_models['classifier'].predict(scaled_features)
            health_status = motor_models['encoder'].inverse_transform(health_encoded)[0]
            
            # Predict RUL
            rul_prediction = motor_models['regressor'].predict(scaled_features)[0]
            
            # Get confidence scores
            probabilities = motor_models['classifier'].predict_proba(scaled_features)[0]
            confidence_scores = {
                cls: float(prob) for cls, prob in 
                zip(motor_models['encoder'].classes_, probabilities)
            }
            
        else:  # blade
            # Prepare features for blade
            features = np.array([[
                sensor_data.vibration or 0,
                sensor_data.torque or 0,
                sensor_data.speed or 0,
                sensor_data.noise or 0,
                sensor_data.temperature or 0
            ]])
            
            # Preprocess features
            scaled_features = blade_models['scaler'].transform(features)
            
            # Predict health status
            health_encoded = blade_models['classifier'].predict(scaled_features)
            health_status = blade_models['encoder'].inverse_transform(health_encoded)[0]
            
            # Predict RUL
            rul_prediction = blade_models['regressor'].predict(scaled_features)[0]
            
            # Get confidence scores
            probabilities = blade_models['classifier'].predict_proba(scaled_features)[0]
            confidence_scores = {
                cls: float(prob) for cls, prob in 
                zip(blade_models['encoder'].classes_, probabilities)
            }
        
        # Determine color and maintenance requirement
        color_code, maintenance_required = get_visualization_properties(health_status, rul_prediction)
        
        # Store prediction in database
        max_confidence = max(confidence_scores.values()) if confidence_scores else 0.0
        cursor.execute(
            """INSERT INTO predictions 
            (machine_id, health_status, rul_hours, confidence, maintenance_required) 
            VALUES (?, ?, ?, ?, ?)""",
            (sensor_data.machine_id, health_status, float(rul_prediction), max_confidence, maintenance_required)
        )
        
        # Store sensor readings
        cursor.execute(
            """INSERT INTO sensor_readings 
            (machine_id, current_phase_a, current_phase_b, current_phase_c, 
             power_consumption, power_factor, vibration, temperature, speed, torque, noise) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (sensor_data.machine_id, sensor_data.current_phase_a, sensor_data.current_phase_b, 
             sensor_data.current_phase_c, sensor_data.power_consumption, sensor_data.power_factor,
             sensor_data.vibration, sensor_data.temperature, sensor_data.speed, 
             sensor_data.torque, sensor_data.noise)
        )
        
        conn.commit()
        
        return PredictionResponse(
            health_status=health_status,
            rul_hours=float(rul_prediction),
            confidence_scores=confidence_scores,
            color_code=color_code,
            maintenance_required=maintenance_required
        )
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/machines/{machine_id}/history")
async def get_prediction_history(machine_id: str, limit: int = 10):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM predictions 
        WHERE machine_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
    """, (machine_id, limit))
    
    history = [dict(row) for row in cursor.fetchall()]
    return history

def get_visualization_properties(health_status: str, rul_hours: float) -> tuple:
    """Determine color and maintenance requirements"""
    if health_status == "Sharp":
        return "#28a745", False
    if health_status == "Critical" or rul_hours < 24 or health_status == "Crack Detected" and health_status != "Sharp":
        return "#dc3545", True  # Red - Immediate maintenance
    elif health_status == "Warning" or rul_hours < 300 or health_status == "Major Wear" and health_status != "Sharp":
        return "#ff7f00", True   # Orange - Schedule maintenance
    elif health_status != "Normal" or rul_hours < 700 or health_status == "Minor Wear" and health_status != "Sharp":
        return "#ffc107", True   # Yellow - Service needed
    else:
        return "#28a745", False  # Green - No maintenance needed

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)