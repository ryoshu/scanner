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
            // Multiple model sources to try in order
            const modelUrls = [
                // Local model (if available)
                './models/yolov5s.onnx',
                // Hugging Face model hub
                'https://huggingface.co/onnx/yolov5/resolve/main/yolov5s.onnx',
                // Alternative CDN sources
                'https://github.com/ultralytics/yolov5/releases/download/v7.0/yolov5s.onnx',
                // Smaller YOLOv5n model as fallback
                'https://huggingface.co/onnx/yolov5/resolve/main/yolov5n.onnx'
            ];
            
            for (let i = 0; i < modelUrls.length; i++) {
            const modelUrl = modelUrls[i];
            console.log(`Attempting to load YOLO model from: ${modelUrl}`);
            
            // Notify UI about loading progress
            if (typeof window !== 'undefined' && window.updateAIStatus) {
                window.updateAIStatus(`Loading YOLO model (${i + 1}/${modelUrls.length}): ${modelUrl.split('/').pop()}`);
            }
            
            try {
                // First check if the URL is accessible (for local files)
                if (modelUrl.startsWith('./')) {
                    try {
                        const response = await fetch(modelUrl, { method: 'HEAD' });
                        if (!response.ok) {
                            throw new Error(`Local model file not accessible: ${response.status}`);
                        }
                    } catch (fetchError) {
                        throw new Error(`Local model file not found: ${fetchError.message}`);
                    }
                }
                
                // Configure ONNX Runtime for better compatibility
                const sessionOptions = {
                    executionProviders: ['wasm'],
                    graphOptimizationLevel: 'disabled',
                    executionMode: 'sequential',
                    enableCpuMemArena: false,
                    enableMemPattern: false
                };
                
                console.log('Creating ONNX session with options:', sessionOptions);
                this.session = await ort.InferenceSession.create(modelUrl, sessionOptions);
                this.isReady = true;
                console.log(`YOLO model loaded successfully from: ${modelUrl}`);
                
                // Get input/output info for debugging
                console.log('Model inputs:', this.session.inputNames);
                console.log('Model outputs:', this.session.outputNames);
                
                // Check input data type
                if (this.session.inputNames && this.session.inputNames.length > 0) {
                    const inputName = this.session.inputNames[0];
                    try {
                        const inputInfo = this.session.getInputMetadata ? this.session.getInputMetadata(inputName) : null;
                        console.log(`Input ${inputName} info:`, inputInfo);
                    } catch (e) {
                        console.log('Could not get input metadata:', e.message);
                    }
                }
                
                return;
                
            } catch (error) {
                console.warn(`Failed to load model from ${modelUrl}:`, error.message);
                
                // If it's the last URL, we'll use a fallback mode
                if (i === modelUrls.length - 1) {
                    console.warn('All YOLO model sources failed, enabling fallback mode');
                    this.fallbackMode = true;
                    this.isReady = true;
                    return;
                }
                
                // Otherwise, continue to next URL
                continue;
            }
        }
        } finally {
            this.isLoading = false;
        }
    }
    
    async detectObjects(imageElement) {
        if (!this.isReady) {
            await this.loadModel();
        }
        
        // If we're in fallback mode, return empty results with message
        if (this.fallbackMode) {
            console.log('Using fallback mode - no AI detection available');
            return [{
                objectName: 'No AI Detection Available',
                confidence: 0,
                bbox: [0, 0, 0, 0],
                isPotentialHazard: false,
                fallbackMessage: 'YOLO model could not be loaded. Please manually identify hazards.'
            }];
        }
        
        try {
            // Try inference with different tensor types if needed
            return await this.runInferenceWithTypeDetection(imageElement);
            
        } catch (error) {
            console.error('Detection failed:', error);
            // Enable fallback mode for future calls
            this.fallbackMode = true;
            throw error;
        }
    }
    
    async runInferenceWithTypeDetection(imageElement) {
        // Preprocess image for YOLO input
        const preprocessResult = await this.preprocessImage(imageElement);
        let { tensor, imgWidth, imgHeight } = preprocessResult;
        
        const inputName = this.session.inputNames[0];
        const outputName = this.session.outputNames[0];
        
        // First try with the tensor type determined during preprocessing
        try {
            console.log(`Running inference with input name: ${inputName}, tensor type: ${tensor.type}, shape: ${tensor.dims}`);
            
            const inputObj = {};
            inputObj[inputName] = tensor;
            const results = await this.session.run(inputObj);
            
            const output = results[outputName];
            console.log(`Got output from ${outputName}, shape: ${output.dims}`);
            
            // Postprocess YOLO results
            const detections = this.postprocessYOLOResults(output.data, output.dims, imgWidth, imgHeight);
            
            // Apply Non-Maximum Suppression
            const filteredDetections = this.nonMaxSuppression(detections, 0.5, 0.4);
            
            // Map to potential hazards
            return this.filterPotentialHazards(filteredDetections);
            
        } catch (inferenceError) {
            // Check if it's a data type mismatch error
            if (inferenceError.message.includes('Unexpected input data type') || 
                inferenceError.message.includes('float16') || 
                inferenceError.message.includes('float32')) {
                
                console.log('Data type mismatch detected, trying alternative tensor type...');
                
                // Try with the opposite tensor type
                const alternativeTensor = await this.createAlternativeTensor(preprocessResult, tensor.type);
                
                try {
                    console.log(`Retrying with tensor type: ${alternativeTensor.type}`);
                    
                    const inputObj = {};
                    inputObj[inputName] = alternativeTensor;
                    const results = await this.session.run(inputObj);
                    
                    const output = results[outputName];
                    console.log(`Success! Got output from ${outputName}, shape: ${output.dims}`);
                    
                    // Postprocess YOLO results
                    const detections = this.postprocessYOLOResults(output.data, output.dims, imgWidth, imgHeight);
                    
                    // Apply Non-Maximum Suppression
                    const filteredDetections = this.nonMaxSuppression(detections, 0.5, 0.4);
                    
                    // Map to potential hazards
                    return this.filterPotentialHazards(filteredDetections);
                    
                } catch (secondError) {
                    console.error('Both tensor types failed:', secondError);
                    throw secondError;
                }
            } else {
                // Not a data type error, rethrow original
                throw inferenceError;
            }
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
        // Note: Some models expect float16, we'll detect this dynamically
        const tensorData = new Float32Array(3 * inputSize * inputSize);
        
        for (let i = 0; i < inputSize * inputSize; i++) {
            const pixelIndex = i * 4;
            // Normalize from [0,255] to [0,1]
            tensorData[i] = data[pixelIndex] / 255.0;                    // R channel
            tensorData[i + inputSize * inputSize] = data[pixelIndex + 1] / 255.0;     // G channel  
            tensorData[i + 2 * inputSize * inputSize] = data[pixelIndex + 2] / 255.0; // B channel
        }
        
        // Detect required tensor type from model (float32 vs float16)
        let tensorType = 'float32';
        let finalTensorData = tensorData;
        
        // Store session reference for tensor type detection during inference
        if (this.session && this.session.inputNames && this.session.inputNames.length > 0) {
            const inputName = this.session.inputNames[0];
            
            // Try to get input metadata, but handle cases where it's not available
            try {
                if (this.session.getInputMetadata) {
                    const inputMetadata = this.session.getInputMetadata(inputName);
                    console.log(`Input metadata for ${inputName}:`, inputMetadata);
                    
                    if (inputMetadata && inputMetadata.type && inputMetadata.type.includes('float16')) {
                        tensorType = 'float16';
                        console.log('Converting to float16 tensor');
                        // Convert Float32Array to Uint16Array for float16
                        finalTensorData = new Uint16Array(tensorData.length);
                        for (let i = 0; i < tensorData.length; i++) {
                            finalTensorData[i] = this.floatToFloat16(tensorData[i]);
                        }
                    }
                }
            } catch (e) {
                console.log('Using default float32 tensor type (metadata not available)');
            }
        }
        
        const tensor = new ort.Tensor(tensorType, finalTensorData, [1, 3, inputSize, inputSize]);
        console.log(`Created tensor: type=${tensorType}, shape=[1, 3, ${inputSize}, ${inputSize}], dataLength=${finalTensorData.length}`);
        
        return {
            tensor,
            imgWidth: originalWidth,
            imgHeight: originalHeight,
            scale,
            xOffset,
            yOffset,
            rawTensorData: tensorData  // Keep original float32 data for type conversion
        };
    }
    
    async createAlternativeTensor(preprocessResult, currentTensorType) {
        const { rawTensorData } = preprocessResult;
        const inputSize = 640;
        
        let newTensorType, newTensorData;
        
        if (currentTensorType === 'float32') {
            // Convert to float16
            newTensorType = 'float16';
            newTensorData = new Uint16Array(rawTensorData.length);
            for (let i = 0; i < rawTensorData.length; i++) {
                newTensorData[i] = this.floatToFloat16(rawTensorData[i]);
            }
        } else {
            // Convert to float32 (or keep as float32)
            newTensorType = 'float32';
            newTensorData = rawTensorData; // Already Float32Array
        }
        
        const tensor = new ort.Tensor(newTensorType, newTensorData, [1, 3, inputSize, inputSize]);
        console.log(`Created alternative tensor: type=${newTensorType}, dataLength=${newTensorData.length}`);
        
        return tensor;
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
            
            // Debug: Log confidence values to understand the range
            console.log(`Raw confidence: objectness=${objectness}, maxClassScore=${maxClassScore}, final=${finalConfidence}`);
            
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
                    confidence: this.normalizeConfidence(detection.confidence),
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
                    confidence: this.normalizeConfidence(detection.confidence),
                    bbox: detection.bbox,
                    isPotentialHazard: false
                });
            }
        });
        
        return potentialHazards.sort((a, b) => b.confidence - a.confidence);
    }
    
    // Helper function to normalize confidence values to 0-100% range
    normalizeConfidence(confidence) {
        // Handle different possible ranges of confidence values
        let normalizedValue;
        
        if (confidence <= 1.0) {
            // Already in 0-1 range, convert to percentage
            normalizedValue = confidence * 100;
        } else if (confidence <= 100) {
            // Already in 0-100 range
            normalizedValue = confidence;
        } else {
            // Very large values - might be in different scale
            // Clamp to reasonable range and convert
            normalizedValue = Math.min(confidence / 100000, 100);
        }
        
        // Ensure result is between 0-100 and round to whole number
        return Math.max(0, Math.min(100, Math.round(normalizedValue)));
    }
    
    // Helper function to convert float32 to float16 (IEEE 754 half precision)
    floatToFloat16(value) {
        const floatView = new Float32Array(1);
        const int32View = new Int32Array(floatView.buffer);
        floatView[0] = value;
        const f = int32View[0];
        
        const sign = (f >>> 31) << 15;
        let exp = ((f >>> 23) & 0xff) - 127;
        let frac = f & 0x7fffff;
        
        if (exp < -14) {
            // Subnormal
            const shift = -14 - exp;
            if (shift > 24) return sign;
            frac = (frac | 0x800000) >>> shift;
            return sign | frac;
        } else if (exp > 15) {
            // Infinity
            return sign | 0x7c00;
        } else {
            // Normal
            return sign | ((exp + 15) << 10) | (frac >>> 13);
        }
    }
}

// Export for use in main script
window.YOLODetector = YOLODetector;