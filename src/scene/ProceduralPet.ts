import * as THREE from 'three';

export class ProceduralPet extends THREE.Group {
  private headGroup!: THREE.Group;
  private leftEar!: THREE.Mesh;
  private rightEar!: THREE.Mesh;
  private tail!: THREE.Mesh;
  private leftEyePupil!: THREE.Mesh;
  private rightEyePupil!: THREE.Mesh;
  private isCelebrating = false;
  private celebrationTimer = 0;
  private baseHeight = 0;

  constructor() {
    super();
    this.name = 'DrPawsPetCompanion';
    this.buildPet();
  }

  private buildPet() {
    // Primary Body Material (Soft warm cream puppy body)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5, // Warm cream
      roughness: 0.6,
      metalness: 0.05,
    });

    // Accent Material (Cute honey-caramel ears & patches)
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xf97316, // Caramel orange
      roughness: 0.65,
      metalness: 0.05,
    });

    // Medical Collar Material (Cyan teal)
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.2,
      metalness: 0.6,
    });

    // 1. Torso (Capsule/Oblong body)
    const bodyGeo = new THREE.SphereGeometry(0.12, 24, 20);
    bodyGeo.scale(1, 0.9, 1.3);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.16;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.add(bodyMesh);

    // 2. Collar & Medical Cross Pendant
    const collarGeo = new THREE.TorusGeometry(0.1, 0.015, 12, 32);
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.rotation.x = Math.PI / 2.3;
    collarMesh.position.set(0, 0.23, 0.1);
    this.add(collarMesh);

    // Collar Badge
    const badgeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.005, 16);
    const badgeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Emerald medical cross badge
      emissive: 0x10b981,
      emissiveIntensity: 0.5,
    });
    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
    badgeMesh.rotation.x = Math.PI / 2;
    badgeMesh.position.set(0, 0.18, 0.2);
    this.add(badgeMesh);

    // 3. Four Paws
    const pawGeo = new THREE.SphereGeometry(0.04, 16, 12);
    pawGeo.scale(1, 0.6, 1.2);
    const pawPositions = [
      [-0.09, 0.03, 0.1],
      [0.09, 0.03, 0.1],
      [-0.09, 0.03, -0.1],
      [0.09, 0.03, -0.1],
    ];
    pawPositions.forEach(([x, y, z]) => {
      const paw = new THREE.Mesh(pawGeo, accentMat);
      paw.position.set(x, y, z);
      paw.castShadow = true;
      this.add(paw);
    });

    // 4. Tail (Wagging cylinder/cone)
    const tailGeo = new THREE.ConeGeometry(0.022, 0.14, 16);
    this.tail = new THREE.Mesh(tailGeo, accentMat);
    this.tail.position.set(0, 0.2, -0.16);
    this.tail.rotation.x = -Math.PI / 3;
    this.add(this.tail);

    // 5. Head Group (Rotates and bobs)
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.3, 0.12);

    const headGeo = new THREE.SphereGeometry(0.11, 24, 20);
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Snout
    const snoutGeo = new THREE.SphereGeometry(0.05, 16, 14);
    snoutGeo.scale(1, 0.7, 1.2);
    const snoutMesh = new THREE.Mesh(snoutGeo, bodyMat);
    snoutMesh.position.set(0, -0.02, 0.1);
    this.headGroup.add(snoutMesh);

    // Nose (Shiny black)
    const noseGeo = new THREE.SphereGeometry(0.018, 12, 10);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.1,
      metalness: 0.2,
    });
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    noseMesh.position.set(0, 0.005, 0.16);
    this.headGroup.add(noseMesh);

    // Big Cartoon Eyes
    const eyeGeo = new THREE.SphereGeometry(0.024, 16, 12);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    leftEye.position.set(-0.045, 0.025, 0.09);
    this.leftEyePupil = new THREE.Mesh(new THREE.SphereGeometry(0.013, 12, 8), pupilMat);
    this.leftEyePupil.position.set(-0.045, 0.025, 0.11);
    this.headGroup.add(leftEye, this.leftEyePupil);

    const rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    rightEye.position.set(0.045, 0.025, 0.09);
    this.rightEyePupil = new THREE.Mesh(new THREE.SphereGeometry(0.013, 12, 8), pupilMat);
    this.rightEyePupil.position.set(0.045, 0.025, 0.11);
    this.headGroup.add(rightEye, this.rightEyePupil);

    // Floppy Caramel Ears
    const earGeo = new THREE.CapsuleGeometry(0.025, 0.09, 8, 16);
    this.leftEar = new THREE.Mesh(earGeo, accentMat);
    this.leftEar.position.set(-0.095, 0.04, 0.01);
    this.leftEar.rotation.z = Math.PI / 4;
    this.leftEar.rotation.x = 0.2;
    this.headGroup.add(this.leftEar);

    this.rightEar = new THREE.Mesh(earGeo, accentMat);
    this.rightEar.position.set(0.095, 0.04, 0.01);
    this.rightEar.rotation.z = -Math.PI / 4;
    this.rightEar.rotation.x = 0.2;
    this.headGroup.add(this.rightEar);

    this.add(this.headGroup);

    // Contact shadow beneath pet
    const shadowGeo = new THREE.PlaneGeometry(0.4, 0.4);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const sCtx = shadowCanvas.getContext('2d')!;
    const gradient = sCtx.createRadialGradient(32, 32, 0, 32, 32, 28);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = gradient;
    sCtx.fillRect(0, 0, 64, 64);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    this.add(shadow);
  }

  public update(time: number) {
    if (this.isCelebrating) {
      this.celebrationTimer += 0.06;
      const jumpHeight = Math.abs(Math.sin(this.celebrationTimer * 4)) * 0.12;
      this.position.y = this.baseHeight + jumpHeight;
      this.rotation.y += 0.1;
      this.tail.rotation.z = Math.sin(time * 25) * 0.6; // Super fast wagging
      this.leftEar.rotation.z = Math.PI / 4 + Math.sin(time * 15) * 0.2;
      this.rightEar.rotation.z = -Math.PI / 4 - Math.sin(time * 15) * 0.2;

      if (this.celebrationTimer > Math.PI * 2) {
        this.isCelebrating = false;
        this.position.y = this.baseHeight;
        this.rotation.y = 0;
      }
      return;
    }

    // Idle Animations:
    // 1. Tail wag
    this.tail.rotation.z = Math.sin(time * 8) * 0.35;
    this.tail.rotation.y = Math.cos(time * 8) * 0.2;

    // 2. Head gentle tilting and looking around
    this.headGroup.rotation.y = Math.sin(time * 1.5) * 0.15;
    this.headGroup.rotation.z = Math.cos(time * 1.2) * 0.08;
    this.headGroup.position.y = 0.3 + Math.sin(time * 3) * 0.005;

    // 3. Ear wiggles
    this.leftEar.rotation.x = 0.2 + Math.sin(time * 2) * 0.08;
    this.rightEar.rotation.x = 0.2 + Math.cos(time * 2) * 0.08;
  }

  public celebrateDose() {
    this.isCelebrating = true;
    this.celebrationTimer = 0;
  }
}
