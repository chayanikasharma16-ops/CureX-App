import { EyeScanResult, BodyScanResult, Medication } from '../types';
import { StorageService } from './storageService';
import { AudioService } from './audioService';

export const HealthScannerService = {
  // Simulated computer-vision eye biometric analysis
  async analyzeEyeFrame(imageSource?: HTMLCanvasElement | HTMLVideoElement): Promise<EyeScanResult> {
    AudioService.playScanBeep();
    // Simulate multi-point optical scan processing delay
    await new Promise((res) => setTimeout(res, 1200));

    // Calculate metrics with realistic variance
    const rand = Math.random();
    const fatigue = Math.floor(18 + rand * 32); // 18% - 50%
    const score = Math.floor(88 + (1 - rand) * 10); // 88% - 98%

    const result: EyeScanResult = {
      id: `eye-scan-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      scleraHealth: 'Clear (Normal)',
      bilirubinRisk: 'Low',
      conjunctivalPallor: 'Healthy Pink',
      anemiaRisk: 'Normal (Hb > 12 g/dL)',
      pupilReactivity: 'Normal Light Reflex',
      fatigueIndex: fatigue,
      overallScore: score,
      recommendation:
        fatigue > 35
          ? 'Mild ocular fatigue detected. Consider the 20-20-20 screen rule and ensure proper hydration when taking medication.'
          : 'Excellent eye biomarkers. Sclera is clear with zero signs of jaundice; conjunctival vascularity indicates healthy hemoglobin levels.',
    };

    StorageService.addEyeScan(result);
    StorageService.unlockBadge('badge-3'); // Eye Health Scout badge
    return result;
  },

  // Body vital & posture scanning
  async analyzeBodyVitals(previousScan?: BodyScanResult | null): Promise<BodyScanResult> {
    AudioService.playScanBeep();
    await new Promise((res) => setTimeout(res, 1000));

    const baseHeartRate = 72;
    const hrNoise = Math.floor(Math.random() * 12) - 5;
    const heartRate = baseHeartRate + hrNoise;

    const baseTemp = 36.8;
    const tempNoise = (Math.random() * 0.4 - 0.2);
    const bodyTemperature = Number((baseTemp + tempNoise).toFixed(1));

    const postureScore = Math.floor(82 + Math.random() * 16);
    const respiratoryRate = 16 + Math.floor(Math.random() * 4);

    let suddenChangeDetected = false;
    let alertNote: string | undefined = undefined;

    if (previousScan) {
      const hrDiff = Math.abs(heartRate - previousScan.heartRateBpm);
      if (hrDiff >= 15) {
        suddenChangeDetected = true;
        alertNote = `Sudden heart rate fluctuation detected (+${hrDiff} bpm). Monitoring cardiac stability.`;
      }
    }

    const result: BodyScanResult = {
      id: `body-scan-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      heartRateBpm: heartRate,
      respiratoryRate,
      bodyTemperatureC: bodyTemperature,
      postureScore,
      fatigueLevel: postureScore < 85 ? 'Moderate' : 'Low',
      suddenChangeDetected,
      alertNote,
    };

    StorageService.addBodyScan(result);
    return result;
  },

  // Medicine Strip OCR & Auto-add
  async parseMedicineStripText(recognizedText: string): Promise<Medication> {
    AudioService.playScanBeep();

    // Known drug dictionary matching for high accuracy
    const lower = recognizedText.toLowerCase();

    let name = 'Paracetamol Extra';
    let dosage = '650 mg';
    let frequency = 'Twice daily as needed';
    let times = ['08:00', '20:00'];
    let instructions = 'Take after meals with water. Do not exceed 4000mg/day.';
    let purpose = 'Analgesic & Antipyretic Pain/Fever Relief';
    let category: Medication['category'] = 'pain';
    let colorHex = '#ef4444';

    if (lower.includes('metformin') || lower.includes('glycomet')) {
      name = 'Metformin Hydrochloride';
      dosage = '500 mg';
      frequency = 'Twice daily with meals';
      times = ['08:00', '20:00'];
      instructions = 'Take with or immediately after food to reduce gastric upset';
      purpose = 'Type 2 Diabetes Glycemic Control';
      category = 'diabetes';
      colorHex = '#0d9488';
    } else if (lower.includes('atorvastatin') || lower.includes('lipitor')) {
      name = 'Atorvastatin Calcium';
      dosage = '20 mg';
      frequency = 'Once daily at bedtime';
      times = ['21:30'];
      instructions = 'Take at night. Avoid grapefruit juice.';
      purpose = 'Cholesterol & Lipid Regulation';
      category = 'cardiac';
      colorHex = '#7c3aed';
    } else if (lower.includes('amoxicillin') || lower.includes('mox')) {
      name = 'Amoxicillin Trihydrate';
      dosage = '500 mg';
      frequency = 'Three times daily';
      times = ['08:00', '14:00', '20:00'];
      instructions = 'Complete full prescribed course. Take evenly spaced.';
      purpose = 'Broad Spectrum Bacterial Anti-infective';
      category = 'antibiotic';
      colorHex = '#ea580c';
    } else if (lower.includes('telmisartan') || lower.includes('telma')) {
      name = 'Telmisartan Tablet';
      dosage = '40 mg';
      frequency = 'Once daily (Morning)';
      times = ['08:30'];
      instructions = 'Take consistently each morning';
      purpose = 'Arterial Hypertension Management';
      category = 'hypertension';
      colorHex = '#0284c7';
    } else if (lower.includes('cetirizine') || lower.includes('cetzine')) {
      name = 'Cetirizine Hydrochloride';
      dosage = '10 mg';
      frequency = 'Once daily at night';
      times = ['21:00'];
      instructions = 'Take at bedtime. May cause mild drowsiness.';
      purpose = 'Allergic Rhinitis & Antihistamine';
      category = 'pain';
      colorHex = '#06b6d4';
    } else if (lower.includes('vitamin') || lower.includes('cholecalciferol') || lower.includes('d3')) {
      name = 'Cholecalciferol (Vitamin D3)';
      dosage = '60,000 IU';
      frequency = 'Once weekly';
      times = ['10:00'];
      instructions = 'Take with dietary fats or full-fat milk for optimal absorption';
      purpose = 'Bone Health & Calcium Homeostasis';
      category = 'vitamin';
      colorHex = '#eab308';
    }

    const newMed: Medication = {
      id: `med-scan-${Date.now()}`,
      name,
      dosage,
      frequency,
      times,
      instructions,
      purpose,
      category,
      remainingTablets: 10,
      totalTablets: 10,
      refillThreshold: 3,
      colorHex,
    };

    StorageService.addMedication(newMed);
    return newMed;
  },
};
