class HazardScanner {
    constructor() {
        this.currentPhoto = null;
        this.currentHazards = [];
        this.scanHistory = this.loadScanHistory();
        
        this.initializeElements();
        this.bindEvents();
        this.initializeHazardTypes();
    }

    initializeElements() {
        // Camera elements
        this.camera = document.getElementById('camera');
        this.canvas = document.getElementById('snapshot');
        this.startCameraBtn = document.getElementById('start-camera');
        this.takePhotoBtn = document.getElementById('take-photo');
        
        // Photo elements
        this.capturedPhoto = document.getElementById('captured-photo');
        this.retakePhotoBtn = document.getElementById('retake-photo');
        this.analyzePhotoBtn = document.getElementById('analyze-photo');
        
        // Hazard elements
        this.hazardList = document.getElementById('hazard-list');
        this.addCustomHazardBtn = document.getElementById('add-custom-hazard');
        this.finishScanBtn = document.getElementById('finish-scan');
        
        // Results elements
        this.resultsSummary = document.getElementById('results-summary');
        this.hazardDetails = document.getElementById('hazard-details');
        this.startNewScanBtn = document.getElementById('start-new-scan');
        this.viewHistoryBtn = document.getElementById('view-history');
        
        // History elements
        this.scanHistoryEl = document.getElementById('scan-history');
        this.backToHomeBtn = document.getElementById('back-to-home');
        
        // Sections
        this.sections = {
            camera: document.getElementById('camera-section'),
            photo: document.getElementById('photo-section'),
            hazard: document.getElementById('hazard-section'),
            results: document.getElementById('results-section'),
            history: document.getElementById('history-section')
        };
    }

    bindEvents() {
        this.startCameraBtn.addEventListener('click', () => this.startCamera());
        this.takePhotoBtn.addEventListener('click', () => this.takePhoto());
        this.retakePhotoBtn.addEventListener('click', () => this.retakePhoto());
        this.analyzePhotoBtn.addEventListener('click', () => this.analyzePhoto());
        this.addCustomHazardBtn.addEventListener('click', () => this.addCustomHazard());
        this.finishScanBtn.addEventListener('click', () => this.finishScan());
        this.startNewScanBtn.addEventListener('click', () => this.startNewScan());
        this.viewHistoryBtn.addEventListener('click', () => this.viewHistory());
        this.backToHomeBtn.addEventListener('click', () => this.backToHome());
    }

    initializeHazardTypes() {
        this.hazardTypes = [
            {
                id: 'loose-rugs',
                name: 'Loose Rugs',
                description: 'Rugs without non-slip backing that could cause slipping'
            },
            {
                id: 'clutter',
                name: 'Floor Clutter',
                description: 'Objects on the floor that block pathways'
            },
            {
                id: 'poor-lighting',
                name: 'Poor Lighting',
                description: 'Areas with insufficient lighting or harsh shadows'
            },
            {
                id: 'narrow-pathways',
                name: 'Narrow Pathways',
                description: 'Passages too narrow for mobility aids'
            },
            {
                id: 'sharp-corners',
                name: 'Sharp Furniture Corners',
                description: 'Furniture with sharp edges at mobility aid height'
            },
            {
                id: 'high-thresholds',
                name: 'High Door Thresholds',
                description: 'Raised thresholds that could catch wheels or cause tripping'
            },
            {
                id: 'unstable-furniture',
                name: 'Unstable Furniture',
                description: 'Furniture that could tip or move when used for support'
            },
            {
                id: 'electrical-cords',
                name: 'Electrical Cords',
                description: 'Power cords crossing pathways'
            }
        ];
    }

    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            this.camera.srcObject = stream;
            this.startCameraBtn.style.display = 'none';
            this.takePhotoBtn.style.display = 'inline-block';
            
            // Announce to screen readers
            this.announceToScreenReader('Camera started. Point your device at the room and tap "Take Photo" when ready.');
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Unable to access camera. Please ensure you have granted camera permissions.');
        }
    }

    takePhoto() {
        const context = this.canvas.getContext('2d');
        this.canvas.width = this.camera.videoWidth;
        this.canvas.height = this.camera.videoHeight;
        
        context.drawImage(this.camera, 0, 0);
        this.currentPhoto = this.canvas.toDataURL('image/jpeg', 0.8);
        
        // Stop camera stream
        const stream = this.camera.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        this.showPhoto();
    }

    showPhoto() {
        this.capturedPhoto.src = this.currentPhoto;
        this.showSection('photo');
        this.announceToScreenReader('Photo captured. Review the image and tap "Analyze Photo" to continue or "Retake Photo" to try again.');
    }

    retakePhoto() {
        this.showSection('camera');
        this.startCameraBtn.style.display = 'inline-block';
        this.takePhotoBtn.style.display = 'none';
        this.currentPhoto = null;
    }

    analyzePhoto() {
        this.renderHazardList();
        this.showSection('hazard');
        this.announceToScreenReader('Now identify any hazards you see in your photo. Select hazards and choose their severity level.');
    }

    renderHazardList() {
        this.hazardList.innerHTML = '';
        
        this.hazardTypes.forEach(hazard => {
            const hazardItem = document.createElement('div');
            hazardItem.className = 'hazard-item';
            hazardItem.innerHTML = `
                <div class="hazard-info">
                    <div class="hazard-name">${hazard.name}</div>
                    <div class="hazard-description">${hazard.description}</div>
                </div>
                <div class="severity-buttons">
                    <button class="severity-btn severity-low" data-hazard="${hazard.id}" data-severity="low" aria-label="Mark ${hazard.name} as low severity">
                        Low
                    </button>
                    <button class="severity-btn severity-medium" data-hazard="${hazard.id}" data-severity="medium" aria-label="Mark ${hazard.name} as medium severity">
                        Medium
                    </button>
                    <button class="severity-btn severity-high" data-hazard="${hazard.id}" data-severity="high" aria-label="Mark ${hazard.name} as high severity">
                        High
                    </button>
                </div>
            `;
            
            this.hazardList.appendChild(hazardItem);
        });
        
        // Bind severity button events
        this.hazardList.addEventListener('click', (e) => {
            if (e.target.classList.contains('severity-btn')) {
                this.selectHazardSeverity(e.target);
            }
        });
    }

    selectHazardSeverity(button) {
        const hazardId = button.dataset.hazard;
        const severity = button.dataset.severity;
        const hazardItem = button.closest('.hazard-item');
        
        // Remove existing selection for this hazard
        const existingIndex = this.currentHazards.findIndex(h => h.id === hazardId);
        if (existingIndex > -1) {
            this.currentHazards.splice(existingIndex, 1);
        }
        
        // Clear active states for this hazard's buttons
        hazardItem.querySelectorAll('.severity-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // If clicking the same button, deselect it
        if (button.classList.contains('active')) {
            hazardItem.classList.remove('selected');
            return;
        }
        
        // Add new selection
        button.classList.add('active');
        hazardItem.classList.add('selected');
        
        const hazardType = this.hazardTypes.find(h => h.id === hazardId);
        this.currentHazards.push({
            id: hazardId,
            name: hazardType.name,
            description: hazardType.description,
            severity: severity,
            timestamp: new Date().toISOString()
        });
        
        this.announceToScreenReader(`${hazardType.name} marked as ${severity} severity`);
    }

    addCustomHazard() {
        const hazardName = prompt('Enter a custom hazard name:');
        if (!hazardName || hazardName.trim() === '') return;
        
        const hazardDescription = prompt('Enter a description (optional):') || '';
        
        const customHazard = {
            id: 'custom-' + Date.now(),
            name: hazardName.trim(),
            description: hazardDescription.trim()
        };
        
        this.hazardTypes.push(customHazard);
        this.renderHazardList();
        
        this.announceToScreenReader(`Custom hazard "${hazardName}" added to the list`);
    }

    finishScan() {
        if (this.currentHazards.length === 0) {
            if (confirm('No hazards were identified. Are you sure you want to finish this scan?')) {
                this.showResults();
            }
        } else {
            this.showResults();
        }
    }

    showResults() {
        this.renderResults();
        this.saveScanToHistory();
        this.showSection('results');
        
        const hazardCount = this.currentHazards.length;
        this.announceToScreenReader(`Scan complete. Found ${hazardCount} hazard${hazardCount !== 1 ? 's' : ''}.`);
    }

    renderResults() {
        // Summary cards
        const counts = { low: 0, medium: 0, high: 0 };
        this.currentHazards.forEach(hazard => {
            counts[hazard.severity]++;
        });
        
        this.resultsSummary.innerHTML = `
            <div class="summary-card low">
                <span class="summary-count">${counts.low}</span>
                <span class="summary-label">Low Risk</span>
            </div>
            <div class="summary-card medium">
                <span class="summary-count">${counts.medium}</span>
                <span class="summary-label">Medium Risk</span>
            </div>
            <div class="summary-card high">
                <span class="summary-count">${counts.high}</span>
                <span class="summary-label">High Risk</span>
            </div>
        `;
        
        // Detailed hazard list
        if (this.currentHazards.length === 0) {
            this.hazardDetails.innerHTML = '<p>No hazards identified in this scan. Great job maintaining a safe space!</p>';
        } else {
            const hazardsByLevel = {
                high: this.currentHazards.filter(h => h.severity === 'high'),
                medium: this.currentHazards.filter(h => h.severity === 'medium'),
                low: this.currentHazards.filter(h => h.severity === 'low')
            };
            
            let detailsHTML = '';
            
            ['high', 'medium', 'low'].forEach(level => {
                if (hazardsByLevel[level].length > 0) {
                    detailsHTML += `<h3>${level.charAt(0).toUpperCase() + level.slice(1)} Risk Hazards</h3>`;
                    hazardsByLevel[level].forEach(hazard => {
                        detailsHTML += `
                            <div class="hazard-item">
                                <div class="hazard-info">
                                    <div class="hazard-name">${hazard.name}</div>
                                    <div class="hazard-description">${hazard.description}</div>
                                </div>
                            </div>
                        `;
                    });
                }
            });
            
            this.hazardDetails.innerHTML = detailsHTML;
        }
    }

    saveScanToHistory() {
        const scan = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            photo: this.currentPhoto,
            hazards: [...this.currentHazards],
            summary: {
                total: this.currentHazards.length,
                high: this.currentHazards.filter(h => h.severity === 'high').length,
                medium: this.currentHazards.filter(h => h.severity === 'medium').length,
                low: this.currentHazards.filter(h => h.severity === 'low').length
            }
        };
        
        this.scanHistory.unshift(scan);
        
        // Keep only last 10 scans
        if (this.scanHistory.length > 10) {
            this.scanHistory = this.scanHistory.slice(0, 10);
        }
        
        this.saveScanHistory();
    }

    startNewScan() {
        this.currentPhoto = null;
        this.currentHazards = [];
        this.showSection('camera');
        this.startCameraBtn.style.display = 'inline-block';
        this.takePhotoBtn.style.display = 'none';
    }

    viewHistory() {
        this.renderHistory();
        this.showSection('history');
    }

    renderHistory() {
        if (this.scanHistory.length === 0) {
            this.scanHistoryEl.innerHTML = '<p>No previous scans found. Complete your first scan to see history here.</p>';
            return;
        }
        
        this.scanHistoryEl.innerHTML = '';
        
        this.scanHistory.forEach(scan => {
            const date = new Date(scan.timestamp).toLocaleString();
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-date">${date}</div>
                <div class="history-summary">
                    Found ${scan.summary.total} hazard${scan.summary.total !== 1 ? 's' : ''}: 
                    ${scan.summary.high} high, ${scan.summary.medium} medium, ${scan.summary.low} low risk
                </div>
            `;
            this.scanHistoryEl.appendChild(historyItem);
        });
    }

    backToHome() {
        this.showSection('camera');
        this.startCameraBtn.style.display = 'inline-block';
        this.takePhotoBtn.style.display = 'none';
    }

    showSection(sectionName) {
        Object.values(this.sections).forEach(section => {
            section.style.display = 'none';
        });
        this.sections[sectionName].style.display = 'block';
        
        // Scroll to top
        window.scrollTo(0, 0);
    }

    loadScanHistory() {
        try {
            const history = localStorage.getItem('hazard-scan-history');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Error loading scan history:', error);
            return [];
        }
    }

    saveScanHistory() {
        try {
            localStorage.setItem('hazard-scan-history', JSON.stringify(this.scanHistory));
        } catch (error) {
            console.error('Error saving scan history:', error);
        }
    }

    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HazardScanner();
});