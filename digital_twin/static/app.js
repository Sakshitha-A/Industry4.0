// Global variables
let currentMachineId = null;
let scene, camera, renderer, machineModel;

// Initialize Three.js
function initThreeJS() {
    const container = document.getElementById('threejsContainer');
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Load a placeholder model (you would replace this with your actual 3D models)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    machineModel = new THREE.Mesh(geometry, material);
    scene.add(machineModel);
    
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    
    if (machineModel) {
        machineModel.rotation.x += 0.01;
        machineModel.rotation.y += 0.01;
    }
    
    renderer.render(scene, camera);
}

// Update machine color based on health status
function updateMachineColor(colorHex, healthStatus) {
    if (!machineModel) return;
    
    const color = new THREE.Color(colorHex);
    machineModel.material.color = color;
    
    // Add emissive effect for critical status
    if (healthStatus === 'Critical') {
        machineModel.material.emissive = new THREE.Color(colorHex);
        machineModel.material.emissiveIntensity = 0.3;
    } else {
        machineModel.material.emissive = new THREE.Color(0x000000);
        machineModel.material.emissiveIntensity = 0;
    }
}

// Load machines from API
async function loadMachines() {
    try {
        const response = await fetch('/machines/');
        const machines = await response.json();
        
        const machinesList = document.getElementById('machinesList');
        machinesList.innerHTML = '';
        
        machines.forEach(machine => {
            const statusClass = `status-${machine.current_status?.toLowerCase() || 'unknown'}`;
            const statusColor = getStatusColor(machine.current_status);
            
            machinesList.innerHTML += `
                <div class="col-md-4 mb-4">
                    <div class="card machine-card ${statusClass}">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <h5 class="card-title">${machine.name}</h5>
                                <span class="badge bg-${statusColor}">${machine.current_status || 'Unknown'}</span>
                            </div>
                            <h6 class="card-subtitle mb-2 text-muted">${machine.machine_id}</h6>
                            <p class="card-text">
                                <strong>Type:</strong> ${machine.type}<br>
                                <strong>Location:</strong> ${machine.location || 'N/A'}<br>
                                <strong>RUL:</strong> ${machine.current_rul ? machine.current_rul.toFixed(1) + ' hours' : 'N/A'}
                            </p>
                            <button class="btn btn-outline-primary btn-sm" onclick="showMachineDetails('${machine.machine_id}')">
                                View Details
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading machines:', error);
    }
}

function getStatusColor(status) {
    switch (status) {
        case 'Healthy': return 'success';
        case 'Warning': return 'warning';
        case 'Critical': return 'danger';
        default: return 'secondary';
    }
}

// Show machine type-specific details in the form
document.getElementById('machineType').addEventListener('change', function() {
    const type = this.value;
    document.getElementById('motorDetails').style.display = type === 'motor' ? 'block' : 'none';
    document.getElementById('bladeDetails').style.display = type === 'blade' ? 'block' : 'none';
});

// Add a new machine
async function addMachine() {
    const type = document.getElementById('machineType').value;
    
    const machineData = {
        machine_id: document.getElementById('machineId').value,
        name: document.getElementById('machineName').value,
        type: type,
        manufacturer: document.getElementById('machineManufacturer').value,
        model: document.getElementById('machineModel').value,
        location: document.getElementById('machineLocation').value
    };
    
    if (type === 'motor') {
        machineData.motor_details = {
            max_current_phase_a: parseFloat(document.getElementById('maxCurrentA').value),
            max_current_phase_b: parseFloat(document.getElementById('maxCurrentB').value),
            max_current_phase_c: parseFloat(document.getElementById('maxCurrentC').value),
            max_power_consumption: parseFloat(document.getElementById('maxPower').value),
            max_temperature: parseFloat(document.getElementById('maxTemp').value),
            max_vibration: parseFloat(document.getElementById('maxVibration').value),
            nominal_speed: parseFloat(document.getElementById('nominalSpeed').value)
        };
    } else if (type === 'blade') {
        machineData.blade_details = {
            max_vibration: parseFloat(document.getElementById('bladeMaxVibration').value),
            max_torque: parseFloat(document.getElementById('maxTorque').value),
            max_speed: parseFloat(document.getElementById('bladeMaxSpeed').value),
            max_noise: parseFloat(document.getElementById('maxNoise').value),
            max_temperature: parseFloat(document.getElementById('bladeMaxTemp').value),
            material: document.getElementById('material').value,
            length: parseFloat(document.getElementById('length').value),
            width: parseFloat(document.getElementById('width').value)
        };
    }
    
    try {
        const response = await fetch('/machines/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(machineData)
        });
        
        if (response.ok) {
            // Close modal and reset form
            bootstrap.Modal.getInstance(document.getElementById('addMachineModal')).hide();
            document.getElementById('machineForm').reset();
            
            // Reload machines list
            loadMachines();
            
            alert('Machine added successfully!');
        } else {
            const error = await response.json();
            alert(`Error: ${error.detail}`);
        }
    } catch (error) {
        console.error('Error adding machine:', error);
        alert('Error adding machine. Please check console for details.');
    }
}

// Show machine details
async function showMachineDetails(machineId) {
    currentMachineId = machineId;
    
    try {
        const response = await fetch(`/machines/${machineId}`);
        const machine = await response.json();
        
        // Update modal title
        document.getElementById('detailModalTitle').textContent = machine.name;
        
        // Update machine information
        document.getElementById('detailId').textContent = machine.machine_id;
        document.getElementById('detailName').textContent = machine.name;
        document.getElementById('detailType').textContent = machine.type;
        document.getElementById('detailManufacturer').textContent = machine.manufacturer || 'N/A';
        document.getElementById('detailModel').textContent = machine.model || 'N/A';
        document.getElementById('detailLocation').textContent = machine.location || 'N/A';
        document.getElementById('detailInstallDate').textContent = machine.installation_date;
        document.getElementById('detailStatus').textContent = machine.status;
        
        // Update health status
        const latestPrediction = machine.latest_prediction;
        if (latestPrediction) {
            document.getElementById('healthStatus').textContent = latestPrediction.health_status;
            document.getElementById('rul').textContent = `RUL: ${latestPrediction.rul_hours.toFixed(1)} hours`;
            
            const healthColor = document.getElementById('healthColor');
            healthColor.style.backgroundColor = getColorFromStatus(latestPrediction.health_status);
            
            // Update 3D model color
            updateMachineColor(getColorFromStatus(latestPrediction.health_status), latestPrediction.health_status);
        }
        
        // Load sensor inputs based on machine type
        const sensorInputs = document.getElementById('sensorInputs');
        sensorInputs.innerHTML = '';
        
        if (machine.type === 'motor') {
            sensorInputs.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="sensor-input">
                            <label class="form-label">Current Phase A (A)</label>
                            <input type="number" class="form-control" id="currentA" step="0.1">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="sensor-input">
                            <label class="form-label">Current Phase B (A)</label>
                            <input type="number" class="form-control" id="currentB" step="0.1">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="sensor-input">
                            <label class="form-label">Current Phase C (A)</label>
                            <input type="number" class="form-control" id="currentC" step="0.1">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="sensor-input">
                            <label class="form-label">Power Consumption (W)</label>
                            <input type="number" class="form-control" id="power" step="1">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="sensor-input">
                            <label class="form-label">Power Factor</label>
                            <input type="number" class="form-control" id="powerFactor" step="0.01" min="0" max="1">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="sensor-input">
                            <label class="form-label">Vibration (mm/s)</label>
                            <input type="number" class="form-control" id="vibration" step="0.01">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="sensor-input">
                            <label class="form-label">Temperature (°C)</label>
                            <input type="number" class="form-control" id="temperature" step="0.1">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="sensor-input">
                            <label class="form-label">Speed (RPM)</label>
                            <input type="number" class="form-control" id="speed" step="1">
                        </div>
                    </div>
                </div>
            `;
        } else {
            sensorInputs.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="sensor-input">
                            <label class="form-label">Vibration (mm/s)</label>
                            <input type="number" class="form-control" id="vibration" step="0.01">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="sensor-input">
                            <label class="form-label">Torque (Nm)</label>
                            <input type="number" class="form-control" id="torque" step="0.1">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="sensor-input">
                            <label class="form-label">Speed (RPM)</label>
                            <input type="number" class="form-control" id="speed" step="1">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="sensor-input">
                            <label class="form-label">Noise (dB)</label>
                            <input type="number" class="form-control" id="noise" step="0.1">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="sensor-input">
                            <label class="form-label">Temperature (°C)</label>
                            <input type="number" class="form-control" id="temperature" step="0.1">
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Load prediction history
        await loadPredictionHistory(machineId);
        
        // Show modal
        const detailModal = new bootstrap.Modal(document.getElementById('machineDetailModal'));
        detailModal.show();
        
    } catch (error) {
        console.error('Error loading machine details:', error);
        alert('Error loading machine details. Please check console for details.');
    }
}

// Load prediction history
async function loadPredictionHistory(machineId) {
    try {
        const response = await fetch(`/machines/${machineId}/history?limit=10`);
        const history = await response.json();
        
        const historyTable = document.getElementById('predictionHistory');
        historyTable.innerHTML = '';
        
        history.forEach(prediction => {
            const date = new Date(prediction.timestamp).toLocaleString();
            const maintenanceBadge = prediction.maintenance_required ? 
                '<span class="badge bg-danger">Yes</span>' : 
                '<span class="badge bg-success">No</span>';
            
            historyTable.innerHTML += `
                <tr>
                    <td>${date}</td>
                    <td><span class="badge bg-${getStatusColor(prediction.health_status)}">${prediction.health_status}</span></td>
                    <td>${prediction.rul_hours.toFixed(1)}</td>
                    <td>${(prediction.confidence * 100).toFixed(1)}%</td>
                    <td>${maintenanceBadge}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading prediction history:', error);
    }
}

// Get color from status
function getColorFromStatus(status) {
    switch (status) {
        case 'Healthy': return '#28a745';
        case 'Warning': return '#ffc107';
        case 'Critical': return '#dc3545';
        default: return '#6c757d';
    }
}

// Predict health based on sensor input
async function predictHealth() {
    if (!currentMachineId) return;
    
    // Get sensor values
    const sensorData = {
        machine_id: currentMachineId
    };
    
    // Get machine type to determine which sensors to read
    const machineType = document.getElementById('detailType').textContent.toLowerCase();
    
    if (machineType === 'motor') {
        sensorData.current_phase_a = parseFloat(document.getElementById('currentA').value) || 0;
        sensorData.current_phase_b = parseFloat(document.getElementById('currentB').value) || 0;
        sensorData.current_phase_c = parseFloat(document.getElementById('currentC').value) || 0;
        sensorData.power_consumption = parseFloat(document.getElementById('power').value) || 0;
        sensorData.power_factor = parseFloat(document.getElementById('powerFactor').value) || 0;
        sensorData.vibration = parseFloat(document.getElementById('vibration').value) || 0;
        sensorData.temperature = parseFloat(document.getElementById('temperature').value) || 0;
        sensorData.speed = parseFloat(document.getElementById('speed').value) || 0;
    } else {
        sensorData.vibration = parseFloat(document.getElementById('vibration').value) || 0;
        sensorData.torque = parseFloat(document.getElementById('torque').value) || 0;
        sensorData.speed = parseFloat(document.getElementById('speed').value) || 0;
        sensorData.noise = parseFloat(document.getElementById('noise').value) || 0;
        sensorData.temperature = parseFloat(document.getElementById('temperature').value) || 0;
    }
    
    try {
        const response = await fetch('/predict/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sensorData)
        });
        
        if (response.ok) {
            const prediction = await response.json();
            
            // Update health status display
            document.getElementById('healthStatus').textContent = prediction.health_status;
            document.getElementById('rul').textContent = `RUL: ${prediction.rul_hours.toFixed(1)} hours`;
            
            const healthColor = document.getElementById('healthColor');
            healthColor.style.backgroundColor = prediction.color_code;
            
            // Update 3D model color
            updateMachineColor(prediction.color_code, prediction.health_status);
            
            // Show maintenance alert if needed
            if (prediction.maintenance_required) {
                alert(`🚨 MAINTENANCE REQUIRED!\nStatus: ${prediction.health_status}\nRUL: ${prediction.rul_hours.toFixed(1)} hours\nPlease schedule maintenance immediately.`);
            }
            
            // Reload prediction history
            await loadPredictionHistory(currentMachineId);
            
        } else {
            const error = await response.json();
            alert(`Error: ${error.detail}`);
        }
    } catch (error) {
        console.error('Error predicting health:', error);
        alert('Error predicting health. Please check console for details.');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadMachines();
    initThreeJS();
});

