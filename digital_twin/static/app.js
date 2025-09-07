// Global variables
let currentMachineId = null;
let scene, camera, renderer, machineModel;
let currentModelType = null;

// Make functions globally available
window.addMachine = async function() {
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
            const modal = bootstrap.Modal.getInstance(document.getElementById('addMachineModal'));
            if (modal) modal.hide();
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
};

window.showMachineDetails = async function(machineId) {
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
        
        // Load the appropriate 3D model
        await loadModelForMachine(machineId);
        
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
                            <label class="form-label">Speed (RPM</label>
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
};

window.predictHealth = async function() {
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
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadMachines();
    initThreeJS();
});

// Initialize Three.js with GLTF loader
function initThreeJS() {
    const container = document.getElementById('threejsContainer');
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 8;
    camera.position.y = 3;
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    // Add a grid helper for reference
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);
    
    // Add axes helper
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    
    animate();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    const container = document.getElementById('threejsContainer');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Load 3D model based on machine type
async function loadModelForMachine(machineId) {
    try {
        // Get machine type from API
        const response = await fetch(`/machines/${machineId}/type`);
        const machineInfo = await response.json();
        
        currentModelType = machineInfo.type;
        
        // Load appropriate 3D model
        if (machineInfo.type === 'motor') {
            loadGLTFModel('models/motor.glb');
        } else {
            loadGLTFModel('models/blade.glb');
        }
        
    } catch (error) {
        console.error('Error loading machine type:', error);
        // Fallback to programmatic model
        createProgrammaticModel(currentModelType || 'motor');
    }
}

// Load GLTF/GLB model
function loadGLTFModel(modelPath) {
    // Check if GLTFLoader is available
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.error('GLTFLoader not available. Using programmatic model.');
        createProgrammaticModel(currentModelType);
        return;
    }
    
    const loader = new THREE.GLTFLoader();
    
    // Clear existing model
    if (machineModel) {
        scene.remove(machineModel);
    }
    
    loader.load(modelPath, function(gltf) {
        machineModel = gltf.scene;
        
        // Center and scale model
        const box = new THREE.Box3().setFromObject(machineModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        machineModel.position.x = -center.x;
        machineModel.position.y = -center.y;
        machineModel.position.z = -center.z;
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 5.0 / maxDim;
        machineModel.scale.multiplyScalar(scale);
        
        scene.add(machineModel);
        
    }, undefined, function(error) {
        console.error('Error loading 3D model:', error);
        // Fallback to programmatic model
        createProgrammaticModel(currentModelType);
    });
}

// Create programmatic model as fallback
function createProgrammaticModel(modelType) {
    // Clear existing model
    if (machineModel) {
        scene.remove(machineModel);
    }
    
    const group = new THREE.Group();
    
    if (modelType === 'motor') {
        // Motor body (cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(1.5, 1.5, 3, 32);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = Math.PI / 2;
        group.add(body);
        
        // Motor shaft
        const shaftGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 16);
        const shaftMaterial = new THREE.MeshPhongMaterial({ color: 0xCCCCCC });
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.rotation.x = Math.PI / 2;
        shaft.position.z = 2.5;
        group.add(shaft);
        
    } else {
        // Blade hub
        const hubGeometry = new THREE.CylinderGeometry(1, 1, 0.5, 32);
        const hubMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const hub = new THREE.Mesh(hubGeometry, hubMaterial);
        hub.rotation.x = Math.PI / 2;
        group.add(hub);
        
        // Blades
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const bladeGeometry = new THREE.BoxGeometry(0.2, 3, 0.5);
            const bladeMaterial = new THREE.MeshPhongMaterial({ color: 0xAAAAAA });
            const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
            
            blade.position.x = Math.cos(angle) * 1.5;
            blade.position.y = Math.sin(angle) * 1.5;
            blade.rotation.z = angle;
            group.add(blade);
        }
    }
    
    machineModel = group;
    scene.add(machineModel);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (machineModel) {
        // Rotate the model based on type
        if (currentModelType === 'motor') {
            machineModel.rotation.y += 0.01;
            // Rotate the shaft faster if it exists
            if (machineModel.children && machineModel.children.length > 1) {
                machineModel.children[1].rotation.z += 0.03;
            }
        } else if (currentModelType === 'blade') {
            machineModel.rotation.y += 0.02;
        }
    }
    
    renderer.render(scene, camera);
}

// Update machine color based on health status
function updateMachineColor(colorHex, healthStatus) {
    if (!machineModel) return;
    
    const color = new THREE.Color(colorHex);
    
    // Change color of all meshes in the model
    machineModel.traverse((child) => {
        if (child.isMesh) {
            child.material.color = color;
            
            // Add glowing effect for critical status
            if (healthStatus === 'Critical') {
                child.material.emissive = color;
                child.material.emissiveIntensity = 0.3;
            } else {
                child.material.emissive = new THREE.Color(0x000000);
                child.material.emissiveIntensity = 0;
            }
        }
    });
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

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadMachines();
    initThreeJS();
});