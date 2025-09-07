-- Database schema for digital twin inventory
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
);

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
);

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
);

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
);

CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    health_status TEXT,
    rul_hours FLOAT,
    confidence FLOAT,
    maintenance_required BOOLEAN,
    FOREIGN KEY (machine_id) REFERENCES machines(machine_id) ON DELETE CASCADE
);