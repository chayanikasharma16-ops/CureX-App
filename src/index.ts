import * as THREE from 'three';
import * as xb from 'xrblocks';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { ProceduralPillStation } from './scene/ProceduralPillStation';
import { ProceduralPet } from './scene/ProceduralPet';
import { ProceduralScannerRing } from './scene/ProceduralScannerRing';
import { AndroidAppUi } from './ui/AndroidAppUi';
import { StorageService } from './services/storageService';
import { AudioService } from './services/audioService';

class CureXScene extends xb.Script {
  private pillStation!: ProceduralPillStation;
  private petCompanion!: ProceduralPet;
  private scannerRing!: ProceduralScannerRing;
  private ui!: AndroidAppUi;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  init() {
    this.setupStudioLighting();
    this.build3DScene();
    this.setupInteractions();

    // Initialize 2D Android-style HUD overlay
    this.ui = new AndroidAppUi(
      // On dose taken
      () => {
        this.pillStation.triggerDispenseAnimation();
        this.petCompanion.celebrateDose();
      },
      // On scan trigger
      () => {
        this.scannerRing.startScanSequence(2500);
      },
      // On pet celebrate
      () => {
        this.petCompanion.celebrateDose();
      }
    );
  }

  private setupStudioLighting() {
    // 1. Studio Lighting Rig: Cool fill hemisphere + Warm key directional with soft shadow
    const hemiLight = new THREE.HemisphereLight(0xecfeff, 0x090d16, 2.6);
    this.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 3.2);
    keyLight.position.set(1.5, 3.5, 2.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.5);
    rimLight.position.set(-2, 2.5, -2);
    this.add(rimLight);

    // 2. Procedural Studio Reflection Environment
    const renderer = xb.core.renderer;
    if (renderer && renderer instanceof THREE.WebGLRenderer) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomScene = new RoomEnvironment();
      xb.core.scene.environment = pmrem.fromScene(roomScene, 0.04).texture;
      pmrem.dispose();
    }
  }

  private build3DScene() {
    // Ground level staging platform in front of user
    const userHeight = xb.user?.height || 1.6;
    const centerZ = -(xb.user?.objectDistance || 1.35);

    // 1. Procedural 3D Smart Pill Station & Dispensary
    this.pillStation = new ProceduralPillStation();
    this.pillStation.position.set(-0.45, userHeight - 0.45, centerZ);
    this.add(this.pillStation);

    // 2. Procedural 3D Holographic Biometric Scanner Ring
    this.scannerRing = new ProceduralScannerRing();
    this.scannerRing.position.set(0, userHeight - 0.5, centerZ - 0.15);
    this.add(this.scannerRing);

    // 3. Procedural 3D Animated Kid Pet Companion (Dr. Paws)
    this.petCompanion = new ProceduralPet();
    this.petCompanion.position.set(0.48, userHeight - 0.48, centerZ);
    this.add(this.petCompanion);
  }

  private setupInteractions() {
    window.addEventListener('pointerdown', (e) => {
      // If clicking inside the android shell UI, don't raycast 3D scene
      const shell = document.getElementById('curex-android-app');
      if (shell && shell.contains(e.target as Node)) {
        return;
      }

      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, xb.core.camera);
      const intersects = this.raycaster.intersectObjects([this.pillStation, this.petCompanion, this.scannerRing], true);

      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && obj.parent) {
          if (obj === this.pillStation) {
            this.pillStation.triggerDispenseAnimation();
            AudioService.playTakenSound();
            break;
          } else if (obj === this.petCompanion) {
            this.petCompanion.celebrateDose();
            AudioService.playKidCheer();
            break;
          } else if (obj === this.scannerRing) {
            this.scannerRing.startScanSequence(2500);
            AudioService.playScanBeep();
            break;
          }
          obj = obj.parent;
        }
      }
    });
  }

  // WebXR Pinch / Trigger Handling
  onSelectEnd(event: xb.SelectEvent) {
    // If pinching in XR, interact with 3D elements
    const controller = event.source?.controller;
    if (!controller) return;

    this.pillStation.triggerDispenseAnimation();
    this.petCompanion.celebrateDose();
    AudioService.playTakenSound();
  }

  update() {
    const time = performance.now() * 0.001;
    this.pillStation.update(time);
    this.petCompanion.update(time);
    this.scannerRing.update(time);

    // Dynamic repositioning if Kid mode toggled
    const isKid = StorageService.isKidMode();
    if (isKid) {
      this.petCompanion.position.x = THREE.MathUtils.lerp(this.petCompanion.position.x, 0.25, 0.05);
      this.petCompanion.position.z = THREE.MathUtils.lerp(this.petCompanion.position.z, -1.15, 0.05);
    } else {
      this.petCompanion.position.x = THREE.MathUtils.lerp(this.petCompanion.position.x, 0.48, 0.05);
      this.petCompanion.position.z = THREE.MathUtils.lerp(this.petCompanion.position.z, -1.35, 0.05);
    }
  }

  dispose() {
    // Clean up
    this.pillStation.clear();
    this.petCompanion.clear();
    this.scannerRing.clear();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const options = new xb.Options();
  options.setAppTitle('CureX');
  options.setAppDescription(
    'CureX Smart Medication & XR Health Assistant: reminders, eye & body scans, 102/WhatsApp emergency dispatch, kid companion, and Google Docs vault.'
  );
  options.enableHands();
  options.hands.visualization = true;
  options.simulator.defaultMode = xb.SimulatorMode.CONTROLLER;

  xb.add(new CureXScene());
  xb.init(options);
});
