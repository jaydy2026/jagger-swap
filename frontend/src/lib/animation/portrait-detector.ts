/**
 * Portrait Landmark Detector
 * 
 * Detects facial landmarks on an uploaded portrait image.
 * These landmarks form the "identity" that will be preserved.
 */

import { Point2D, BoundingBox } from '@/lib/motion';

// MediaPipe FaceMesh landmark indices for key features
export const LANDMARK_INDICES = {
  // Face outline
  FACE_OUTLINE: [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323,
    361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
    176, 149, 150, 136, 215, 162, 127, 234, 107, 109, 67, 10,
  ],
  
  // Left eye
  LEFT_EYE: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
  LEFT_EYE_CENTER: 468,
  
  // Right eye
  RIGHT_EYE: [33, 133, 160, 159, 158, 157, 173, 133],
  RIGHT_EYE_CENTER: 473,
  
  // Left eyebrow
  LEFT_BROW: [336, 296, 334, 293, 300],
  
  // Right eyebrow
  RIGHT_BROW: [70, 63, 105, 66, 107],
  
  // Nose
  NOSE: [1, 2, 98, 327, 4, 5, 6, 168, 195, 197],
  NOSE_TIP: 1,
  NOSE_BRIDGE: 168,
  
  // Mouth
  MOUTH_OUTER: [61, 291, 0, 17, 84, 181, 91, 146],
  MOUTH_INNER: [78, 95, 88, 178, 87, 14, 317, 402, 318, 324],
  MOUTH_CORNER_LEFT: 61,
  MOUTH_CORNER_RIGHT: 291,
  MOUTH_TOP_CENTER: 13,
  MOUTH_BOTTOM_CENTER: 14,
  
  // Jaw
  JAW: [172, 58, 132, 93, 234, 58, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454],
  
  // Cheeks
  LEFT_CHEEK: [50, 187, 123, 216, 212, 192, 214],
  RIGHT_CHEEK: [280, 411, 289, 369, 365, 379, 397],
  
  // Forehead
  FOREHEAD: [10, 151, 337, 108, 67, 109, 10],
  
  // Pupils (approximate centers)
  LEFT_PUPIL: 468,
  RIGHT_PUPIL: 473,
};

/**
 * Portrait landmarks - the "identity" that will be preserved
 */
export interface PortraitLandmarks {
  imageWidth: number;
  imageHeight: number;
  allPoints: Point2D[];
  faceBoundingBox: BoundingBox;
  
  // Feature-specific points (normalized 0-1)
  leftEye: Point2D[];
  rightEye: Point2D[];
  leftPupil: Point2D;
  rightPupil: Point2D;
  leftBrow: Point2D[];
  rightBrow: Point2D[];
  nose: Point2D[];
  noseTip: Point2D;
  mouthOuter: Point2D[];
  mouthInner: Point2D[];
  mouthCornerLeft: Point2D;
  mouthCornerRight: Point2D;
  faceOutline: Point2D[];
  jaw: Point2D[];
  leftCheek: Point2D[];
  rightCheek: Point2D[];
  forehead: Point2D[];
  
  // Center points
  faceCenter: Point2D;
  faceSize: number;
}

/**
 * PortraitDetector
 * 
 * Detects facial landmarks on an uploaded portrait image.
 * Uses MediaPipe FaceMesh for detection.
 */
export class PortraitDetector {
  private faceMesh: any = null;
  private isLoaded: boolean = false;
  private isLoading: boolean = false;

  /**
   * Initialize the detector
   */
  async initialize(): Promise<void> {
    if (this.isLoaded || this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      const { FaceMesh } = await import('@mediapipe/face_mesh');
      
      this.faceMesh = new FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`,
      });
      
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      
      this.isLoaded = true;
    } catch (error) {
      console.error('[PortraitDetector] Failed to initialize:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Detect landmarks from an image element
   */
  async detectFromImage(img: HTMLImageElement): Promise<PortraitLandmarks> {
    if (!this.isLoaded) {
      await this.initialize();
    }
    
    return new Promise((resolve, reject) => {
      this.faceMesh.onResults((results: any) => {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
          reject(new Error('No face detected in image'));
          return;
        }
        
        const landmarks = results.multiFaceLandmarks[0];
        const width = results.imageWidth || img.naturalWidth;
        const height = results.imageHeight || img.naturalHeight;
        
        // Convert normalized points to pixel coordinates
        const allPoints = landmarks.map((lm: any) => ({
          x: lm.x * width,
          y: lm.y * height,
        }));
        
        // Calculate face bounding box
        const faceBoundingBox = this.calculateBoundingBox(allPoints);
        
        // Extract feature points
        const portraitLandmarks: PortraitLandmarks = {
          imageWidth: width,
          imageHeight: height,
          allPoints,
          faceBoundingBox,
          leftEye: LANDMARK_INDICES.LEFT_EYE.map(i => allPoints[i]),
          rightEye: LANDMARK_INDICES.RIGHT_EYE.map(i => allPoints[i]),
          leftPupil: allPoints[LANDMARK_INDICES.LEFT_PUPIL],
          rightPupil: allPoints[LANDMARK_INDICES.RIGHT_PUPIL],
          leftBrow: LANDMARK_INDICES.LEFT_BROW.map(i => allPoints[i]),
          rightBrow: LANDMARK_INDICES.RIGHT_BROW.map(i => allPoints[i]),
          nose: LANDMARK_INDICES.NOSE.map(i => allPoints[i]),
          noseTip: allPoints[LANDMARK_INDICES.NOSE_TIP],
          mouthOuter: LANDMARK_INDICES.MOUTH_OUTER.map(i => allPoints[i]),
          mouthInner: LANDMARK_INDICES.MOUTH_INNER.map(i => allPoints[i]),
          mouthCornerLeft: allPoints[LANDMARK_INDICES.MOUTH_CORNER_LEFT],
          mouthCornerRight: allPoints[LANDMARK_INDICES.MOUTH_CORNER_RIGHT],
          faceOutline: LANDMARK_INDICES.FACE_OUTLINE.map(i => allPoints[i]),
          jaw: LANDMARK_INDICES.JAW.map(i => allPoints[i]),
          leftCheek: LANDMARK_INDICES.LEFT_CHEEK.map(i => allPoints[i]),
          rightCheek: LANDMARK_INDICES.RIGHT_CHEEK.map(i => allPoints[i]),
          forehead: LANDMARK_INDICES.FOREHEAD.map(i => allPoints[i]),
          faceCenter: {
            x: (faceBoundingBox.x + faceBoundingBox.width / 2),
            y: (faceBoundingBox.y + faceBoundingBox.height / 2),
          },
          faceSize: Math.max(faceBoundingBox.width, faceBoundingBox.height),
        };
        
        resolve(portraitLandmarks);
      });
      
      // Send the image for processing
      this.faceMesh.send({ image: img }).catch(reject);
    });
  }

  /**
   * Calculate bounding box from landmarks
   */
  private calculateBoundingBox(points: Point2D[]): BoundingBox {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
    this.isLoaded = false;
  }
}

/**
 * Normalize points to 0-1 range
 */
export function normalizePoints(points: Point2D[], width: number, height: number): Point2D[] {
  return points.map(p => ({
    x: p.x / width,
    y: p.y / height,
  }));
}

/**
 * Denormalize points from 0-1 to pixel coordinates
 */
export function denormalizePoints(points: Point2D[], width: number, height: number): Point2D[] {
  return points.map(p => ({
    x: p.x * width,
    y: p.y * height,
  }));
}
