export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string; // e.g. "Twice a day"
  times: string[]; // e.g. ["08:00", "20:00"]
  instructions: string; // e.g. "Take after food with water"
  purpose: string; // e.g. "Blood pressure control"
  category: 'hypertension' | 'diabetes' | 'antibiotic' | 'vitamin' | 'cardiac' | 'pain';
  remainingTablets: number;
  totalTablets: number;
  refillThreshold: number;
  colorHex: string;
}

export interface DoseRecord {
  id: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string; // "08:00 AM"
  status: 'pending' | 'taken' | 'skipped' | 'snoozed';
  takenAt?: string;
  notes?: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface EmergencyProfile {
  fullName: string;
  age: number;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  familyContactName: string;
  familyContactPhone: string;
  doctorName: string;
  doctorPhone: string;
  hospitalPreference: string;
  organDonor: boolean;
}

export interface EyeScanResult {
  id: string;
  timestamp: string;
  scleraHealth: 'Clear (Normal)' | 'Mild Icterus (Yellowing)' | 'Subconjunctival Irritation';
  bilirubinRisk: 'Low' | 'Moderate' | 'Elevated';
  conjunctivalPallor: 'Healthy Pink' | 'Borderline Pallor' | 'Pale (Suspected Anemia)';
  anemiaRisk: 'Normal (Hb > 12 g/dL)' | 'Mild Anemia Risk' | 'Moderate Anemia Risk';
  pupilReactivity: 'Normal Light Reflex' | 'Sluggish' | 'Symmetric';
  fatigueIndex: number; // 0-100%
  overallScore: number; // 0-100%
  recommendation: string;
}

export interface BodyScanResult {
  id: string;
  timestamp: string;
  heartRateBpm: number;
  respiratoryRate: number;
  bodyTemperatureC: number;
  postureScore: number; // 0-100%
  fatigueLevel: 'Low' | 'Moderate' | 'High';
  suddenChangeDetected: boolean;
  alertNote?: string;
}

export interface GoogleDocExportInfo {
  docId: string;
  docUrl: string;
  title: string;
  lastSyncedAt: string;
  encryptedHash: string;
}
