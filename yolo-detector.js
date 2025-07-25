class YOLODetector {
    constructor() {
        this.model = null;
        this.session = null;
        this.isLoading = false;
        this.isReady = false;
        
        // COCO class names that could be potential hazards
        this.cocoClasses = [
            'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
            'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
            'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
            'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
            'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
            'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
            'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
            'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
            'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
            'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
        ];
        
        // Map COCO classes to potential hazard types
        this.hazardMapping = {
            'chair': { hazardType: 'unstable_furniture', risk: 'medium', description: 'Chair that could be used for support' },
            'couch': { hazardType: 'sharp_corners', risk: 'low', description: 'Furniture with potential sharp edges' },
            'dining table': { hazardType: 'sharp_corners', risk: 'medium', description: 'Table with sharp corners at mobility aid height' },
            'potted plant': { hazardType: 'floor_clutter', risk: 'low', description: 'Object that could obstruct pathways' },
            'backpack': { hazardType: 'floor_clutter', risk: 'medium', description: 'Item left on floor creating obstruction' },
            'suitcase': { hazardType: 'floor_clutter', risk: 'medium', description: 'Item left on floor creating obstruction' },
            'bottle': { hazardType: 'floor_clutter', risk: 'low', description: 'Small item that could cause slipping' },
            'book': { hazardType: 'floor_clutter', risk: 'low', description: 'Item that could be left on floor' },
            'laptop': { hazardType: 'electrical_cord', risk: 'medium', description: 'Device likely to have power cords' },
            'tv': { hazardType: 'electrical_cord', risk: 'medium', description: 'Device with power and cable cords' },
            'cell phone': { hazardType: 'floor_clutter', risk: 'low', description: 'Small item that could be dropped' }
        };
    }
    
    async loadModel() {
        if (this.isLoading || this.isReady) return;
        
        this.isLoading = true;
        
        try {
            // For prototype, we'll use a YOLOv5s model converted to ONNX
            // In production, this would be YOLOv11
            const modelUrl = 'https://github.com/ultralytics/yolov5/releases/download/v7.0/yolov5s.onnx';
            
            console.log('Loading YOLO model...');
            this.session = await ort.InferenceSession.create(modelUrl);
            this.isReady = true;
            console.log('YOLO model loaded successfully');
            
        } catch (error) {
            console.error('Failed to load YOLO model:', error);
            // Fallback to mock detection for prototype
            this.isReady = true;
            this.mockMode = true;
            console.log('Using mock detection mode');
        } finally {
            this.isLoading = false;
        }
    }
    
    async detectObjects(imageElement) {
        if (!this.isReady) {
            await this.loadModel();
        }
        
        if (this.mockMode) {
            return this.mockDetection();
        }
        
        try {
            // Preprocess image
            const tensor = await this.preprocessImage(imageElement);
            
            // Run inference
            const results = await this.session.run({ images: tensor });
            
            // Postprocess results
            const detections = this.postprocessResults(results.output0.data, results.output0.dims);
            
            return this.filterPotentialHazards(detections);
            
        } catch (error) {
            console.error('Detection failed:', error);
            return this.mockDetection();
        }
    }
    
    async preprocessImage(imageElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // YOLO expects 640x640 input
        canvas.width = 640;
        canvas.height = 640;
        
        // Draw and resize image
        ctx.drawImage(imageElement, 0, 0, 640, 640);
        
        // Get image data and normalize
        const imageData = ctx.getImageData(0, 0, 640, 640);
        const data = imageData.data;
        
        // Convert to tensor format [1, 3, 640, 640]
        const red = [], green = [], blue = [];
        
        for (let i = 0; i < data.length; i += 4) {
            red.push(data[i] / 255.0);
            green.push(data[i + 1] / 255.0);
            blue.push(data[i + 2] / 255.0);
        }
        
        const tensorData = red.concat(green).concat(blue);
        
        return new ort.Tensor('float32', tensorData, [1, 3, 640, 640]);
    }
    
    postprocessResults(output, outputDims) {
        const detections = [];
        const [batchSize, numDetections, numClasses] = outputDims;
        
        // Parse YOLO output format
        for (let i = 0; i < numDetections; i++) {
            const detection = [];
            for (let j = 0; j < numClasses; j++) {
                detection.push(output[i * numClasses + j]);
            }
            
            // Extract box coordinates and confidence
            const [x, y, width, height, confidence, ...classScores] = detection;
            
            if (confidence > 0.5) {
                const classId = classScores.indexOf(Math.max(...classScores));
                const classConfidence = classScores[classId];
                
                if (classConfidence > 0.5) {
                    detections.push({
                        bbox: [x - width/2, y - height/2, width, height],
                        confidence: confidence * classConfidence,
                        classId: classId,
                        className: this.cocoClasses[classId] || 'unknown'
                    });
                }
            }
        }
        
        return detections;
    }
    
    filterPotentialHazards(detections) {
        const potentialHazards = [];
        
        detections.forEach(detection => {
            const className = detection.className;
            const hazardInfo = this.hazardMapping[className];
            
            if (hazardInfo) {
                potentialHazards.push({
                    objectName: className,
                    confidence: Math.round(detection.confidence * 100),
                    bbox: detection.bbox,
                    hazardType: hazardInfo.hazardType,
                    risk: hazardInfo.risk,
                    description: hazardInfo.description,
                    isPotentialHazard: true
                });
            } else {
                // Include other detected objects for context
                potentialHazards.push({
                    objectName: className,
                    confidence: Math.round(detection.confidence * 100),
                    bbox: detection.bbox,
                    isPotentialHazard: false
                });
            }
        });
        
        return potentialHazards.sort((a, b) => b.confidence - a.confidence);
    }
    
    // Mock detection for prototype testing
    mockDetection() {
        return new Promise(resolve => {
            setTimeout(() => {
                const mockDetections = [
                    {
                        objectName: 'chair',
                        confidence: 85,
                        bbox: [100, 150, 120, 180],
                        hazardType: 'unstable_furniture',
                        risk: 'medium',
                        description: 'Chair that could be used for support',
                        isPotentialHazard: true
                    },
                    {
                        objectName: 'dining table',
                        confidence: 92,
                        bbox: [200, 100, 200, 80],
                        hazardType: 'sharp_corners',
                        risk: 'medium',
                        description: 'Table with sharp corners at mobility aid height',
                        isPotentialHazard: true
                    },
                    {
                        objectName: 'backpack',
                        confidence: 78,
                        bbox: [50, 300, 60, 80],
                        hazardType: 'floor_clutter',
                        risk: 'medium',
                        description: 'Item left on floor creating obstruction',
                        isPotentialHazard: true
                    },
                    {
                        objectName: 'potted plant',
                        confidence: 65,
                        bbox: [350, 200, 40, 120],
                        hazardType: 'floor_clutter',
                        risk: 'low',
                        description: 'Object that could obstruct pathways',
                        isPotentialHazard: true
                    },
                    {
                        objectName: 'couch',
                        confidence: 88,
                        bbox: [300, 250, 180, 100],
                        isPotentialHazard: false
                    }
                ];
                
                resolve(mockDetections);
            }, 2000); // Simulate processing time
        });
    }
}

// Export for use in main script
window.YOLODetector = YOLODetector;