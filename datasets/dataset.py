import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import math
import random

# ---- CONFIG ----
N = 10000  # number of timesteps (1 Hz sampling ~ 2.8 hours)
ts0 = datetime.now()
dt = 1.0  # seconds

rng = np.random.default_rng(42)

# Blade types (from user's PDF list + common forms)
blade_types = [
    "Delta Form", "S Form", "4-Cut Form",
    "Krämer & Grebe 233", "Krämer & Grebe 423",
    "Laska M4S", "Seydelmann-BW"
]

# ---- Helper functions ----
def smooth_noise(n, scale=1.0, seed=None):
    r = np.cumsum(rng.normal(0, scale, n))
    r = (r - r.min()) / (r.max() - r.min() + 1e-9)  # 0..1
    r = (r - 0.5) * 2  # -1..1
    return r

def clamp(x, lo, hi):
    return np.minimum(np.maximum(x, lo), hi)

# ---- Timeline & base arrays ----
t = np.array([ts0 + timedelta(seconds=i) for i in range(N)])
sec = np.arange(N)

# Operating cycles: alternate load/no-load windows
cycle_len = 300  # 5 minutes per cycle
in_load = (sec % cycle_len) > (cycle_len * 0.2)  # 80% load, 20% idle

# Blade lifecycle schedule (state machine over time)
# 0..0.5: Sharp, 0.5..0.8: Minor, 0.8..0.95: Major, 0.95..1.0: Crack
p = np.linspace(0, 1, N)
blade_state = np.where(p < 0.5, "Sharp",
                np.where(p < 0.8, "Minor Wear",
                np.where(p < 0.95, "Major Wear", "Crack Detected")))

# Select a blade type for this run (or rotate types per cycle)
bt_idx = (sec // cycle_len) % len(blade_types)
blade_type_series = np.array([blade_types[i] for i in bt_idx])

# --- Blade physics-ish signals ---
# Baselines by condition
blade_vib_mu = np.select(
    [blade_state=="Sharp", blade_state=="Minor Wear", blade_state=="Major Wear", blade_state=="Crack Detected"],
    [0.6, 0.9, 1.3, 2.4]
)
blade_vib = blade_vib_mu + rng.normal(0, 0.05, N) + 0.05 * smooth_noise(N, 0.3)

blade_torque_mu = np.select(
    [blade_state=="Sharp", blade_state=="Minor Wear", blade_state=="Major Wear", blade_state=="Crack Detected"],
    [21.0, 26.0, 33.0, 36.0]
)
blade_torque = blade_torque_mu + (in_load.astype(float) * rng.normal(0.0, 1.2, N)) + (~in_load).astype(float)*rng.normal(-3.0, 1.0, N)
blade_torque = clamp(blade_torque, 5, 60)

blade_speed_mu = np.select(
    [blade_state=="Sharp", blade_state=="Minor Wear", blade_state=="Major Wear", blade_state=="Crack Detected"],
    [1200, 1180, 1160, 1100]
)
blade_speed = blade_speed_mu + rng.normal(0, 6, N) - (in_load.astype(float) * rng.normal(4, 2, N))

blade_noise_mu = np.select(
    [blade_state=="Sharp", blade_state=="Minor Wear", blade_state=="Major Wear", blade_state=="Crack Detected"],
    [68, 74, 78, 85]
)
blade_noise = blade_noise_mu + rng.normal(0, 1.0, N) + 0.5 * smooth_noise(N, 0.4)

blade_temp = np.select(
    [blade_state=="Sharp", blade_state=="Minor Wear", blade_state=="Major Wear", blade_state=="Crack Detected"],
    [35, 38, 42, 48]
).astype(float)
blade_temp += (in_load.astype(float) * 1.5) + rng.normal(0, 0.6, N)
blade_temp = clamp(blade_temp, 25, 90)

# RUL (cycles remaining) derived from position in lifecycle + stress (vibration & torque)
base_cycles = np.select(
    [blade_state=="Sharp", blade_state=="Minor Wear", blade_state=="Major Wear", blade_state=="Crack Detected"],
    [380, 150, 60, 10]
).astype(float)
stress = 0.4*clamp((blade_vib-0.6)/2.0, 0, 1) + 0.6*clamp((blade_torque-20)/20.0, 0, 1)
wear_rate = 1.0 + 1.5*stress  # higher stress -> faster consumption
blade_rul = np.maximum(1, (base_cycles * (1 - p)) / wear_rate)

# ---- Motor signals (coupled to blade) ----
# Motor speed near 1500 (50Hz, 2-pole ~ 3000 synchronous; assuming gearbox; keep 1500 base with small slip)
motor_speed = 1500 - 0.02*(blade_torque-20) + rng.normal(0, 5, N)

# Motor vibration: base + coupling to blade vibration + bearing events
bearing_event = (np.sin(2*np.pi*sec/2000)+rng.normal(0,0.2,N) > 0.95)  # sparse
motor_vib = 0.45 + 0.35*(blade_vib-0.6) + 0.5*bearing_event.astype(float) + rng.normal(0, 0.05, N)
motor_vib = clamp(motor_vib, 0.2, 4.0)

# 3-phase currents: proportional to torque + small unbalance + electrical fault events
elec_fault_event = (np.sin(2*np.pi*sec/2500+1.0)+rng.normal(0,0.25,N) > 1.1)  # sparse
I_base = 10 + 0.25*(blade_torque-20)  # load coupling
unbal = rng.normal(0, 0.5, (N,3))
I_A = I_base + unbal[:,0] + 2.0*elec_fault_event.astype(float)
I_B = I_base + unbal[:,1] - 2.0*elec_fault_event.astype(float)
I_C = I_base + unbal[:,2] + rng.normal(0, 0.2, N)
I_A = clamp(I_A, 5, 40); I_B = clamp(I_B, 5, 40); I_C = clamp(I_C, 5, 40)

# Motor temperature: base + load + ambient + overheating events (caused by sustained high torque & vib)
overheat_index = (blade_torque > 30).astype(float) + (motor_vib > 1.2).astype(float)
overheat = (overheat_index > 1).astype(float)
motor_temp = 44 + 0.35*(I_base-10) + 2.0*overheat + rng.normal(0, 0.8, N)
motor_temp = clamp(motor_temp, 30, 110)

# Health state derivation from signals (rules)
health = np.full(N, "Normal", dtype=object)
health[(motor_temp > 60) & (I_base > 12)] = "Overheating"
health[(elec_fault_event)] = "Electrical Fault"
health[(motor_vib > 1.1) & (overheat == 0)] = "Bearing Fault"
health[(blade_torque > 32) & (motor_vib > 1.2)] = "Load Imbalance"

# Motor RUL from health indicators
health_penalty = np.where(health=="Normal", 0.2,
                   np.where(health=="Bearing Fault", 0.8,
                   np.where(health=="Electrical Fault", 1.2,
                   np.where(health=="Overheating", 1.5, 1.8))))
motor_rul = clamp(500*(1-p)/(1+health_penalty + 0.5*clamp((motor_vib-0.5),0,2) + 0.3*clamp((motor_temp-45)/30,0,2)), 1, 500)

# ---- Build DataFrames ----
motor_df = pd.DataFrame({
    "Timestamp": t,
    "PhaseA_Current": I_A.round(3),
    "PhaseB_Current": I_B.round(3),
    "PhaseC_Current": I_C.round(3),
    "Vibration": motor_vib.round(3),
    "Temp": motor_temp.round(3),
    "Speed": motor_speed.round(1),
    "Health_Status": health,
    "RUL": motor_rul.round(1)
})

blade_df = pd.DataFrame({
    "Timestamp": t,
    "Blade_Type": blade_type_series,
    "Vibration": blade_vib.round(3),
    "Torque": blade_torque.round(3),
    "Speed": blade_speed.round(1),
    "Noise": blade_noise.round(2),
    "Temp": blade_temp.round(2),
    "Condition": blade_state,
    "RUL": blade_rul.round(1)
})

combined_df = pd.DataFrame({
    "Timestamp": t,
    "Motor_Current": (0.333*(I_A+I_B+I_C)).round(3),
    "Motor_Vibration": motor_vib.round(3),
    "Motor_Temp": motor_temp.round(3),
    "Blade_Type": blade_type_series,
    "Blade_Vibration": blade_vib.round(3),
    "Blade_Torque": blade_torque.round(3),
    "Blade_Speed": blade_speed.round(1),
    "Health_Status": health,
    "Condition": blade_state,
    "RUL_Motor": motor_rul.round(1),
    "RUL_Blade": blade_rul.round(1)
})

# ---- Save ----
motor_path = "/mnt/data/motor_dataset_realistic.csv"
blade_path = "/mnt/data/blade_dataset_realistic.csv"
combined_path = "/mnt/data/combined_dataset_realistic.csv"

motor_df.to_csv(motor_path, index=False)
blade_df.to_csv(blade_path, index=False)
combined_df.to_csv(combined_path, index=False)

motor_path, blade_path, combined_path
