// We access global variables injected by the dynamic script loading
declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
  }
}

// Using specific, known-good versions
const MP_VERSION = '0.4.1633559619';
// const CAMERA_VERSION = '0.3.1675466862'; 

const SCRIPTS = [
  `./libs/camera_utils.js`,
  `./libs/face_mesh.js`
];

// Helper to load a script dynamically
const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        // Check if script is already present
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        console.log(`[TrackingService] Loading script: ${src}`);
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        script.onerror = (e) => {
            console.error(`Error loading script ${src}`, e);
            reject(new Error(`Failed to load ${src}`));
        };
        document.body.appendChild(script);
    });
};

export class TrackingService {
  private faceMesh: any = null;
  private camera: any = null;
  private videoElement: HTMLVideoElement;
  private onFaceResults: (results: any) => void;
  // Flag to track if the service is active or has been stopped
  private isRunning: boolean = false; 

  constructor(
    videoElement: HTMLVideoElement, 
    onFaceResults: (results: any) => void,
    onHandResults: (results: any) => void 
  ) {
    this.videoElement = videoElement;
    this.onFaceResults = onFaceResults;
  }

  public async initialize() {
    this.isRunning = true;
    console.log("[TrackingService] Initializing...");

    // 1. Load Scripts dynamically to ensure they exist
    try {
        await Promise.all(SCRIPTS.map(loadScript));
        console.log("[TrackingService] All MediaPipe scripts loaded.");
    } catch (error) {
        if (!this.isRunning) return;
        console.error("[TrackingService] Script loading failed:", error);
        alert("Failed to load local AI scripts. Did you run 'node download_assets.js'?");
        throw error; 
    }

    if (!this.isRunning) return;

    // 2. Wait a tick to ensure globals are registered
    if (!window.FaceMesh || !window.Camera) {
        console.warn("[TrackingService] Globals missing after load, waiting...");
        await new Promise(r => setTimeout(r, 1000));
    }

    if (!this.isRunning) return;

    if (!window.FaceMesh || !window.Camera) {
        console.error("[TrackingService] Critical Error: FaceMesh/Camera globals not found.");
        throw new Error("MediaPipe globals not found");
    }

    // 3. Initialize Face Mesh
    try {
      this.faceMesh = new window.FaceMesh({
        // NOTE: We still fetch WASM assets from CDN because they require specific MIME types 
        // and are large binary files not easily managed in simple local setups without a bundler.
        // If strictly offline is required, download the .wasm/.tflite files and host them 
        // with 'application/wasm' headers.
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${MP_VERSION}/${file}`;
        },
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.faceMesh.onResults(this.onFaceResults);
      console.log("[TrackingService] FaceMesh configured.");
    } catch (e) {
      if (this.isRunning) console.error("[TrackingService] FaceMesh config error:", e);
      throw e;
    }

    if (!this.isRunning) {
        // If stopped during config, clean up immediately
        if (this.faceMesh) { 
            try { this.faceMesh.close(); } catch(e) {}
            this.faceMesh = null;
        }
        return;
    }

    // 4. Initialize Camera
    // Retrying camera access in case it is still locked by previous page
    let cameraStarted = false;
    let attempts = 0;
    while (!cameraStarted && attempts < 3 && this.isRunning) {
        try {
            if (this.videoElement) {
                console.log(`[TrackingService] Starting Camera (Attempt ${attempts + 1})...`);
                this.camera = new window.Camera(this.videoElement, {
                    onFrame: async () => {
                        // CRITICAL FIX: Check isRunning AND faceMesh existence
                        // This prevents "Cannot pass deleted object as a pointer of type SolutionWasm"
                        if (this.isRunning && this.faceMesh) {
                            try {
                                await this.faceMesh.send({ image: this.videoElement });
                            } catch (err) {
                                // If we encounter an error but are supposed to be running, log it.
                                // If we are stopping, ignore it as it's likely a race condition with close().
                                if (this.isRunning) console.error("FaceMesh send error:", err);
                            }
                        }
                    },
                    width: 1280,
                    height: 720,
                });
                await this.camera.start();
                cameraStarted = true;
                console.log("[TrackingService] Camera started successfully.");
            }
        } catch (e) {
            console.error(`[TrackingService] Camera start error (Attempt ${attempts + 1}):`, e);
            await new Promise(r => setTimeout(r, 1000));
            attempts++;
        }
    }

    if (!cameraStarted && this.isRunning) {
        throw new Error("Camera failed to start");
    }
  }

  public stop() {
    console.log("[TrackingService] Stopping...");
    this.isRunning = false; // Immediately disable the processing loop

    if (this.camera) {
      try { 
          this.camera.stop(); 
      } catch(e) {
          console.warn("Error stopping camera", e);
      }
      this.camera = null;
    }

    if (this.faceMesh) {
      try { 
          // Closing the FaceMesh frees WASM memory. 
          // Any subsequent calls to .send() will crash the app if not guarded by isRunning.
          this.faceMesh.close(); 
      } catch(e) {
          console.warn("Error closing FaceMesh", e);
      }
      this.faceMesh = null;
    }
  }
}