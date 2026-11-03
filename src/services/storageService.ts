import { Medication, DoseRecord, Badge, EmergencyProfile, EyeScanResult, BodyScanResult, GoogleDocExportInfo } from '../types';

const STORAGE_KEYS = {
  MEDS: 'curex_medications',
  DOSES: 'curex_daily_doses',
  STREAK: 'curex_streak_count',
  BADGES: 'curex_badges',
  EMERGENCY: 'curex_emergency_profile',
  EYE_SCANS: 'curex_eye_scans',
  BODY_SCANS: 'curex_body_scans',
  DOC_EXPORT: 'curex_doc_export',
  KID_MODE: 'curex_kid_mode',
  LANGUAGE: 'curex_language',
  DARK_MODE: 'curex_dark_mode',
  BIOMETRIC_LOCKED: 'curex_biometric_locked',
  LAST_DATE: 'curex_last_date',
  DEVICE_PIN: 'curex_device_pin',
  PIN_LENGTH: 'curex_pin_length',
  SESSION_UNLOCKED: 'curex_session_unlocked',
};

const DEFAULT_MEDICATIONS: Medication[] = [
  {
    id: 'med-1',
    name: 'Metformin HCl',
    dosage: '500 mg',
    frequency: 'Twice daily',
    times: ['08:00', '20:00'],
    instructions: 'Take immediately with or after meals with a glass of water',
    purpose: 'Type 2 Diabetes Glycemic Control',
    category: 'diabetes',
    remainingTablets: 3, // Triggers "Only 3 tablets left, order soon!"
    totalTablets: 30,
    refillThreshold: 5,
    colorHex: '#0d9488',
  },
  {
    id: 'med-2',
    name: 'Telmisartan',
    dosage: '40 mg',
    frequency: 'Once daily (Morning)',
    times: ['08:30'],
    instructions: 'Take in the morning on an empty stomach or with breakfast',
    purpose: 'Essential Hypertension & Cardiac Protection',
    category: 'hypertension',
    remainingTablets: 18,
    totalTablets: 30,
    refillThreshold: 5,
    colorHex: '#0284c7',
  },
  {
    id: 'med-3',
    name: 'Atorvastatin Calcium',
    dosage: '20 mg',
    frequency: 'Once daily (Night)',
    times: ['21:30'],
    instructions: 'Take at bedtime. Avoid grapefruit products.',
    purpose: 'Hyperlipidemia & Atherosclerosis Prevention',
    category: 'cardiac',
    remainingTablets: 22,
    totalTablets: 30,
    refillThreshold: 5,
    colorHex: '#7c3aed',
  },
  {
    id: 'med-4',
    name: 'Amoxicillin Trihydrate',
    dosage: '250 mg',
    frequency: 'Three times daily',
    times: ['09:00', '15:00', '21:00'],
    instructions: 'Complete full antibiotic course even if feeling better',
    purpose: 'Bacterial Infection Therapy',
    category: 'antibiotic',
    remainingTablets: 14,
    totalTablets: 21,
    refillThreshold: 5,
    colorHex: '#ea580c',
  },
  {
    id: 'med-5',
    name: 'Vitamin D3 (Cholecalciferol)',
    dosage: '60,000 IU',
    frequency: 'Weekly (Sundays)',
    times: ['10:00'],
    instructions: 'Take with whole milk or a meal containing healthy fats',
    purpose: 'Bone Density & Immune Modulation',
    category: 'vitamin',
    remainingTablets: 4,
    totalTablets: 8,
    refillThreshold: 2,
    colorHex: '#eab308',
  },
];

const DEFAULT_BADGES: Badge[] = [
  {
    id: 'badge-1',
    title: 'Medication Hero 🦸',
    description: 'Took all medications on time for 7 days in a row!',
    icon: '🦸',
    unlocked: true,
    unlockedAt: '2 days ago',
  },
  {
    id: 'badge-2',
    title: 'Punctual Patient ⏰',
    description: 'Took dose within 10 minutes of scheduled alarm.',
    icon: '⏰',
    unlocked: true,
    unlockedAt: 'Yesterday',
  },
  {
    id: 'badge-3',
    title: 'Eye Health Scout 👁️',
    description: 'Completed your first biometric sclera and pallor scan.',
    icon: '👁️',
    unlocked: true,
    unlockedAt: 'Today',
  },
  {
    id: 'badge-4',
    title: 'Hydration Buddy 💧',
    description: 'Drank a full glass of water with each medication.',
    icon: '💧',
    unlocked: true,
    unlockedAt: '3 days ago',
  },
  {
    id: 'badge-5',
    title: '30-Day Master 🏆',
    description: 'Achieved 95%+ adherence for a full calendar month.',
    icon: '🏆',
    unlocked: false,
  },
];

const DEFAULT_EMERGENCY: EmergencyProfile = {
  fullName: 'Rajesh Sharma',
  age: 68,
  bloodGroup: 'O Positive (O+)',
  allergies: ['Penicillin (Moderate rash)', 'Sulfa drugs (Hives)', 'Shellfish'],
  chronicConditions: ['Type 2 Diabetes Mellitus (HbA1c: 6.8%)', 'Primary Hypertension (132/84 mmHg)'],
  emergencyContactName: 'Chayanika Sharma (Daughter)',
  emergencyContactPhone: '+91 98765 43210',
  familyContactName: 'Aarav Sharma (Son)',
  familyContactPhone: '+91 98112 23344',
  doctorName: 'Dr. Vivek Malhotra, MD (Cardiologist)',
  doctorPhone: '+91 98223 34455',
  hospitalPreference: 'Max Super Speciality Hospital / Apollo Healthcare',
  organDonor: true,
};

export const StorageService = {
  getMedications(): Medication[] {
    const data = localStorage.getItem(STORAGE_KEYS.MEDS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.MEDS, JSON.stringify(DEFAULT_MEDICATIONS));
      return DEFAULT_MEDICATIONS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_MEDICATIONS;
    }
  },

  saveMedications(meds: Medication[]) {
    localStorage.setItem(STORAGE_KEYS.MEDS, JSON.stringify(meds));
  },

  addMedication(med: Medication) {
    const list = this.getMedications();
    list.unshift(med);
    this.saveMedications(list);
    this.regenerateDosesForToday();
  },

  updateMedication(med: Medication) {
    const list = this.getMedications().map((m) => (m.id === med.id ? med : m));
    this.saveMedications(list);
  },

  getTodayDoses(): DoseRecord[] {
    const today = new Date().toISOString().slice(0, 10);
    const lastDate = localStorage.getItem(STORAGE_KEYS.LAST_DATE);
    let doses: DoseRecord[] = [];

    const data = localStorage.getItem(STORAGE_KEYS.DOSES);
    if (data && lastDate === today) {
      try {
        doses = JSON.parse(data);
      } catch {
        doses = [];
      }
    }

    if (!doses || doses.length === 0 || lastDate !== today) {
      doses = this.generateDosesForToday();
      localStorage.setItem(STORAGE_KEYS.LAST_DATE, today);
      localStorage.setItem(STORAGE_KEYS.DOSES, JSON.stringify(doses));
    }
    return doses;
  },

  saveTodayDoses(doses: DoseRecord[]) {
    localStorage.setItem(STORAGE_KEYS.DOSES, JSON.stringify(doses));
  },

  generateDosesForToday(): DoseRecord[] {
    const meds = this.getMedications();
    const records: DoseRecord[] = [];
    meds.forEach((m) => {
      m.times.forEach((timeStr, idx) => {
        records.push({
          id: `dose-${m.id}-${idx}`,
          medicationId: m.id,
          medicationName: m.name,
          scheduledTime: timeStr,
          status: 'pending',
        });
      });
    });
    // Sort chronologically
    records.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    return records;
  },

  regenerateDosesForToday() {
    const current = this.getTodayDoses();
    const generated = this.generateDosesForToday();
    // preserve existing statuses
    const merged = generated.map((gen) => {
      const existing = current.find((c) => c.medicationId === gen.medicationId && c.scheduledTime === gen.scheduledTime);
      return existing || gen;
    });
    this.saveTodayDoses(merged);
  },

  markDose(doseId: string, status: 'taken' | 'skipped' | 'snoozed', notes?: string) {
    const doses = this.getTodayDoses();
    const dose = doses.find((d) => d.id === doseId);
    if (!dose) return;

    dose.status = status;
    dose.takenAt = status === 'taken' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined;
    if (notes) dose.notes = notes;

    this.saveTodayDoses(doses);

    // If taken, decrement medication tablet count
    if (status === 'taken') {
      const meds = this.getMedications();
      const med = meds.find((m) => m.id === dose.medicationId);
      if (med && med.remainingTablets > 0) {
        med.remainingTablets -= 1;
        this.saveMedications(meds);
      }
      this.checkAndIncrementStreak();
    }
  },

  getStreak(): number {
    const count = localStorage.getItem(STORAGE_KEYS.STREAK);
    return count ? parseInt(count, 10) : 7; // Default 7-day streak for "Medication Hero 🦸"
  },

  setStreak(val: number) {
    localStorage.setItem(STORAGE_KEYS.STREAK, val.toString());
  },

  checkAndIncrementStreak() {
    const doses = this.getTodayDoses();
    const allTaken = doses.every((d) => d.status === 'taken' || d.status === 'skipped');
    if (allTaken) {
      const current = this.getStreak();
      this.setStreak(current + 1);
    }
  },

  getBadges(): Badge[] {
    const data = localStorage.getItem(STORAGE_KEYS.BADGES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(DEFAULT_BADGES));
      return DEFAULT_BADGES;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_BADGES;
    }
  },

  unlockBadge(badgeId: string) {
    const badges = this.getBadges();
    const badge = badges.find((b) => b.id === badgeId);
    if (badge && !badge.unlocked) {
      badge.unlocked = true;
      badge.unlockedAt = 'Just now';
      localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
    }
  },

  getEmergencyProfile(): EmergencyProfile {
    const data = localStorage.getItem(STORAGE_KEYS.EMERGENCY);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.EMERGENCY, JSON.stringify(DEFAULT_EMERGENCY));
      return DEFAULT_EMERGENCY;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_EMERGENCY;
    }
  },

  saveEmergencyProfile(profile: EmergencyProfile) {
    localStorage.setItem(STORAGE_KEYS.EMERGENCY, JSON.stringify(profile));
  },

  getEyeScans(): EyeScanResult[] {
    const data = localStorage.getItem(STORAGE_KEYS.EYE_SCANS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  addEyeScan(scan: EyeScanResult) {
    const list = this.getEyeScans();
    list.unshift(scan);
    if (list.length > 20) list.pop();
    localStorage.setItem(STORAGE_KEYS.EYE_SCANS, JSON.stringify(list));
  },

  getBodyScans(): BodyScanResult[] {
    const data = localStorage.getItem(STORAGE_KEYS.BODY_SCANS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  addBodyScan(scan: BodyScanResult) {
    const list = this.getBodyScans();
    list.unshift(scan);
    if (list.length > 20) list.pop();
    localStorage.setItem(STORAGE_KEYS.BODY_SCANS, JSON.stringify(list));
  },

  getDocExportInfo(): GoogleDocExportInfo | null {
    const data = localStorage.getItem(STORAGE_KEYS.DOC_EXPORT);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  saveDocExportInfo(info: GoogleDocExportInfo) {
    localStorage.setItem(STORAGE_KEYS.DOC_EXPORT, JSON.stringify(info));
  },

  isKidMode(): boolean {
    return localStorage.getItem(STORAGE_KEYS.KID_MODE) === 'true';
  },

  setKidMode(enabled: boolean) {
    localStorage.setItem(STORAGE_KEYS.KID_MODE, enabled ? 'true' : 'false');
  },

  getLanguage(): 'en' | 'hi' {
    return (localStorage.getItem(STORAGE_KEYS.LANGUAGE) as 'en' | 'hi') || 'en';
  },

  setLanguage(lang: 'en' | 'hi') {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  },

  isDarkMode(): boolean {
    const val = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    return val === null ? true : val === 'true'; // Dark mode default for medical contrast
  },

  setDarkMode(enabled: boolean) {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, enabled ? 'true' : 'false');
  },

  isBiometricLocked(): boolean {
    return localStorage.getItem(STORAGE_KEYS.BIOMETRIC_LOCKED) === 'true';
  },

  setBiometricLocked(locked: boolean) {
    localStorage.setItem(STORAGE_KEYS.BIOMETRIC_LOCKED, locked ? 'true' : 'false');
  },

  // --- DEVICE-SPECIFIC SECURITY PIN (4 or 6 DIGITS) ---
  hasConfiguredPin(): boolean {
    return Boolean(localStorage.getItem(STORAGE_KEYS.DEVICE_PIN));
  },

  getPinLength(): 4 | 6 {
    const len = parseInt(localStorage.getItem(STORAGE_KEYS.PIN_LENGTH) || '4', 10);
    return len === 6 ? 6 : 4;
  },

  setDevicePin(pin: string, length: 4 | 6) {
    localStorage.setItem(STORAGE_KEYS.DEVICE_PIN, pin);
    localStorage.setItem(STORAGE_KEYS.PIN_LENGTH, length.toString());
    this.unlockSession();
  },

  verifyDevicePin(pin: string): boolean {
    const saved = localStorage.getItem(STORAGE_KEYS.DEVICE_PIN);
    return saved === pin;
  },

  isSessionUnlocked(): boolean {
    // If no pin has ever been configured, they must configure it first
    if (!this.hasConfiguredPin()) return false;
    return sessionStorage.getItem(STORAGE_KEYS.SESSION_UNLOCKED) === 'true';
  },

  unlockSession() {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_UNLOCKED, 'true');
    this.setBiometricLocked(false);
  },

  lockSession() {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_UNLOCKED);
    this.setBiometricLocked(true);
  },

  resetPin() {
    localStorage.removeItem(STORAGE_KEYS.DEVICE_PIN);
    localStorage.removeItem(STORAGE_KEYS.PIN_LENGTH);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_UNLOCKED);
  },
};
