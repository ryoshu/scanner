# Room Hazard Scanner - Mobile Web App

## Project Overview
A mobile web application designed to help people with mobility issues identify potential hazards in rooms. This is a Phase 0 prototype focused on rapid validation of core concepts.

## Target Users
- People using wheelchairs, walkers, or mobility aids
- Individuals with visual impairments who also have mobility challenges
- Caregivers and family members
- Occupational therapists and accessibility consultants

## Technology Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript (no framework dependencies)
- **Camera**: WebRTC API for device camera access
- **AI Detection**: ONNX Runtime Web for YOLOv5 object detection
- **Storage**: LocalStorage for data persistence
- **Accessibility**: WCAG 2.1 AA compliant design
- **Deployment**: Static files (can be hosted on GitHub Pages)

## File Structure
```
/scanner/
├── index.html          # Main application structure
├── styles.css          # Responsive, accessible styling
├── script.js          # Core application logic
├── yolo-detector.js    # YOLO object detection integration
└── CLAUDE.md          # This documentation
```

## Core Features
1. **Camera Integration**: Access device camera to capture room photos
2. **AI Object Detection**: YOLO-powered automatic detection of potential hazards
3. **Hybrid AI + Manual Workflow**: AI suggestions combined with manual verification
4. **Hazard Identification**: Manual tagging of 8+ common mobility hazards
5. **Severity Assessment**: Three-level risk categorization (low/medium/high)
6. **Data Persistence**: Local storage of scan history (last 10 scans)
7. **Accessibility**: Large buttons, screen reader support, high contrast mode

## Hazard Types Tracked
- Loose Rugs
- Floor Clutter
- Poor Lighting
- Narrow Pathways
- Sharp Furniture Corners
- High Door Thresholds
- Unstable Furniture
- Electrical Cords
- Custom Hazards (user-defined)

## AI Integration (Phase 0)

### **YOLO Object Detection**
The prototype includes AI-powered object detection using YOLOv5 via ONNX Runtime Web:

**Detected Object Classes:**
- Furniture (chairs, tables, couches) → Sharp corners, unstable furniture hazards
- Floor items (backpacks, bottles, books) → Floor clutter hazards  
- Electronics (laptops, TVs) → Electrical cord hazards
- Plants and decorative items → Pathway obstruction hazards

**AI Workflow:**
1. **Photo Capture**: User takes photo of room
2. **AI Analysis**: YOLO model processes image for objects (2-3 second analysis)
3. **Hazard Mapping**: Detected objects mapped to potential mobility hazards
4. **User Review**: AI suggestions presented with confidence scores
5. **Manual Override**: User can accept/reject AI suggestions
6. **Combined Assessment**: AI + manual inputs merged for final assessment

**Current Limitations:**
- Uses pre-trained COCO dataset (not mobility-specific)
- Mock detection mode for development/testing
- ~20-50MB model size (loads on first use)
- Basic object-to-hazard mapping rules

**Future Enhancements (Phase 1+):**
- Custom mobility hazard detection model
- Real-time analysis during camera preview
- Confidence-based auto-selection
- User feedback loop for model improvement

## Development Commands
Since this is a vanilla JavaScript project, no build process is required:

- **Local Testing**: Open `index.html` in a web browser
- **Mobile Testing**: Use browser dev tools device emulation or test on actual mobile device
- **HTTPS Required**: Camera access requires HTTPS in production (use GitHub Pages or similar)

## Accessibility Features
- Minimum 44px touch targets
- High contrast color schemes
- Screen reader compatibility with ARIA labels
- Keyboard navigation support
- Reduced motion preferences respected
- Voice announcements for key actions

## Browser Compatibility
- **Required**: Modern browsers with WebRTC support
- **Tested**: Chrome/Safari on iOS, Chrome on Android
- **Fallback**: Graceful degradation for browsers without camera access

## Data Storage
- Uses browser LocalStorage for offline functionality
- Stores scan history, photos (base64), and hazard data
- No server required for prototype phase
- Data persists until browser cache is cleared

## Development Roadmap

### **Phase 0: Rapid Prototype (2-3 weeks) - CURRENT**
**Goal:** Validate core concept with minimal viable prototype

**Completed Features:**
- Simple web page with camera access
- Basic photo capture and storage
- Manual hazard tagging with 3 severity levels (low/medium/high)
- Simple checklist for 8 common hazards
- Basic local storage for captured data
- Large button interface for touch accessibility

**Technology Stack:**
- Vanilla HTML/CSS/JavaScript (no framework overhead)
- WebRTC for camera access
- LocalStorage for data persistence
- CSS Grid for responsive layout

**Key Validation Points:**
- Camera functionality on mobile devices
- User interaction patterns with large touch targets
- Basic accessibility with screen readers
- Data persistence across sessions
- Core workflow: scan → identify → document → review

### **Phase 1: MVP (2-3 months)**
**Goal:** Build production-ready minimum viable product

**Planned Features:**
- **Enhanced Camera Controls**: Zoom, flash, front/back camera switching
- **Advanced Hazard Categorization**: Room-specific hazard templates (bathroom, kitchen, bedroom)
- **Improved Data Storage**: IndexedDB for better performance and larger storage
- **Basic Reporting**: PDF export, printable summaries
- **Enhanced Accessibility**: 
  - Complete screen reader support with detailed ARIA labels
  - High contrast mode toggle
  - Font size adjustment
  - Voice announcements for all actions

**Technology Upgrades:**
- Migrate to Progressive Web App (PWA) architecture
- Implement React with TypeScript for maintainable code
- Add Tailwind CSS with custom accessibility design system
- Integrate Workbox for offline functionality

### **Phase 2: Enhanced Features (3-4 months)**
**Goal:** Add advanced user experience and sharing capabilities

**Planned Features:**
- **Voice Technology Integration**:
  - Speech-to-text for hazard descriptions and notes
  - Text-to-speech for reading hazard details and instructions
  - Voice commands for hands-free navigation
  - Audio cues for confirmation and alerts

- **Advanced Hazard Management**:
  - Photo annotation with hazard markers
  - Detailed documentation with notes and photos
  - Progress tracking for hazard resolution
  - Reminder system for follow-up actions

- **Sharing and Collaboration**:
  - Share assessments with caregivers/family
  - Export to multiple formats (PDF, CSV, JSON)
  - Integration with email and messaging apps
  - Professional reporting templates

- **Room-Specific Templates**:
  - Bathroom safety checklists
  - Kitchen accessibility assessments
  - Bedroom mobility evaluations
  - Living area hazard templates

### **Phase 3: Advanced Integration (4-6 months)**
**Goal:** Implement AI assistance and professional-grade features

**Planned Features:**
- **AI-Assisted Hazard Detection**:
  - Computer vision for automatic hazard identification
  - Machine learning models trained on mobility hazards
  - Confidence scoring for detected hazards
  - User feedback loop to improve accuracy

- **Professional Integration**:
  - Integration with occupational therapy workflows
  - Insurance documentation templates
  - ADA compliance reporting
  - Healthcare provider integration

- **Advanced Assistive Technology Support**:
  - Switch control compatibility for users with limited dexterity
  - Eye tracking device integration
  - Head tracking support
  - External Bluetooth device connectivity

- **Smart Home Integration**:
  - Connect with smart lighting systems
  - Integration with smart door locks and automatic doors
  - Environmental control system connectivity
  - IoT sensor integration for ongoing monitoring

- **Advanced Analytics**:
  - Trend analysis across multiple scans
  - Risk assessment algorithms
  - Personalized recommendations based on user mobility profile
  - Comparative analysis with safety standards

**Technology Evolution:**
- Cloud backend for data synchronization and AI processing
- Real-time collaboration features
- Advanced security and privacy controls
- Enterprise-grade reporting and analytics

## Testing Notes
1. **Camera Permissions**: Users must grant camera access on first use
2. **Mobile Orientation**: Works in both portrait and landscape
3. **Storage Limits**: LocalStorage has ~5-10MB limit (adequate for prototype)
4. **Performance**: Optimized for older mobile devices

## Known Limitations (Phase 0)
- No automatic hazard detection (manual identification only)
- Basic photo capture (no advanced camera controls)
- Limited to 10 stored scans
- No data export functionality
- No multi-user support

## Deployment
For testing/demo deployment:
1. Upload files to GitHub repository
2. Enable GitHub Pages
3. Access via HTTPS URL (required for camera)

## Privacy & Security
- All data stored locally on device
- No server communication required
- Photos never leave the user's device
- No user accounts or personal data collection