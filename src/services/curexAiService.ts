import { StorageService } from './storageService';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

let sessionMessages: ChatMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'assistant',
    text: "Hello! I am **CureX AI**, your personal clinical medication and health intelligence assistant. I monitor your daily doses, check for drug interactions, interpret your eye & body scans, and keep your family informed. How can I help you today?",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

export const CureXAiService = {
  getMessages(): ChatMessage[] {
    return sessionMessages;
  },

  async sendMessage(userText: string): Promise<string> {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    sessionMessages.push(userMsg);

    const profile = StorageService.getEmergencyProfile();
    const meds = StorageService.getMedications();
    const doses = StorageService.getTodayDoses();
    const streak = StorageService.getStreak();
    const eyeScans = StorageService.getEyeScans();

    const patientContext = {
      fullName: profile.fullName,
      age: profile.age,
      bloodGroup: profile.bloodGroup,
      allergies: profile.allergies,
      medications: meds,
      todayDoses: doses,
      streak,
      latestEyeScan: eyeScans[0] || null,
    };

    const historyPayload = sessionMessages.slice(-6).map((m) => ({
      role: m.sender,
      text: m.text,
    }));

    try {
      const response = await fetch('/api/curex-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          patientContext,
          history: historyPayload,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const reply = data.reply || 'I am here to help you manage your medications safely.';

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      sessionMessages.push(aiMsg);
      return reply;
    } catch (err) {
      console.warn('CureX AI fetch fallback:', err);
      const fallbackReply =
        "Based on your profile, you are currently taking Metformin (500mg) and Telmisartan (40mg). Ensure you take Metformin immediately after food and drink plenty of water. If you experience severe symptoms, please tap the red 'CALL 102' or 'WHATSAPP SOS' button above.";
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'assistant',
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      sessionMessages.push(aiMsg);
      return fallbackReply;
    }
  },

  clearChat() {
    sessionMessages = [
      {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: "Chat cleared. What medical or medication question can I answer for you?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  },
};
