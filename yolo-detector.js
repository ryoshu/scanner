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
            // const modelUrl = 'https://github.com/ultralytics/yolov5/releases/download/v7.0/yolov5s.onnx';
            const modelUrl = './models/yolov5s.onnx';
            
            console.log('Loading YOLO model...');
            this.session = await ort.InferenceSession.create(modelUrl);
            this.isReady = true;
            console.log('YOLO model loaded successfully');
            
        } catch (error) {
            console.error('Failed to load YOLO model:', error);
            throw new Error(`YOLO model loading failed: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }
    
    async detectObjects(imageElement) {
        if (!this.isReady) {
            await this.loadModel();
        }
        
        try {
            // Preprocess image for YOLO input
            const { tensor, imgWidth, imgHeight } = await this.preprocessImage(imageElement);
            
            // Run YOLO inference
            const results = await this.session.run({ images: tensor });
            
            // Get output tensor (YOLOv5 output format)
            const output = results.output0 || results[Object.keys(results)[0]];
            
            // Postprocess YOLO results
            const detections = this.postprocessYOLOResults(output.data, output.dims, imgWidth, imgHeight);
            
            // Apply Non-Maximum Suppression
            const filteredDetections = this.nonMaxSuppression(detections, 0.5, 0.4);
            
            // Map to potential hazards
            return this.filterPotentialHazards(filteredDetections);
            
        } catch (error) {
            console.error('Detection failed:', error);
            throw error;
        }
    }
    
    async preprocessImage(imageElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Store original dimensions for coordinate scaling
        const originalWidth = imageElement.naturalWidth || imageElement.width;
        const originalHeight = imageElement.naturalHeight || imageElement.height;
        
        // YOLO input size (640x640 for YOLOv5s)
        const inputSize = 640;
        canvas.width = inputSize;
        canvas.height = inputSize;
        
        // Calculate aspect ratio preserving resize
        const scale = Math.min(inputSize / originalWidth, inputSize / originalHeight);
        const scaledWidth = originalWidth * scale;
        const scaledHeight = originalHeight * scale;
        
        // Center the image (letterboxing)
        const xOffset = (inputSize - scaledWidth) / 2;
        const yOffset = (inputSize - scaledHeight) / 2;
        
        // Fill canvas with gray (114, 114, 114) - YOLO default pad color
        ctx.fillStyle = 'rgb(114, 114, 114)';
        ctx.fillRect(0, 0, inputSize, inputSize);
        
        // Draw scaled image centered
        ctx.drawImage(imageElement, xOffset, yOffset, scaledWidth, scaledHeight);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, inputSize, inputSize);
        const data = imageData.data;
        
        // Convert RGBA to RGB and normalize to [0,1]
        // YOLO expects CHW format: [1, 3, 640, 640]
        const tensorData = new Float32Array(3 * inputSize * inputSize);
        
        for (let i = 0; i < inputSize * inputSize; i++) {
            const pixelIndex = i * 4;
            // Normalize from [0,255] to [0,1]
            tensorData[i] = data[pixelIndex] / 255.0;                    // R channel
            tensorData[i + inputSize * inputSize] = data[pixelIndex + 1] / 255.0;     // G channel  
            tensorData[i + 2 * inputSize * inputSize] = data[pixelIndex + 2] / 255.0; // B channel
        }
        
        const tensor = new ort.Tensor('float32', tensorData, [1, 3, inputSize, inputSize]);
        
        return {
            tensor,
            imgWidth: originalWidth,
            imgHeight: originalHeight,
            scale,
            xOffset,
            yOffset
        };
    }
    
    postprocessYOLOResults(output, outputDims, imgWidth, imgHeight) {
        const detections = [];
        
        // YOLOv5 output format: [1, 25200, 85] 
        // 85 = 4 (box coords) + 1 (objectness) + 80 (class scores)
        const [batchSize, numDetections, numFeatures] = outputDims;
        const numClasses = numFeatures - 5; // 80 classes for COCO
        
        const confidenceThreshold = 0.4;
        const inputSize = 640;
        
        for (let i = 0; i < numDetections; i++) {
            const baseIdx = i * numFeatures;
            
            // Extract box coordinates (center format)
            const centerX = output[baseIdx];
            const centerY = output[baseIdx + 1];
            const width = output[baseIdx + 2];
            const height = output[baseIdx + 3];
            const objectness = output[baseIdx + 4];
            
            if (objectness < confidenceThreshold) continue;
            
            // Find best class
            let maxClassScore = 0;
            let bestClassId = -1;
            
            for (let c = 0; c < numClasses; c++) {
                const classScore = output[baseIdx + 5 + c];
                if (classScore > maxClassScore) {
                    maxClassScore = classScore;
                    bestClassId = c;
                }
            }
            
            const finalConfidence = objectness * maxClassScore;
            if (finalConfidence < confidenceThreshold) continue;
            
            // Convert center format to corner format and scale to original image
            const x1 = (centerX - width / 2) / inputSize * imgWidth;
            const y1 = (centerY - height / 2) / inputSize * imgHeight;
            const x2 = (centerX + width / 2) / inputSize * imgWidth;
            const y2 = (centerY + height / 2) / inputSize * imgHeight;
            
            detections.push({
                bbox: [x1, y1, x2 - x1, y2 - y1], // [x, y, width, height]
                confidence: finalConfidence,
                classId: bestClassId,
                className: this.cocoClasses[bestClassId] || 'unknown'
            });
        }
        
        return detections;
    }
    
    // Non-Maximum Suppression to remove overlapping detections
    nonMaxSuppression(detections, scoreThreshold = 0.5, iouThreshold = 0.4) {
        // Sort by confidence score (highest first)
        detections.sort((a, b) => b.confidence - a.confidence);
        
        const selected = [];
        const suppressed = new Set();
        
        for (let i = 0; i < detections.length; i++) {
            if (suppressed.has(i)) continue;
            if (detections[i].confidence < scoreThreshold) break;
            
            selected.push(detections[i]);
            
            // Suppress overlapping detections
            for (let j = i + 1; j < detections.length; j++) {
                if (suppressed.has(j)) continue;
                
                const iou = this.calculateIoU(detections[i].bbox, detections[j].bbox);
                if (iou > iouThreshold) {
                    suppressed.add(j);
                }
            }
        }
        
        return selected;
    }
    
    // Calculate Intersection over Union (IoU) for two bounding boxes
    calculateIoU(bbox1, bbox2) {
        const [x1_1, y1_1, w1, h1] = bbox1;
        const [x1_2, y1_2, w2, h2] = bbox2;
        
        const x2_1 = x1_1 + w1;
        const y2_1 = y1_1 + h1;
        const x2_2 = x1_2 + w2;
        const y2_2 = y1_2 + h2;
        
        // Calculate intersection rectangle
        const xLeft = Math.max(x1_1, x1_2);
        const yTop = Math.max(y1_1, y1_2);
        const xRight = Math.min(x2_1, x2_2);
        const yBottom = Math.min(y2_1, y2_2);
        
        if (xRight < xLeft || yBottom < yTop) {
            return 0.0; // No intersection
        }
        
        const intersectionArea = (xRight - xLeft) * (yBottom - yTop);
        const bbox1Area = w1 * h1;
        const bbox2Area = w2 * h2;
        const unionArea = bbox1Area + bbox2Area - intersectionArea;
        
        return intersectionArea / unionArea;
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
}

// Export for use in main script
window.YOLODetector = YOLODetector;