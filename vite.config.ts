import { defineConfig } from 'vite';
import { GoogleGenAI } from '@google/genai';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [
    {
      name: 'curex-ai-api-server',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/curex-ai' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              res.setHeader('Content-Type', 'application/json');
              try {
                const parsed = JSON.parse(body || '{}');
                const userMessage = parsed.message || '';
                const patientContext = parsed.patientContext || {};
                const chatHistory = parsed.history || [];

                const apiKey = process.env.GEMINI_API_KEY;
                if (!apiKey) {
                  // Fallback response if GEMINI_API_KEY is not set
                  res.statusCode = 200;
                  res.end(
                    JSON.stringify({
                      reply:
                        "Hello! I am CureX AI. I see you're asking about your medications. Based on your current prescriptions (Metformin 500mg, Telmisartan 40mg, Atorvastatin 20mg, Amoxicillin 250mg, Vitamin D3), always take your doses with food and stay hydrated. Connect your Gemini API key in Settings > Secrets for real-time generative clinical intelligence!",
                    })
                  );
                  return;
                }

                const ai = new GoogleGenAI({
                  apiKey,
                  httpOptions: {
                    headers: {
                      'User-Agent': 'aistudio-build',
                    },
                  },
                });

                const systemInstruction = `You are CureX AI, an empathetic, clinical-grade medical adherence and pharmacology assistant.
Your goal is to support patients, elderly users, and caregivers in maintaining 100% medication adherence and understanding their health.

Patient Profile:
- Name: ${patientContext.fullName || 'Rajesh Sharma'} (Age: ${patientContext.age || 68})
- Blood Group: ${patientContext.bloodGroup || 'O+'}
- Allergies: ${(patientContext.allergies || []).join(', ') || 'Penicillin, Sulfa'}
- Active Prescriptions: ${(patientContext.medications || []).map((m: any) => `${m.name} (${m.dosage}, ${m.frequency})`).join('; ') || 'Metformin HCl 500mg, Telmisartan 40mg, Atorvastatin 20mg, Amoxicillin 250mg, Vitamin D3 60,000 IU'}
- Current Adherence Streak: ${patientContext.streak || 7} Days in a Row ("Medication Hero 🦸")
- Latest Eye Biomarkers: Sclera: Normal/Clear, Pallor: Healthy Pink, Fatigue: 24%
- Latest Vitals: Heart Rate: 72 bpm, BP: 130/82 mmHg, Temp: 36.8°C

Guidelines:
1. Always check for contraindications or drug-drug interactions with the patient's active prescriptions and allergies (especially Penicillin!).
2. Be warm, reassuring, and concise (ideal for quick reading on mobile/XR).
3. Support both English and Hindi medical queries smoothly.
4. If a severe symptom (chest pain, acute breathlessness, stroke signs) is mentioned, immediately urge tapping the 102 Ambulance or WhatsApp SOS button.`;

                const contents: any[] = [];
                // Add conversation history
                if (Array.isArray(chatHistory)) {
                  chatHistory.forEach((turn: any) => {
                    contents.push({
                      role: turn.role === 'assistant' ? 'model' : 'user',
                      parts: [{ text: turn.text || turn.message }],
                    });
                  });
                }
                // Add current message
                contents.push({
                  role: 'user',
                  parts: [{ text: userMessage }],
                });

                const response = await ai.models.generateContent({
                  model: 'gemini-3.8-flash',
                  contents,
                  config: {
                    systemInstruction,
                  },
                });

                const reply = response.text || 'I am reviewing your medications. Please ensure you take them with adequate water and food.';
                res.statusCode = 200;
                res.end(JSON.stringify({ reply }));
              } catch (err: any) {
                console.error('CureX AI API error:', err);
                res.statusCode = 200;
                res.end(
                  JSON.stringify({
                    reply:
                      "I'm here to help with your medications and health telemetry! For your current prescription of Metformin and Telmisartan, remember to take your doses consistently after breakfast and dinner. If you have immediate medical concerns, please contact your doctor or use the 102 Ambulance button.",
                  })
                );
              }
            });
            return;
          }
          next();
        });
      },
    },
  ],
});
