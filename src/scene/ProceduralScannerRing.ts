import * as THREE from 'three';

export class ProceduralScannerRing extends THREE.Group {
  private outerRing!: THREE.Mesh;
  private innerRing!: THREE.Mesh;
  private reticlePlane!: THREE.Mesh;
  private laserPlane!: THREE.Mesh;
  private isScanning = false;
  private scanProgress = 0;

  constructor() {
    super();
    this.name = 'HolographicBiometricScanner';
    this.buildScanner();
  }

  private buildScanner() {
    // 1. Sleek Diagnostic Pedestal Stand
    const standGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.45, 24);
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Deep slate
      metalness: 0.85,
      roughness: 0.2,
    });
    const standMesh = new THREE.Mesh(standGeo, standMat);
    standMesh.position.y = 0.225;
    standMesh.castShadow = true;
    this.add(standMesh);

    // 2. Gimbal Bracket Collar
    const bracketGeo = new THREE.TorusGeometry(0.06, 0.015, 12, 24, Math.PI);
    const bracketMat = new THREE.MeshStandardMaterial({
      color: 0x0d9488, // CureX Teal
      metalness: 0.8,
      roughness: 0.2,
    });
    const bracketMesh = new THREE.Mesh(bracketGeo, bracketMat);
    bracketMesh.rotation.z = Math.PI / 2;
    bracketMesh.position.y = 0.45;
    this.add(bracketMesh);

    // 3. Outer Optical Scanner Ring
    const outerGeo = new THREE.TorusGeometry(0.22, 0.018, 16, 48);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Medical Blue
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0x0369a1,
      emissiveIntensity: 0.3,
    });
    this.outerRing = new THREE.Mesh(outerGeo, outerMat);
    this.outerRing.position.y = 0.58;
    this.add(this.outerRing);

    // 4. Inner Concentric Gyro Ring
    const innerGeo = new THREE.TorusGeometry(0.18, 0.012, 16, 36);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Cyan
      metalness: 0.85,
      roughness: 0.1,
      emissive: 0x0891b2,
      emissiveIntensity: 0.5,
    });
    this.innerRing = new THREE.Mesh(innerGeo, innerMat);
    this.innerRing.position.y = 0.58;
    this.add(this.innerRing);

    // 5. Holographic HUD Reticle Disc
    const reticleGeo = new THREE.PlaneGeometry(0.34, 0.34);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Draw high-tech medical HUD reticle
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(128, 128, 110, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(128, 128, 80, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(128, 20);
    ctx.lineTo(128, 236);
    ctx.moveTo(20, 128);
    ctx.lineTo(236, 128);
    ctx.stroke();

    // Center targeting circle
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(128, 128, 12, 0, Math.PI * 2);
    ctx.fill();

    const reticleTex = new THREE.CanvasTexture(canvas);
    const reticleMat = new THREE.MeshBasicMaterial({
      map: reticleTex,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.reticlePlane = new THREE.Mesh(reticleGeo, reticleMat);
    this.reticlePlane.position.y = 0.58;
    this.add(this.reticlePlane);

    // 6. Laser Scan Plane (Vertical sweep beam)
    const laserGeo = new THREE.PlaneGeometry(0.32, 0.02);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    this.laserPlane = new THREE.Mesh(laserGeo, laserMat);
    this.laserPlane.position.set(0, 0.58, 0.02);
    this.laserPlane.visible = false;
    this.add(this.laserPlane);

    // 7. Base Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(0.36, 0.36);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const sCtx = shadowCanvas.getContext('2d')!;
    const gradient = sCtx.createRadialGradient(32, 32, 0, 32, 32, 28);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = gradient;
    sCtx.fillRect(0, 0, 64, 64);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.001;
    this.add(shadow);
  }

  public update(time: number) {
    // Holographic Gyro Rotation
    this.innerRing.rotation.y = time * 0.8;
    this.innerRing.rotation.x = Math.sin(time * 0.5) * 0.3;
    this.reticlePlane.rotation.z = -time * 0.4;

    if (this.isScanning) {
      this.scanProgress += 0.05;
      this.laserPlane.visible = true;
      this.laserPlane.position.y = 0.58 + Math.sin(this.scanProgress * 3) * 0.12;

      // Faster spinning during active diagnostic scan
      this.reticlePlane.rotation.z = -time * 2.2;
      this.innerRing.rotation.y = time * 2.5;
    } else {
      this.laserPlane.visible = false;
    }
  }

  public startScanSequence(durationMs = 2000) {
    this.isScanning = true;
    this.scanProgress = 0;
    setTimeout(() => {
      this.isScanning = false;
    }, durationMs);
  }
}
