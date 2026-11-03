import * as THREE from 'three';

export class ProceduralPillStation extends THREE.Group {
  private capMesh!: THREE.Mesh;
  private capsules: THREE.Group[] = [];
  private contactShadow!: THREE.Mesh;
  private glowRing!: THREE.Mesh;

  constructor() {
    super();
    this.name = 'SmartPillStation';
    this.buildStation();
  }

  private buildStation() {
    // 1. Base Pedestal (Primary silhouette)
    const baseGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.04, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.02;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.add(baseMesh);

    // 2. Metallic Accent Ring (Secondary detail)
    const ringGeo = new THREE.TorusGeometry(0.19, 0.012, 16, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Cyan glow
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x0891b2,
      emissiveIntensity: 0.4,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.04;
    this.add(ringMesh);

    // 3. Glowing Status Ring Indicator
    const glowGeo = new THREE.RingGeometry(0.14, 0.17, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x10b981, // Emerald active
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    this.glowRing = new THREE.Mesh(glowGeo, glowMat);
    this.glowRing.rotation.x = -Math.PI / 2;
    this.glowRing.position.y = 0.041;
    this.add(this.glowRing);

    // 4. Glass Bottle Cylinder (Translucent medical vial)
    const bottleGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.26, 32, 1, true);
    const bottleMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transmission: 0.92,
      opacity: 0.85,
      transparent: true,
      roughness: 0.05,
      ior: 1.5,
      thickness: 0.04,
      metalness: 0.1,
    });
    const bottleMesh = new THREE.Mesh(bottleGeo, bottleMat);
    bottleMesh.position.y = 0.17;
    this.add(bottleMesh);

    // 5. Bottle Shoulder & Neck
    const neckGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.05, 32);
    const neckMat = bottleMat.clone();
    const neckMesh = new THREE.Mesh(neckGeo, neckMat);
    neckMesh.position.y = 0.32;
    this.add(neckMesh);

    // 6. Bottle Cap (Threaded Metal)
    const capGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.06, 32);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x0d9488, // CureX Teal
      metalness: 0.7,
      roughness: 0.3,
    });
    this.capMesh = new THREE.Mesh(capGeo, capMat);
    this.capMesh.position.y = 0.375;
    this.capMesh.castShadow = true;
    this.add(this.capMesh);

    // 7. Cap Accent Cross (Embossed medical badge)
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const crossBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.008, 0.015), crossMat);
    const crossBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.008, 0.045), crossMat);
    crossBar1.position.y = 0.406;
    crossBar2.position.y = 0.406;
    this.add(crossBar1, crossBar2);

    // 8-10. Floating Interactive Pill Capsules inside vial
    const pillColors = [
      { top: 0x06b6d4, btm: 0xffffff }, // Cyan / White
      { top: 0x10b981, btm: 0xffffff }, // Emerald / White
      { top: 0xef4444, btm: 0xfef08a }, // Crimson / Gold
      { top: 0x7c3aed, btm: 0xffffff }, // Purple / White
    ];

    pillColors.forEach((cols, i) => {
      const capsule = this.createCapsule(cols.top, cols.btm);
      const angle = (i * Math.PI) / 2 + 0.4;
      const radius = 0.045;
      capsule.position.set(Math.cos(angle) * radius, 0.12 + i * 0.035, Math.sin(angle) * radius);
      capsule.rotation.set(0.2 * i, angle, 0.3 * (i % 2 === 0 ? 1 : -1));
      this.capsules.push(capsule);
      this.add(capsule);
    });

    // 11. Soft Radial Contact Shadow Plane directly beneath object
    const shadowGeo = new THREE.PlaneGeometry(0.48, 0.48);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const gradient = sCtx.createRadialGradient(64, 64, 0, 64, 64, 60);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = gradient;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    });
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.001;
    this.add(this.contactShadow);
  }

  private createCapsule(topHex: number, btmHex: number): THREE.Group {
    const group = new THREE.Group();
    const radius = 0.016;
    const bodyLen = 0.024;

    const topMat = new THREE.MeshStandardMaterial({
      color: topHex,
      roughness: 0.15,
      metalness: 0.1,
    });
    const btmMat = new THREE.MeshStandardMaterial({
      color: btmHex,
      roughness: 0.15,
      metalness: 0.1,
    });

    // Top Dome
    const topDome = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), topMat);
    topDome.position.y = bodyLen / 2;
    group.add(topDome);

    // Top Half Cylinder
    const topCyl = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, bodyLen / 2, 16), topMat);
    topCyl.position.y = bodyLen / 4;
    group.add(topCyl);

    // Bottom Half Cylinder
    const btmCyl = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, bodyLen / 2, 16), btmMat);
    btmCyl.position.y = -bodyLen / 4;
    group.add(btmCyl);

    // Bottom Dome
    const btmDome = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 16, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      btmMat
    );
    btmDome.position.y = -bodyLen / 2;
    group.add(btmDome);

    return group;
  }

  public update(time: number) {
    // Gentle floating bob for capsules
    this.capsules.forEach((cap, idx) => {
      cap.rotation.y += 0.015 * (idx % 2 === 0 ? 1 : -1);
      cap.position.y += Math.sin(time * 2 + idx) * 0.0003;
    });

    // Glow pulse on the status ring
    if (this.glowRing) {
      const mat = this.glowRing.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 + Math.sin(time * 3) * 0.25;
    }
  }

  // Dispense animation triggered when medication taken
  public triggerDispenseAnimation() {
    const cap = this.capMesh;
    const startY = cap.position.y;
    let progress = 0;

    const anim = () => {
      progress += 0.08;
      if (progress < Math.PI) {
        cap.position.y = startY + Math.sin(progress) * 0.04;
        requestAnimationFrame(anim);
      } else {
        cap.position.y = startY;
      }
    };
    anim();
  }
}
