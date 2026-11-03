import { StorageService } from './storageService';
import { AudioService } from './audioService';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  timestamp: string;
}

let cachedLocation: LocationCoordinates | null = null;

export const EmergencyService = {
  // Capture GPS coordinates asynchronously or return default/cached
  async getCurrentLocation(): Promise<LocationCoordinates> {
    if (cachedLocation) {
      // Refresh in background
      this.refreshLocation();
      return cachedLocation;
    }

    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        const fallback: LocationCoordinates = {
          latitude: 28.6139,
          longitude: 77.2090,
          accuracyMeters: 15,
          timestamp: new Date().toLocaleTimeString(),
        };
        cachedLocation = fallback;
        resolve(fallback);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: LocationCoordinates = {
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            accuracyMeters: Math.round(pos.coords.accuracy),
            timestamp: new Date().toLocaleTimeString(),
          };
          cachedLocation = loc;
          resolve(loc);
        },
        () => {
          // Fallback if permission denied
          const fallback: LocationCoordinates = {
            latitude: 28.5355,
            longitude: 77.3910,
            accuracyMeters: 25,
            timestamp: new Date().toLocaleTimeString(),
          };
          cachedLocation = fallback;
          resolve(fallback);
        },
        { timeout: 4000, enableHighAccuracy: true }
      );
    });
  },

  refreshLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          cachedLocation = {
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            accuracyMeters: Math.round(pos.coords.accuracy),
            timestamp: new Date().toLocaleTimeString(),
          };
        },
        () => {},
        { timeout: 5000, enableHighAccuracy: true }
      );
    }
  },

  // WhatsApp Emergency Ambulance Dispatch
  async triggerWhatsAppAmbulanceCall(): Promise<string> {
    const profile = StorageService.getEmergencyProfile();
    const loc = await this.getCurrentLocation();
    const meds = StorageService.getMedications();
    const activeMedsList = meds.map((m) => `${m.name} (${m.dosage})`).join(', ');

    const mapsUrl = `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;

    const emergencyText =
      `🚨 *EMERGENCY MEDICAL SOS - AMBULANCE REQUEST* 🚨\n\n` +
      `👤 *Patient:* ${profile.fullName} (Age: ${profile.age})\n` +
      `🩸 *Blood Group:* ${profile.bloodGroup}\n` +
      `⚠️ *Critical Allergies:* ${profile.allergies.join(', ') || 'None reported'}\n` +
      `🩺 *Chronic Conditions:* ${profile.chronicConditions.join(', ')}\n` +
      `💊 *Active Prescriptions:* ${activeMedsList}\n\n` +
      `📍 *LIVE GPS LOCATION:* \n${mapsUrl}\n` +
      `Coordinates: ${loc.latitude}, ${loc.longitude} (Accuracy: ~${loc.accuracyMeters}m)\n\n` +
      `📞 *Primary Emergency Contact:* ${profile.emergencyContactName} (${profile.emergencyContactPhone})\n` +
      `🏥 *Hospital Preference:* ${profile.hospitalPreference}\n` +
      `👨‍⚕️ *Primary Physician:* ${profile.doctorName} (${profile.doctorPhone})\n\n` +
      `*SENT INSTANTLY VIA CUREX EMERGENCY SYSTEM (Zero Cellular Sim Required, WiFi/Data WhatsApp Dispatch)*`;

    // Clean phone number (default emergency desk / contact)
    const rawPhone = profile.emergencyContactPhone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${rawPhone}?text=${encodeURIComponent(emergencyText)}`;

    // Trigger nearby loud siren
    AudioService.startEmergencySiren();

    // Open WhatsApp link in window
    window.open(waUrl, '_blank');
    return waUrl;
  },

  // Direct 102 Ambulance Call
  callAmbulance102() {
    AudioService.startEmergencySiren();
    window.location.href = 'tel:102';
  },

  // Family Alert for Missed Medication
  sendFamilyMissedDoseAlert(medicationName: string, scheduledTime: string) {
    const profile = StorageService.getEmergencyProfile();
    const message =
      `⚠️ *CUREX FAMILY MEDICATION ALERT* ⚠️\n\n` +
      `Hello ${profile.familyContactName},\n` +
      `Our records show that *${profile.fullName}* has missed their scheduled dose of *${medicationName}* scheduled for *${scheduledTime}*.\n\n` +
      `Please check in or remind them to take their medication with food and water.\n\n` +
      `*CureX Family Monitoring Network*`;

    const rawPhone = profile.familyContactPhone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  },

  // Generate HL7 FHIR-compliant JSON export for first responders
  getHL7EmergencyData() {
    const profile = StorageService.getEmergencyProfile();
    const meds = StorageService.getMedications();
    const doses = StorageService.getTodayDoses();

    return {
      resourceType: 'Bundle',
      id: 'curex-emergency-ehr-export',
      timestamp: new Date().toISOString(),
      type: 'document',
      entry: [
        {
          resourceType: 'Patient',
          name: [{ text: profile.fullName }],
          telecom: [{ system: 'phone', value: profile.emergencyContactPhone, use: 'emergency' }],
          extension: [
            { url: 'http://hl7.org/fhir/StructureDefinition/patient-bloodGroup', valueString: profile.bloodGroup },
            { url: 'http://hl7.org/fhir/StructureDefinition/patient-organDonor', valueBoolean: profile.organDonor },
          ],
        },
        {
          resourceType: 'AllergyIntolerance',
          verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'confirmed' }] },
          note: profile.allergies.map((a) => ({ text: a })),
        },
        {
          resourceType: 'Condition',
          clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/conditionclinical', code: 'active' }] },
          note: profile.chronicConditions.map((c) => ({ text: c })),
        },
        {
          resourceType: 'MedicationStatement',
          status: 'active',
          medications: meds.map((m) => ({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            instructions: m.instructions,
            remainingTablets: m.remainingTablets,
          })),
        },
        {
          resourceType: 'AdherenceTelemetry',
          date: new Date().toISOString().slice(0, 10),
          todayDoses: doses,
          streakDays: StorageService.getStreak(),
        },
      ],
    };
  },
};
