/**
 * WebGL Renderer
 * 
 * GPU-accelerated portrait rendering using WebGL.
 * Provides smoother animation and better performance than 2D canvas.
 */

import { Point2D, Point3D } from '@/lib/motion';
import { BlendShapes } from '@/lib/session';
import { PortraitLandmarks } from './portrait-detector';

/**
 * WebGL Renderer Configuration
 */
export interface WebGLConfig {
  width: number;
  height: number;
  antialiasing: boolean;
  preserveDrawingBuffer: boolean;
}

/**
 * Shader sources
 */
const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_image;
  uniform sampler2D u_portrait;
  
  varying vec2 v_texCoord;
  
  // Blend shape uniforms
  uniform float u_eyeBlinkLeft;
  uniform float u_eyeBlinkRight;
  uniform float u_mouthSmile;
  uniform float u_jawOpen;
  
  // Head rotation uniforms
  uniform float u_yaw;
  uniform float u_pitch;
  uniform float u_roll;
  
  // Identity overlay uniforms
  uniform float u_overlayIntensity;
  uniform vec4 u_eyelidColor;
  
  void main() {
    vec4 color = texture2D(u_portrait, v_texCoord);
    
    // Apply subtle head rotation effect via coordinate warp
    vec2 center = vec2(0.5, 0.5);
    vec2 toCenter = v_texCoord - center;
    
    // Yaw effect (turning head)
    float yawEffect = u_yaw * 0.05;
    toCenter.x += toCenter.y * sin(yawEffect);
    
    // Pitch effect (looking up/down)
    float pitchEffect = u_pitch * 0.05;
    toCenter.y += toCenter.y * sin(pitchEffect);
    
    // Recalculate texture coordinate with rotation
    vec2 rotatedCoord = center + toCenter;
    
    // Sample with slight offset for rotation effect
    if (rotatedCoord.x >= 0.0 && rotatedCoord.x <= 1.0 && rotatedCoord.y >= 0.0 && rotatedCoord.y <= 1.0) {
      color = texture2D(u_portrait, rotatedCoord);
    }
    
    // Apply eyelid overlay for blink effect
    // Left eye area (upper portion of face)
    float eyeRegionY = 0.35 + u_eyeBlinkLeft * 0.02;
    float leftEyeArea = step(0.38, v_texCoord.x) * step(v_texCoord.x, 0.48) * 
                        step(eyeRegionY - 0.02 * u_eyeBlinkLeft, v_texCoord.y) * 
                        step(v_texCoord.y, eyeRegionY);
    color = mix(color, u_eyelidColor, leftEyeArea * u_overlayIntensity);
    
    // Right eye area
    float rightEyeArea = step(0.52, v_texCoord.x) * step(v_texCoord.x, 0.62) * 
                         step(eyeRegionY - 0.02 * u_eyeBlinkRight, v_texCoord.y) * 
                         step(v_texCoord.y, eyeRegionY);
    color = mix(color, u_eyelidColor, rightEyeArea * u_overlayIntensity);
    
    // Apply subtle brightness for smile effect (cheek raise)
    float smileEffect = u_mouthSmile * 0.02;
    float leftCheekArea = step(0.30, v_texCoord.x) * step(v_texCoord.x, 0.42) * 
                         step(0.45, v_texCoord.y) * step(v_texCoord.y, 0.55);
    float rightCheekArea = step(0.58, v_texCoord.x) * step(v_texCoord.x, 0.70) * 
                           step(0.45, v_texCoord.y) * step(v_texCoord.y, 0.55);
    color.rgb += (leftCheekArea + rightCheekArea) * smileEffect;
    
    gl_FragColor = color;
  }
`;

/**
 * WebGLRenderer
 * 
 * GPU-accelerated portrait renderer using WebGL shaders.
 */
export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  
  // Textures
  private portraitTexture: WebGLTexture | null = null;
  private videoTexture: WebGLTexture | null = null;
  
  // Buffers
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  
  // Uniform locations
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  
  // Current state
  private currentBlendShapes: BlendShapes;
  private currentHeadRotation: Point3D;
  private portraitImage: HTMLImageElement | null = null;
  private isInitialized: boolean = false;

  constructor(canvas: HTMLCanvasElement, config?: Partial<WebGLConfig>) {
    this.canvas = canvas;
    
    const gl = canvas.getContext('webgl', {
      antialias: config?.antialiasing ?? true,
      preserveDrawingBuffer: config?.preserveDrawingBuffer ?? true,
    });
    
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    
    this.gl = gl;
    this.currentBlendShapes = this.getNeutralBlendShapes();
    this.currentHeadRotation = { x: 0, y: 0, z: 0 };
    
    this.program = this.createProgram();
    this.setupBuffers();
    this.setupUniforms();
  }

  /**
   * Create and compile shader
   */
  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');
    
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error('Shader compile error: ' + info);
    }
    
    return shader;
  }

  /**
   * Create shader program
   */
  private createProgram(): WebGLProgram {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    
    const program = this.gl.createProgram();
    if (!program) throw new Error('Failed to create program');
    
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(program);
      throw new Error('Program link error: ' + info);
    }
    
    return program;
  }

  /**
   * Setup vertex buffers
   */
  private setupBuffers(): void {
    // Position buffer (fullscreen quad)
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]),
      this.gl.STATIC_DRAW
    );

    // Texture coordinate buffer
    this.texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([
        0, 1,
        1, 1,
        0, 0,
        0, 0,
        1, 1,
        1, 0,
      ]),
      this.gl.STATIC_DRAW
    );
  }

  /**
   * Setup uniform locations
   */
  private setupUniforms(): void {
    this.gl.useProgram(this.program);
    
    this.uniforms = {
      image: this.gl.getUniformLocation(this.program, 'u_image'),
      portrait: this.gl.getUniformLocation(this.program, 'u_portrait'),
      eyeBlinkLeft: this.gl.getUniformLocation(this.program, 'u_eyeBlinkLeft'),
      eyeBlinkRight: this.gl.getUniformLocation(this.program, 'u_eyeBlinkRight'),
      mouthSmile: this.gl.getUniformLocation(this.program, 'u_mouthSmile'),
      jawOpen: this.gl.getUniformLocation(this.program, 'u_jawOpen'),
      yaw: this.gl.getUniformLocation(this.program, 'u_yaw'),
      pitch: this.gl.getUniformLocation(this.program, 'u_pitch'),
      roll: this.gl.getUniformLocation(this.program, 'u_roll'),
      overlayIntensity: this.gl.getUniformLocation(this.program, 'u_overlayIntensity'),
      eyelidColor: this.gl.getUniformLocation(this.program, 'u_eyelidColor'),
    };
  }

  /**
   * Load portrait image
   */
  async loadPortrait(imageData: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        this.portraitImage = img;
        
        // Create texture
        this.portraitTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.portraitTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
        
        // Set texture parameters
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        
        this.isInitialized = true;
        resolve();
      };
      
      img.onerror = () => reject(new Error('Failed to load portrait image'));
      img.src = imageData;
    });
  }

  /**
   * Update blend shapes
   */
  updateBlendShapes(blendShapes: BlendShapes): void {
    this.currentBlendShapes = blendShapes;
  }

  /**
   * Update head rotation
   */
  updateHeadRotation(rotation: Point3D): void {
    this.currentHeadRotation = rotation;
  }

  /**
   * Render a frame
   */
  render(): void {
    if (!this.isInitialized || !this.portraitTexture) return;
    
    const gl = this.gl;
    
    // Clear
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(this.program);
    
    // Set up position attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    const positionLocation = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Set up texCoord attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    const texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Bind portrait texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.portraitTexture);
    gl.uniform1i(this.uniforms.portrait, 0);
    
    // Set blend shape uniforms
    gl.uniform1f(this.uniforms.eyeBlinkLeft, this.currentBlendShapes.eyeBlinkLeft);
    gl.uniform1f(this.uniforms.eyeBlinkRight, this.currentBlendShapes.eyeBlinkRight);
    gl.uniform1f(this.uniforms.mouthSmile, 
      (this.currentBlendShapes.mouthSmileLeft + this.currentBlendShapes.mouthSmileRight) / 2);
    gl.uniform1f(this.uniforms.jawOpen, this.currentBlendShapes.jawOpen);
    
    // Set head rotation uniforms (convert to radians)
    gl.uniform1f(this.uniforms.yaw, this.currentHeadRotation.y * Math.PI / 180);
    gl.uniform1f(this.uniforms.pitch, this.currentHeadRotation.x * Math.PI / 180);
    gl.uniform1f(this.uniforms.roll, this.currentHeadRotation.z * Math.PI / 180);
    
    // Set overlay intensity
    const eyeActivity = this.currentBlendShapes.eyeBlinkLeft + this.currentBlendShapes.eyeBlinkRight;
    const smileActivity = this.currentBlendShapes.mouthSmileLeft + this.currentBlendShapes.mouthSmileRight;
    gl.uniform1f(this.uniforms.overlayIntensity, Math.max(eyeActivity, smileActivity * 0.5));
    
    // Set eyelid color (dark)
    gl.uniform4f(this.uniforms.eyelidColor, 0.08, 0.04, 0.02, 1.0);
    
    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /**
   * Get neutral blend shapes
   */
  private getNeutralBlendShapes(): BlendShapes {
    return {
      eyeBlinkLeft: 0, eyeBlinkRight: 0,
      eyeLookUp: 0, eyeLookDown: 0, eyeLookLeft: 0, eyeLookRight: 0,
      eyeSquintLeft: 0, eyeSquintRight: 0,
      jawOpen: 0, jawForward: 0, jawLeft: 0, jawRight: 0,
      mouthClose: 1, mouthFunnel: 0, mouthPucker: 0,
      mouthLeft: 0, mouthRight: 0,
      mouthSmileLeft: 0, mouthSmileRight: 0,
      mouthFrownLeft: 0, mouthFrownRight: 0,
      mouthStretchLeft: 0, mouthStretchRight: 0,
      mouthRollLower: 0, mouthRollUpper: 0,
      mouthShrugLower: 0, mouthShrugUpper: 0,
      mouthPressLeft: 0, mouthPressRight: 0,
      cheekPuffLeft: 0, cheekPuffRight: 0,
      cheekSquintLeft: 0, cheekSquintRight: 0,
      browDownLeft: 0, browDownRight: 0,
      browInnerUp: 0, browOuterUpLeft: 0, browOuterUpRight: 0,
      tongueOut: 0,
    };
  }

  /**
   * Check if WebGL is available
   */
  static isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  /**
   * Get canvas for preview
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.positionBuffer) this.gl.deleteBuffer(this.positionBuffer);
    if (this.texCoordBuffer) this.gl.deleteBuffer(this.texCoordBuffer);
    if (this.portraitTexture) this.gl.deleteTexture(this.portraitTexture);
    if (this.videoTexture) this.gl.deleteTexture(this.videoTexture);
    if (this.program) this.gl.deleteProgram(this.program);
  }
}
