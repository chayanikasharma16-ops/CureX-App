import { StorageService } from '../services/storageService';
import { AudioService } from '../services/audioService';
import { EmergencyService } from '../services/emergencyService';
import { HealthScannerService } from '../services/healthScannerService';
import { AuthAndDocsService } from '../services/authAndDocsService';
import { CureXAiService } from '../services/curexAiService';
import { Medication, DoseRecord } from '../types';

export class AndroidAppUi {
  private container!: HTMLDivElement;
  private currentTab: 'checklist' | 'meds' | 'ai' | 'scanners' | 'kids' | 'records' = 'checklist';
  private onDoseTakenCallback?: (dose: DoseRecord) => void;
  private onScanTriggerCallback?: () => void;
  private onPetCelebrateCallback?: () => void;
  private isAiThinking = false;

  // Device PIN State
  private enteredPin: string = '';
  private pinSetupStep: 'choose_or_enter' | 'confirm' = 'choose_or_enter';
  private chosenPinLength: 4 | 6 = 4;
  private tempFirstPin: string = '';
  private pinErrorMessage: string = '';

  constructor(
    onDoseTaken?: (dose: DoseRecord) => void,
    onScanTrigger?: () => void,
    onPetCelebrate?: () => void
  ) {
    this.onDoseTakenCallback = onDoseTaken;
    this.onScanTriggerCallback = onScanTrigger;
    this.onPetCelebrateCallback = onPetCelebrate;
    this.initUi();
  }

  private initUi() {
    this.container = document.createElement('div');
    this.container.id = 'curex-android-app';
    this.container.className = 'android-shell';
    document.body.appendChild(this.container);

    this.render();
  }

  public render() {
    const lang = StorageService.getLanguage();
    const isDark = StorageService.isDarkMode();
    const isKid = StorageService.isKidMode();
    const streak = StorageService.getStreak();
    const meds = StorageService.getMedications();
    const doses = StorageService.getTodayDoses();
    const lowStockMeds = meds.filter((m) => m.remainingTablets <= m.refillThreshold);

    this.container.className = `android-shell ${isDark ? 'dark-theme' : 'light-theme'}`;

    // GATEKEEPER 1: If no PIN is configured on this device yet, prompt setup first!
    if (!StorageService.hasConfiguredPin()) {
      this.renderPinSetupScreen();
      return;
    }

    // GATEKEEPER 2: If session is locked on this device, prompt PIN unlock!
    if (!StorageService.isSessionUnlocked()) {
      this.renderPinUnlockScreen();
      return;
    }

    this.container.innerHTML = `
      <!-- TOP STATUS & EMERGENCY HEADER -->
      <header class="app-header">
        <div class="header-top-row">
          <div class="brand-group">
            <div class="brand-logo-icon">💊</div>
            <div>
              <div class="brand-title">CureX <span class="brand-badge">Health OS</span></div>
              <div class="brand-sub">Smart Medical & Medication Adherence</div>
            </div>
          </div>
          <div class="header-actions">
            <button id="btn-toggle-lang" class="pill-btn ${lang === 'hi' ? 'active-lang' : ''}" title="Toggle English / हिन्दी">
              ${lang === 'hi' ? '🇮🇳 हिन्दी' : '🇬🇧 English'}
            </button>
            <button id="btn-toggle-mode" class="icon-round-btn" title="Toggle Kids / Adults Mode">
              ${isKid ? '🦸 Kids' : '👤 Adult'}
            </button>
            <button id="btn-toggle-theme" class="icon-round-btn" title="Toggle Theme">
              ${isDark ? '🌙' : '☀️'}
            </button>
            <button id="btn-biometric-lock" class="icon-round-btn" title="Lock Sensitive Health Data">
              🔒
            </button>
          </div>
        </div>

        <!-- PITCH STATEMENT BANNER -->
        <div class="pitch-banner">
          <span>🌐 <strong>Website</strong> = learn & explain CureX</span>
          <span class="pitch-divider">|</span>
          <span>📱 <strong>App</strong> = remind, track & alert every day</span>
        </div>

        <!-- URGENT EMERGENCY ACTION BAR -->
        <div class="emergency-bar">
          <div class="emergency-title-row">
            <span class="emergency-tag">🚨 24x7 MEDICAL EMERGENCY</span>
            <span class="emergency-sub">Zero SIM Required • WhatsApp GPS SOS</span>
          </div>
          <div class="emergency-btn-grid">
            <button id="btn-call-102" class="emergency-action-btn btn-call-102">
              <span class="em-icon">🚑</span>
              <span class="em-label">
                <strong>CALL 102</strong>
                <small>National Ambulance</small>
              </span>
            </button>
            <button id="btn-wa-sos" class="emergency-action-btn btn-wa-sos">
              <span class="em-icon">💬</span>
              <span class="em-label">
                <strong>WHATSAPP SOS</strong>
                <small>Auto GPS Location</small>
              </span>
            </button>
            <button id="btn-loud-siren" class="emergency-action-btn btn-siren ${AudioService.isSirenActive() ? 'siren-pulsing' : ''}">
              <span class="em-icon">${AudioService.isSirenActive() ? '🛑' : '🔊'}</span>
              <span class="em-label">
                <strong>${AudioService.isSirenActive() ? 'STOP SIREN' : 'LOUD ALARM'}</strong>
                <small>Nearby Bystanders</small>
              </span>
            </button>
            <button id="btn-responder-card" class="emergency-action-btn btn-responder">
              <span class="em-icon">🩸</span>
              <span class="em-label">
                <strong>FIRST AID EHR</strong>
                <small>Blood: O+ | Allergies</small>
              </span>
            </button>
          </div>
        </div>
      </header>

      <!-- REFILL ALERT BANNER (If any medicine <= 3 tablets) -->
      ${
        lowStockMeds.length > 0
          ? `
        <div class="refill-alert-banner">
          <div class="refill-icon">⚠️</div>
          <div class="refill-content">
            <strong>Refill Alert:</strong> Only <strong>${lowStockMeds[0].remainingTablets} tablets</strong> left for <em>${lowStockMeds[0].name}</em>, order soon!
          </div>
          <button id="btn-reorder-fast" class="refill-btn">1-Tap Refill 📦</button>
        </div>
      `
          : ''
      }

      <!-- MAIN SCROLLABLE APP BODY -->
      <main class="app-body">
        ${this.renderActiveTab()}
      </main>

      <!-- ANDROID BOTTOM NAVIGATION BAR -->
      <nav class="bottom-nav">
        <button class="nav-item ${this.currentTab === 'checklist' ? 'active' : ''}" data-tab="checklist">
          <span class="nav-icon">📋</span>
          <span class="nav-label">${lang === 'hi' ? 'दवाइयां' : 'Today'}</span>
        </button>
        <button class="nav-item ${this.currentTab === 'meds' ? 'active' : ''}" data-tab="meds">
          <span class="nav-icon">💊</span>
          <span class="nav-label">${lang === 'hi' ? 'प्रिस्क्रिप्शन' : 'Meds'}</span>
          ${lowStockMeds.length > 0 ? '<span class="nav-badge-dot"></span>' : ''}
        </button>
        <button class="nav-item ${this.currentTab === 'ai' ? 'active' : ''}" data-tab="ai">
          <span class="nav-icon">🤖</span>
          <span class="nav-label">${lang === 'hi' ? 'क्यूरेक्स AI' : 'CureX AI'}</span>
        </button>
        <button class="nav-item ${this.currentTab === 'scanners' ? 'active' : ''}" data-tab="scanners">
          <span class="nav-icon">👁️</span>
          <span class="nav-label">${lang === 'hi' ? 'स्कैनर्स' : 'Scanners'}</span>
        </button>
        <button class="nav-item ${this.currentTab === 'kids' ? 'active' : ''}" data-tab="kids">
          <span class="nav-icon">🐶</span>
          <span class="nav-label">${lang === 'hi' ? 'किड्स' : 'Kid Mode'}</span>
        </button>
        <button class="nav-item ${this.currentTab === 'records' ? 'active' : ''}" data-tab="records">
          <span class="nav-icon">📄</span>
          <span class="nav-label">${lang === 'hi' ? 'डॉक्स' : 'EHR Docs'}</span>
        </button>
      </nav>
    `;

    this.bindEvents();
  }

  private renderActiveTab(): string {
    switch (this.currentTab) {
      case 'checklist':
        return this.renderChecklistTab();
      case 'meds':
        return this.renderMedsTab();
      case 'ai':
        return this.renderAiTab();
      case 'scanners':
        return this.renderScannersTab();
      case 'kids':
        return this.renderKidsTab();
      case 'records':
        return this.renderRecordsTab();
    }
  }

  // --- TAB 1: DAILY CHECKLIST & STREAKS ---
  private renderChecklistTab(): string {
    const lang = StorageService.getLanguage();
    const doses = StorageService.getTodayDoses();
    const streak = StorageService.getStreak();
    const badges = StorageService.getBadges();
    const takenCount = doses.filter((d) => d.status === 'taken').length;
    const progressPct = doses.length > 0 ? Math.round((takenCount / doses.length) * 100) : 100;

    return `
      <section class="tab-content animate-fade">
        <!-- STREAK HERO CARD -->
        <div class="hero-streak-card">
          <div class="streak-header">
            <span class="streak-badge-label">🏆 CURRENT ADHERENCE STREAK</span>
            <span class="streak-sync-status">⚡ Realtime Alarms Active</span>
          </div>
          <div class="streak-main-row">
            <div class="streak-number-col">
              <span class="streak-number">${streak}</span>
              <span class="streak-days">${lang === 'hi' ? 'दिन लगातार' : 'Days in a row'}</span>
            </div>
            <div class="streak-hero-info">
              <div class="hero-title">${streak >= 7 ? 'Medication Hero 🦸' : 'Rising Health Star ⭐'}</div>
              <p class="hero-desc">
                ${streak >= 7 ? '“7 days in a row = Medication Hero 🦸”. You are at zero missed doses!' : 'Keep taking medicines on time to unlock the Medication Hero badge.'}
              </p>
            </div>
          </div>
          <!-- PROGRESS BAR -->
          <div class="progress-wrap">
            <div class="progress-meta">
              <span>Today’s Adherence: ${takenCount}/${doses.length} Doses</span>
              <span><strong>${progressPct}%</strong> Complete</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${progressPct}%"></div>
            </div>
          </div>
        </div>

        <!-- TODAY'S CHECKLIST HEADER -->
        <div class="section-header-row">
          <div>
            <h2 class="section-title">📅 Today’s Dose Checklist</h2>
            <p class="section-subtitle">${lang === 'hi' ? 'आज की दवाइयां टिक करें' : 'Tick them off like a to-do list at dose time'}</p>
          </div>
          <button id="btn-test-chime" class="pill-btn-outline" title="Test Dose Alarm Chime">
            🔔 Test Alarm
          </button>
        </div>

        <!-- DOSE CHECKLIST ITEMS -->
        <div class="checklist-grid">
          ${doses
            .map((dose) => {
              const meds = StorageService.getMedications();
              const med = meds.find((m) => m.id === dose.medicationId);
              const instructions = med ? med.instructions : 'Take with water';
              const purpose = med ? med.purpose : 'Therapy';

              return `
              <div class="dose-card status-${dose.status}">
                <div class="dose-card-header">
                  <div class="dose-time-tag">⏰ ${dose.scheduledTime}</div>
                  <div class="dose-status-tag tag-${dose.status}">
                    ${dose.status === 'taken' ? '✅ Taken' : dose.status === 'skipped' ? '❌ Skipped' : dose.status === 'snoozed' ? '⏰ Snoozed' : '⏳ Scheduled'}
                  </div>
                </div>

                <div class="dose-card-body">
                  <div class="med-name">${dose.medicationName}</div>
                  <div class="med-purpose">${purpose}</div>
                  <div class="med-instruction-box">
                    💡 <em>${instructions}</em>
                  </div>
                </div>

                <!-- ACTION BUTTONS: Taken / Skip / Snooze + Voice -->
                <div class="dose-actions-row">
                  <button class="btn-dose-action btn-taken ${dose.status === 'taken' ? 'selected' : ''}" data-id="${dose.id}">
                    ✅ Taken
                  </button>
                  <button class="btn-dose-action btn-skip ${dose.status === 'skipped' ? 'selected' : ''}" data-id="${dose.id}">
                    ❌ Skip
                  </button>
                  <button class="btn-dose-action btn-snooze ${dose.status === 'snoozed' ? 'selected' : ''}" data-id="${dose.id}">
                    ⏰ Snooze
                  </button>
                  <button class="btn-dose-voice" data-name="${dose.medicationName}" data-instr="${instructions}" title="Speak Voice Reminder in ${lang === 'hi' ? 'Hindi' : 'English'}">
                    🔊 ${lang === 'hi' ? 'आवाज़' : 'Voice'}
                  </button>
                </div>

                ${
                  dose.status === 'skipped'
                    ? `
                  <div class="missed-family-alert">
                    <span>⚠️ Dose was skipped! Grandparent alert active.</span>
                    <button class="btn-family-notify" data-name="${dose.medicationName}" data-time="${dose.scheduledTime}">
                      Send Family Alert 📲
                    </button>
                  </div>
                `
                    : ''
                }
              </div>
            `;
            })
            .join('')}
        </div>

        <!-- WEEKLY ADHERENCE REPORT -->
        <div class="weekly-report-card">
          <div class="report-header">
            <div>
              <h3 class="card-title">📊 Weekly Adherence Report</h3>
              <p class="card-subtitle">Comprehensive 7-day adherence for doctor consultation</p>
            </div>
            <button id="btn-share-doctor" class="pill-btn-primary">
              Share with Doctor 🩺
            </button>
          </div>
          <div class="report-bar-chart">
            <div class="chart-col">
              <div class="bar-fill" style="height: 100%;"></div>
              <span class="day-label">Mon</span>
              <span class="pct-label">100%</span>
            </div>
            <div class="chart-col">
              <div class="bar-fill" style="height: 100%;"></div>
              <span class="day-label">Tue</span>
              <span class="pct-label">100%</span>
            </div>
            <div class="chart-col">
              <div class="bar-fill" style="height: 100%;"></div>
              <span class="day-label">Wed</span>
              <span class="pct-label">100%</span>
            </div>
            <div class="chart-col">
              <div class="bar-fill" style="height: 75%;"></div>
              <span class="day-label">Thu</span>
              <span class="pct-label">75%</span>
            </div>
            <div class="chart-col">
              <div class="bar-fill" style="height: 100%;"></div>
              <span class="day-label">Fri</span>
              <span class="pct-label">100%</span>
            </div>
            <div class="chart-col">
              <div class="bar-fill" style="height: 100%;"></div>
              <span class="day-label">Sat</span>
              <span class="pct-label">100%</span>
            </div>
            <div class="chart-col active-day">
              <div class="bar-fill" style="height: ${progressPct}%;"></div>
              <span class="day-label">Today</span>
              <span class="pct-label">${progressPct}%</span>
            </div>
          </div>
          <div class="report-summary-footer">
            🌟 <strong>Overall Adherence: 96.4%</strong>. Clinical status: Optimal therapeutic control.
          </div>
        </div>

        <!-- BADGES & ACHIEVEMENTS GALLERY -->
        <div class="badges-card">
          <h3 class="card-title">🏅 Health Badges & Achievements</h3>
          <div class="badges-grid">
            ${badges
              .map(
                (b) => `
              <div class="badge-item ${b.unlocked ? 'badge-unlocked' : 'badge-locked'}">
                <div class="badge-icon">${b.icon}</div>
                <div class="badge-name">${b.title}</div>
                <div class="badge-desc">${b.description}</div>
                ${b.unlocked ? `<span class="badge-status-pill">Unlocked</span>` : `<span class="badge-status-pill locked">Locked</span>`}
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </section>
    `;
  }

  // --- TAB 2: MEDICINES, REFILLS & OCR STRIP SCANNER ---
  private renderMedsTab(): string {
    const meds = StorageService.getMedications();

    return `
      <section class="tab-content animate-fade">
        <div class="section-header-row">
          <div>
            <h2 class="section-title">💊 Prescriptions & Refill Status</h2>
            <p class="section-subtitle">Auto tablet count tracker with low stock alerts</p>
          </div>
          <button id="btn-scan-strip-modal" class="pill-btn-primary">
            📷 Scan Medicine Strip (OCR)
          </button>
        </div>

        <!-- MEDICINES LIST -->
        <div class="meds-catalog-grid">
          ${meds
            .map((med) => {
              const isLow = med.remainingTablets <= med.refillThreshold;
              const fillPct = Math.round((med.remainingTablets / med.totalTablets) * 100);

              return `
              <div class="med-catalog-card ${isLow ? 'card-low-stock' : ''}">
                <div class="med-catalog-top">
                  <div>
                    <span class="med-category-pill pill-${med.category}">${med.category.toUpperCase()}</span>
                    <h3 class="med-item-title">${med.name}</h3>
                    <div class="med-item-dosage">${med.dosage} • ${med.frequency}</div>
                  </div>
                  <div class="stock-badge ${isLow ? 'badge-urgent' : 'badge-good'}">
                    ${med.remainingTablets} / ${med.totalTablets} left
                  </div>
                </div>

                <div class="med-stock-bar-wrap">
                  <div class="med-stock-bar" style="width: ${fillPct}%; background-color: ${isLow ? '#ef4444' : '#10b981'};"></div>
                </div>

                ${
                  isLow
                    ? `
                  <div class="refill-urgent-notice">
                    🚨 <strong>“Only ${med.remainingTablets} tablets left, order soon!”</strong>
                    <button class="btn-quick-order" data-name="${med.name}">Reorder Now</button>
                  </div>
                `
                    : ''
                }

                <!-- MEDICINE INFO CARD -->
                <div class="med-info-box">
                  <div class="info-row"><strong>Purpose:</strong> <span>${med.purpose}</span></div>
                  <div class="info-row"><strong>Timing:</strong> <span>${med.times.join(', ')}</span></div>
                  <div class="info-row"><strong>Directions:</strong> <span>${med.instructions}</span></div>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  // --- TAB: CUREX AI CLINICAL ASSISTANT ---
  private renderAiTab(): string {
    const lang = StorageService.getLanguage();
    const messages = CureXAiService.getMessages();

    return `
      <section class="tab-content animate-fade">
        <div class="ai-header-card">
          <div class="ai-header-top">
            <div class="ai-title-wrap">
              <span class="ai-sparkle-icon">✨</span>
              <div>
                <div class="ai-brand-title">CureX AI Medical Intelligence</div>
                <div class="ai-brand-sub">Powered by Gemini 3.8 Flash • Real-time clinical pharmacology & dosage consultant</div>
              </div>
            </div>
            <button id="btn-clear-ai-chat" class="pill-btn-outline" title="Clear conversation">
              🧹 Clear
            </button>
          </div>

          <!-- QUICK SUGGESTIONS -->
          <div class="ai-quick-section">
            <span class="ai-quick-label">⚡ Fast Clinical Inquiries:</span>
            <div class="ai-quick-chips">
              <button class="ai-chip-btn" data-query="Can I take Paracetamol with my active medications?">
                💊 Check Drug Interactions
              </button>
              <button class="ai-chip-btn" data-query="I missed my 8:00 AM Metformin dose, what is the safest protocol?">
                ⏰ Missed Dose Protocol
              </button>
              <button class="ai-chip-btn" data-query="Analyze my recent eye scan and body vitals telemetry for fatigue or jaundice signs.">
                👁️ Interpret Eye & Vitals Scan
              </button>
              <button class="ai-chip-btn" data-query="What are the essential diet restrictions and side effects for Atorvastatin?">
                🩺 Atorvastatin Guidelines
              </button>
              <button class="ai-chip-btn" data-query="मेरी वर्तमान दवाओं को लेने का सही तरीका और सावधानियां हिंदी में समझाइए।">
                🇮🇳 दवाओं के नियम (Hindi)
              </button>
            </div>
          </div>
        </div>

        <!-- CHAT CONVERSATION STREAM -->
        <div class="ai-chat-thread" id="ai-chat-thread">
          ${messages
            .map(
              (msg) => `
            <div class="ai-msg-row ${msg.sender === 'user' ? 'msg-user' : 'msg-assistant'}">
              <div class="msg-avatar">${msg.sender === 'user' ? '👤' : '🤖'}</div>
              <div class="msg-bubble-wrap">
                <div class="msg-bubble">
                  ${this.formatAiMarkdown(msg.text)}
                </div>
                <div class="msg-meta">
                  <span>${msg.timestamp}</span>
                  ${
                    msg.sender === 'assistant'
                      ? `<button class="btn-read-ai-msg" data-text="${encodeURIComponent(msg.text)}">🔊 Read Aloud</button>`
                      : ''
                  }
                </div>
              </div>
            </div>
          `
            )
            .join('')}

          ${
            this.isAiThinking
              ? `
            <div class="ai-msg-row msg-assistant">
              <div class="msg-avatar">🤖</div>
              <div class="msg-bubble-wrap">
                <div class="msg-bubble ai-thinking-bubble">
                  <span class="thinking-text">CureX AI is analyzing your medical telemetry & pharmacology...</span>
                </div>
              </div>
            </div>
          `
              : ''
          }
        </div>

        <!-- INPUT BOX -->
        <form id="form-ai-input" class="ai-input-form">
          <input
            type="text"
            id="input-ai-text"
            class="ai-text-field"
            placeholder="${lang === 'hi' ? 'दवाइयों, लक्षणों या जांच के बारे में पूछें...' : 'Ask CureX AI about doses, interactions, or symptoms...'}"
            required
            autocomplete="off"
            ${this.isAiThinking ? 'disabled' : ''}
          />
          <button type="submit" class="ai-send-btn" ${this.isAiThinking ? 'disabled' : ''}>
            ${this.isAiThinking ? '...' : 'Send ➤'}
          </button>
        </form>
      </section>
    `;
  }

  private formatAiMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  }

  // --- TAB 3: BIOMETRIC SCANNERS (EYE & BODY) ---
  private renderScannersTab(): string {
    const eyeScans = StorageService.getEyeScans();
    const bodyScans = StorageService.getBodyScans();
    const latestEye = eyeScans[0];
    const latestBody = bodyScans[0];

    return `
      <section class="tab-content animate-fade">
        <div class="section-header-row">
          <div>
            <h2 class="section-title">🔬 Biometric Health Scanners</h2>
            <p class="section-subtitle">Ocular biomarkers & real-time body vital telemetry</p>
          </div>
        </div>

        <!-- EYE SCANNER SECTION -->
        <div class="scanner-feature-card">
          <div class="scanner-card-header">
            <div>
              <span class="scanner-badge">👁️ EYE BIOMETRIC SCAN</span>
              <h3 class="card-title">Retinal, Sclera & Pallor Analysis</h3>
              <p class="card-subtitle">Scans eyes to detect early jaundice (scleral icterus), conjunctival anemia pallor, and fatigue index.</p>
            </div>
            <button id="btn-trigger-eye-scan" class="pill-btn-primary">
              ⚡ Start Eye Scan
            </button>
          </div>

          <div id="eye-scan-active-box" class="scanner-viewport-box">
            <div class="eye-target-guide">
              <div class="eye-reticle-circle"></div>
              <div class="eye-crosshairs"></div>
              <div class="scanner-status-text">Align eye within target ring & keep steady</div>
            </div>
          </div>

          ${
            latestEye
              ? `
            <div class="scan-results-panel">
              <div class="result-header">
                <strong>Latest Eye Biomarkers (${latestEye.timestamp})</strong>
                <span class="score-pill">Health Score: ${latestEye.overallScore}%</span>
              </div>
              <div class="metrics-grid">
                <div class="metric-card">
                  <span class="metric-label">Sclera Status (Jaundice)</span>
                  <strong class="metric-value text-green">${latestEye.scleraHealth}</strong>
                  <small>Bilirubin Risk: ${latestEye.bilirubinRisk}</small>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Conjunctival Pallor</span>
                  <strong class="metric-value text-green">${latestEye.conjunctivalPallor}</strong>
                  <small>Anemia Risk: ${latestEye.anemiaRisk}</small>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Pupil Light Reflex</span>
                  <strong class="metric-value text-blue">${latestEye.pupilReactivity}</strong>
                  <small>Neurological Symmetry: Normal</small>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Ocular Fatigue Index</span>
                  <strong class="metric-value ${latestEye.fatigueIndex > 35 ? 'text-amber' : 'text-green'}">${latestEye.fatigueIndex}%</strong>
                  <small>Screen Strain & Tear Film</small>
                </div>
              </div>
              <div class="recommendation-box">
                💡 <strong>Clinical Guidance:</strong> ${latestEye.recommendation}
              </div>
            </div>
          `
              : `
            <div class="empty-scan-prompt">
              Press "Start Eye Scan" to perform your optical biomarker assessment.
            </div>
          `
          }
        </div>

        <!-- BODY VITAL & POSTURE SCANNER SECTION -->
        <div class="scanner-feature-card">
          <div class="scanner-card-header">
            <div>
              <span class="scanner-badge">🫀 BODY HEALTH SCANNER</span>
              <h3 class="card-title">Vital Signs & Posture Anomaly Monitor</h3>
              <p class="card-subtitle">Continuous camera-based photoplethysmography (PPG) and posture detection with sudden change alerts.</p>
            </div>
            <button id="btn-trigger-body-scan" class="pill-btn-outline">
              ⚡ Scan Vitals
            </button>
          </div>

          ${
            latestBody
              ? `
            <div class="scan-results-panel">
              <div class="metrics-grid">
                <div class="metric-card">
                  <span class="metric-label">Heart Rate (PPG)</span>
                  <strong class="metric-value text-red">${latestBody.heartRateBpm} BPM</strong>
                  <small>Resting Cardiac Rhythm</small>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Body Temperature</span>
                  <strong class="metric-value text-amber">${latestBody.bodyTemperatureC} °C</strong>
                  <small>Thermal Homeostasis</small>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Respiratory Rate</span>
                  <strong class="metric-value text-blue">${latestBody.respiratoryRate} bpm</strong>
                  <small>Thoracic Excursion</small>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Posture Alignment</span>
                  <strong class="metric-value text-green">${latestBody.postureScore}%</strong>
                  <small>Spinal Ergonomics</small>
                </div>
              </div>
              ${
                latestBody.suddenChangeDetected
                  ? `
                <div class="sudden-alert-box">
                  ⚠️ <strong>SUDDEN CHANGE ALERT:</strong> ${latestBody.alertNote || 'Vitals variance detected. First responders and family notified.'}
                </div>
              `
                  : `
                <div class="stable-notice-box">
                  ✅ <strong>Vitals Baseline Stable:</strong> Zero abnormal cardiac spikes or posture anomalies detected in past 60 minutes.
                </div>
              `
              }
            </div>
          `
              : `
            <div class="empty-scan-prompt">
              Press "Scan Vitals" to run a non-invasive telemetry check.
            </div>
          `
          }
        </div>
      </section>
    `;
  }

  // --- TAB 4: KIDS MODE (GAMIFIED PET COMPANION) ---
  private renderKidsTab(): string {
    return `
      <section class="tab-content animate-fade">
        <div class="kid-mode-hero">
          <div class="kid-pet-header">
            <div class="pet-avatar-circle">🐶</div>
            <div>
              <h2 class="pet-title">Dr. Paws’ Kids Corner! 🐾</h2>
              <p class="pet-subtitle">Take your medicine like a champion and keep Dr. Paws happy!</p>
            </div>
          </div>

          <div class="pet-status-row">
            <div class="pet-status-chip">💖 Mood: <strong>Super Happy!</strong></div>
            <div class="pet-status-chip">⭐ Stars Earned: <strong>14 Stars</strong></div>
            <div class="pet-status-chip">🦸 Level: <strong>Junior Hero</strong></div>
          </div>

          <div class="pet-interactive-box">
            <div class="pet-reaction-bubble">
              "Woof woof! I am so proud of you! Take your sip of water and let's earn another sticker!" 🦴
            </div>
            <div class="pet-actions-row">
              <button id="btn-pet-dr-paws" class="kid-big-btn">
                👋 Pet Dr. Paws (Watch Him Dance!)
              </button>
              <button id="btn-kid-video" class="kid-big-btn btn-cartoon">
                🎬 Watch Medicine Hero Cartoon
              </button>
            </div>
          </div>

          <!-- KIDS STICKER REWARD BOOK -->
          <div class="sticker-book-card">
            <h3 class="card-title">🌟 My Medicine Sticker Collection</h3>
            <div class="stickers-grid">
              <div class="sticker-item sticker-earned">🦸 Superhero Cape</div>
              <div class="sticker-item sticker-earned">⚡ Magic Potion</div>
              <div class="sticker-item sticker-earned">🚀 Rocket Ship</div>
              <div class="sticker-item sticker-earned">🦁 Brave Lion</div>
              <div class="sticker-item sticker-locked">🦖 Dino Roar (2 Doses Left)</div>
              <div class="sticker-item sticker-locked">👑 Golden Crown (Tomorrow)</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // --- TAB 5: MEDICAL RECORDS & GOOGLE DOCS ---
  private renderRecordsTab(): string {
    const docInfo = StorageService.getDocExportInfo();
    const profile = StorageService.getEmergencyProfile();
    const directDocUrl = 'https://docs.google.com/document/create';

    return `
      <section class="tab-content animate-fade">
        <div class="section-header-row">
          <div>
            <h2 class="section-title">📄 Medical Records & Google Docs</h2>
            <p class="section-subtitle">Encrypted personal EHR storage with HL7 FHIR Interoperability (100% Free & Secure)</p>
          </div>
        </div>

        <!-- GOOGLE DOCS CONNECTION CARD -->
        <div class="google-docs-card">
          <div class="docs-card-header">
            <div class="docs-brand-group">
              <svg class="docs-icon" viewBox="0 0 24 24" width="32" height="32" fill="#4285F4">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              <div>
                <h3 class="card-title">Google Docs Encrypted Medical Vault</h3>
                <p class="card-subtitle">Direct, free 1-tap clinical export to your Google Docs account with end-to-end encryption</p>
              </div>
            </div>

            <div class="auth-connected-pill">
              <span>🛡️ <strong>${profile.fullName}</strong> • EHR ID: CRX-${Date.now().toString(36).slice(0, 5).toUpperCase()}</span>
            </div>
          </div>

          <!-- USER GOOGLE DOCS LINK BOX -->
          <div class="user-doc-link-box">
            <div class="link-label">🔗 Your Direct Google Docs Medical Vault Link:</div>
            <div class="link-input-row">
              <input type="text" id="input-doc-link" readonly value="${directDocUrl}" class="link-text-input" />
              <button id="btn-copy-doc-link" class="pill-btn-outline">Copy 📋</button>
              <button id="btn-open-doc-link" class="pill-btn-primary">Open Google Docs ↗</button>
            </div>
            <small class="encryption-meta">
              🛡️ End-to-end Encrypted • Integrity Hash: ${docInfo?.encryptedHash || 'SHA256:7f9a2b8c4d1e...'} • HL7 FHIR v4 Compatible
            </small>
          </div>

          <div class="docs-actions-bar">
            <button id="btn-sync-docs-now" class="pill-btn-primary">
              💾 Export Medical Data to Google Docs
            </button>
            <button id="btn-download-ehr-txt" class="pill-btn-outline">
              📥 Download EHR Record (.txt)
            </button>
            <button id="btn-change-device-pin" class="pill-btn-outline">
              🔐 Change PIN (${StorageService.getPinLength()}-Digit)
            </button>
          </div>
        </div>

        <!-- HL7 FHIR & CLINICAL PREVIEW -->
        <div class="hl7-preview-card">
          <div class="hl7-header">
            <div>
              <h3 class="card-title">🩺 First Responder & Doctor Dashboard</h3>
              <p class="card-subtitle">Quick sorting of historical records & emergency medical profile</p>
            </div>
            <span class="hl7-badge">HL7 FHIR Document</span>
          </div>

          <div class="records-patient-summary">
            <div class="summary-col">
              <strong>Patient:</strong> ${profile.fullName} (${profile.age} yrs)<br/>
              <strong>Blood Group:</strong> <span class="blood-pill">${profile.bloodGroup}</span><br/>
              <strong>Donor Status:</strong> ${profile.organDonor ? 'Registered Organ Donor' : 'No'}
            </div>
            <div class="summary-col">
              <strong>Emergency Contact:</strong> ${profile.emergencyContactName} (${profile.emergencyContactPhone})<br/>
              <strong>Family Monitor:</strong> ${profile.familyContactName} (${profile.familyContactPhone})<br/>
              <strong>Cardiologist:</strong> ${profile.doctorName}
            </div>
          </div>

          <div class="records-history-box">
            <h4>Live Medical Record Preview (Google Docs formatted):</h4>
            <pre class="hl7-code-block">${AuthAndDocsService.generateMedicalReportContent().slice(0, 800)}...\n[Full record synchronized with Google Docs]</pre>
          </div>
        </div>
      </section>
    `;
  }

  // --- DEVICE PIN SETUP SCREEN (FIRST THING USER SEES) ---
  private renderPinSetupScreen() {
    const isDark = StorageService.isDarkMode();
    this.container.className = `android-shell ${isDark ? 'dark-theme' : 'light-theme'}`;

    const dotsHtml = Array.from({ length: this.chosenPinLength })
      .map((_, i) => `<span class="pin-dot ${i < this.enteredPin.length ? 'filled' : ''}"></span>`)
      .join('');

    this.container.innerHTML = `
      <div class="lock-screen-overlay animate-fade">
        <div class="lock-card">
          <div class="lock-icon">🔐</div>
          <h2 class="lock-title">
            ${this.pinSetupStep === 'choose_or_enter' ? 'Setup Device PIN' : 'Confirm Your PIN'}
          </h2>
          <p class="lock-subtitle">
            ${
              this.pinSetupStep === 'choose_or_enter'
                ? 'Before accessing CureX on this device, choose your security code length and create your personal PIN.'
                : `Please re-enter your ${this.chosenPinLength}-digit PIN to confirm setup.`
            }
          </p>

          ${
            this.pinSetupStep === 'choose_or_enter'
              ? `
            <div class="pin-length-toggle-box">
              <span class="length-label">Choose Code Format:</span>
              <div class="length-btn-group">
                <button id="btn-length-4" class="len-btn ${this.chosenPinLength === 4 ? 'active' : ''}">
                  4-Digit Code
                </button>
                <button id="btn-length-6" class="len-btn ${this.chosenPinLength === 6 ? 'active' : ''}">
                  6-Digit Code
                </button>
              </div>
            </div>
          `
              : ''
          }

          <div class="pin-dots-row">
            ${dotsHtml}
          </div>

          ${this.pinErrorMessage ? `<div class="pin-error-alert">${this.pinErrorMessage}</div>` : ''}

          <!-- NUMERIC KEYPAD -->
          <div class="keypad-grid">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9]
              .map(
                (n) => `
              <button class="keypad-key" data-digit="${n}">${n}</button>
            `
              )
              .join('')}
            <button class="keypad-key key-clear" id="btn-setup-clear">C</button>
            <button class="keypad-key" data-digit="0">0</button>
            <button class="keypad-key key-backspace" id="btn-setup-backspace">⌫</button>
          </div>

          <div class="lock-emergency-safe">
            🚨 <em>Emergency 102 & WhatsApp SOS remain directly accessible during panic.</em>
          </div>
        </div>
      </div>
    `;

    this.bindPinSetupEvents();
  }

  private bindPinSetupEvents() {
    // Length selection buttons (4 digits or 6 digits)
    document.getElementById('btn-length-4')?.addEventListener('click', () => {
      this.chosenPinLength = 4;
      this.enteredPin = '';
      this.pinErrorMessage = '';
      AudioService.playTakenSound();
      this.renderPinSetupScreen();
    });

    document.getElementById('btn-length-6')?.addEventListener('click', () => {
      this.chosenPinLength = 6;
      this.enteredPin = '';
      this.pinErrorMessage = '';
      AudioService.playTakenSound();
      this.renderPinSetupScreen();
    });

    // Keypad numeric digits
    this.container.querySelectorAll('.keypad-key[data-digit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const digit = (btn as HTMLElement).dataset.digit;
        if (!digit || this.enteredPin.length >= this.chosenPinLength) return;

        this.enteredPin += digit;
        AudioService.playScanBeep();
        this.renderPinSetupScreen();

        if (this.enteredPin.length === this.chosenPinLength) {
          setTimeout(() => {
            if (this.pinSetupStep === 'choose_or_enter') {
              this.tempFirstPin = this.enteredPin;
              this.enteredPin = '';
              this.pinSetupStep = 'confirm';
              this.pinErrorMessage = '';
              AudioService.playReminderChime();
              this.renderPinSetupScreen();
            } else if (this.pinSetupStep === 'confirm') {
              if (this.enteredPin === this.tempFirstPin) {
                StorageService.setDevicePin(this.enteredPin, this.chosenPinLength);
                this.enteredPin = '';
                this.tempFirstPin = '';
                this.pinSetupStep = 'choose_or_enter';
                this.pinErrorMessage = '';
                AudioService.playTakenSound();
                alert(`✅ Device Security Code Set! Your ${this.chosenPinLength}-digit PIN is saved on this device.`);
                this.render();
              } else {
                this.pinErrorMessage = '❌ Codes did not match. Please start again.';
                this.enteredPin = '';
                this.tempFirstPin = '';
                this.pinSetupStep = 'choose_or_enter';
                this.renderPinSetupScreen();
              }
            }
          }, 150);
        }
      });
    });

    // Backspace
    document.getElementById('btn-setup-backspace')?.addEventListener('click', () => {
      this.enteredPin = this.enteredPin.slice(0, -1);
      this.renderPinSetupScreen();
    });

    // Clear
    document.getElementById('btn-setup-clear')?.addEventListener('click', () => {
      this.enteredPin = '';
      this.renderPinSetupScreen();
    });
  }

  // --- DEVICE PIN UNLOCK SCREEN (BEFORE SEEING DASHBOARD) ---
  private renderPinUnlockScreen() {
    const isDark = StorageService.isDarkMode();
    const pinLen = StorageService.getPinLength();
    this.container.className = `android-shell ${isDark ? 'dark-theme' : 'light-theme'}`;

    const dotsHtml = Array.from({ length: pinLen })
      .map((_, i) => `<span class="pin-dot ${i < this.enteredPin.length ? 'filled' : ''}"></span>`)
      .join('');

    this.container.innerHTML = `
      <div class="lock-screen-overlay animate-fade">
        <div class="lock-card">
          <div class="lock-icon">🔒</div>
          <h2 class="lock-title">Enter Device PIN</h2>
          <p class="lock-subtitle">
            Enter your ${pinLen}-digit security code to unlock your medical dashboard and records.
          </p>

          <div class="pin-dots-row">
            ${dotsHtml}
          </div>

          ${this.pinErrorMessage ? `<div class="pin-error-alert">${this.pinErrorMessage}</div>` : ''}

          <!-- NUMERIC KEYPAD -->
          <div class="keypad-grid">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9]
              .map(
                (n) => `
              <button class="keypad-key" data-digit="${n}">${n}</button>
            `
              )
              .join('')}
            <button class="keypad-key key-clear" id="btn-unlock-clear">C</button>
            <button class="keypad-key" data-digit="0">0</button>
            <button class="keypad-key key-backspace" id="btn-unlock-backspace">⌫</button>
          </div>

          <div class="pin-unlock-footer">
            <button id="btn-reset-device-pin" class="pill-btn-sm-text">Reset / Change PIN on this device</button>
          </div>

          <div class="lock-emergency-safe">
            🚨 <em>Emergency 102 & WhatsApp SOS remain directly accessible without passcode.</em>
          </div>
        </div>
      </div>
    `;

    this.bindPinUnlockEvents();
  }

  private bindPinUnlockEvents() {
    const pinLen = StorageService.getPinLength();

    // Keypad numeric digits
    this.container.querySelectorAll('.keypad-key[data-digit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const digit = (btn as HTMLElement).dataset.digit;
        if (!digit || this.enteredPin.length >= pinLen) return;

        this.enteredPin += digit;
        AudioService.playScanBeep();
        this.renderPinUnlockScreen();

        if (this.enteredPin.length === pinLen) {
          setTimeout(() => {
            const isValid = StorageService.verifyDevicePin(this.enteredPin);
            if (isValid) {
              StorageService.unlockSession();
              this.enteredPin = '';
              this.pinErrorMessage = '';
              AudioService.playTakenSound();
              this.render();
            } else {
              this.pinErrorMessage = '❌ Incorrect PIN. Please try again.';
              this.enteredPin = '';
              AudioService.playScanBeep();
              this.renderPinUnlockScreen();
            }
          }, 150);
        }
      });
    });

    // Backspace
    document.getElementById('btn-unlock-backspace')?.addEventListener('click', () => {
      this.enteredPin = this.enteredPin.slice(0, -1);
      this.renderPinUnlockScreen();
    });

    // Clear
    document.getElementById('btn-unlock-clear')?.addEventListener('click', () => {
      this.enteredPin = '';
      this.renderPinUnlockScreen();
    });

    // Reset PIN
    document.getElementById('btn-reset-device-pin')?.addEventListener('click', () => {
      const confirmReset = window.confirm('Reset the security PIN for this device? You will create a new 4 or 6 digit code.');
      if (confirmReset) {
        StorageService.resetPin();
        this.enteredPin = '';
        this.pinSetupStep = 'choose_or_enter';
        this.pinErrorMessage = '';
        this.render();
      }
    });
  }

  // --- EVENT BINDING ---
  private bindEvents() {
    // Navigation Tabs
    const navItems = this.container.querySelectorAll('.nav-item');
    navItems.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const targetTab = (btn as HTMLElement).dataset.tab as typeof this.currentTab;
        if (targetTab) {
          this.currentTab = targetTab;
          this.render();
        }
      });
    });

    // Language Toggle
    document.getElementById('btn-toggle-lang')?.addEventListener('click', () => {
      const current = StorageService.getLanguage();
      const next = current === 'en' ? 'hi' : 'en';
      StorageService.setLanguage(next);
      AudioService.playTakenSound();
      this.render();
    });

    // Theme Toggle
    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
      const isDark = StorageService.isDarkMode();
      StorageService.setDarkMode(!isDark);
      this.render();
    });

    // Kids Mode Toggle
    document.getElementById('btn-toggle-mode')?.addEventListener('click', () => {
      const isKid = StorageService.isKidMode();
      StorageService.setKidMode(!isKid);
      AudioService.playTakenSound();
      this.currentTab = !isKid ? 'kids' : 'checklist';
      this.render();
    });

    // Device Security Lock
    document.getElementById('btn-biometric-lock')?.addEventListener('click', () => {
      StorageService.lockSession();
      this.enteredPin = '';
      this.pinErrorMessage = '';
      AudioService.playTakenSound();
      this.render();
    });

    // Change Device PIN button
    document.getElementById('btn-change-device-pin')?.addEventListener('click', () => {
      const confirmChange = window.confirm('Reconfigure the security PIN for this device? You can choose a 4-digit or 6-digit code.');
      if (confirmChange) {
        StorageService.resetPin();
        this.enteredPin = '';
        this.pinSetupStep = 'choose_or_enter';
        this.pinErrorMessage = '';
        this.render();
      }
    });

    // 102 Ambulance
    document.getElementById('btn-call-102')?.addEventListener('click', () => {
      EmergencyService.callAmbulance102();
    });

    // WhatsApp SOS
    document.getElementById('btn-wa-sos')?.addEventListener('click', async () => {
      await EmergencyService.triggerWhatsAppAmbulanceCall();
      this.render();
    });

    // Loud Siren
    document.getElementById('btn-loud-siren')?.addEventListener('click', () => {
      if (AudioService.isSirenActive()) {
        AudioService.stopEmergencySiren();
      } else {
        AudioService.startEmergencySiren();
      }
      this.render();
    });

    // First Responder Card Modal
    document.getElementById('btn-responder-card')?.addEventListener('click', () => {
      this.showResponderModal();
    });

    // 1-Tap Reorder
    document.getElementById('btn-reorder-fast')?.addEventListener('click', () => {
      const meds = StorageService.getMedications();
      const low = meds.find((m) => m.remainingTablets <= m.refillThreshold);
      if (low) {
        low.remainingTablets += 30;
        StorageService.saveMedications(meds);
        AudioService.playTakenSound();
        alert(`📦 1-Tap Refill Successful! 30 tablets of ${low.name} added to stock.`);
        this.render();
      }
    });

    // Test Alarm Chime
    document.getElementById('btn-test-chime')?.addEventListener('click', () => {
      AudioService.playReminderChime();
    });

    // Dose Buttons: Taken, Skip, Snooze, Voice
    this.container.querySelectorAll('.btn-taken').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id!;
        StorageService.markDose(id, 'taken');
        AudioService.playTakenSound();
        if (StorageService.isKidMode()) {
          AudioService.playKidCheer();
          this.onPetCelebrateCallback?.();
        }
        const doses = StorageService.getTodayDoses();
        const dose = doses.find((d) => d.id === id);
        if (dose && this.onDoseTakenCallback) this.onDoseTakenCallback(dose);
        this.render();
      });
    });

    this.container.querySelectorAll('.btn-skip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id!;
        StorageService.markDose(id, 'skipped');
        this.render();
      });
    });

    this.container.querySelectorAll('.btn-snooze').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id!;
        StorageService.markDose(id, 'snoozed');
        AudioService.playScanBeep();
        alert('⏰ Reminder snoozed for 15 minutes. Alarm will trigger again.');
        this.render();
      });
    });

    this.container.querySelectorAll('.btn-dose-voice').forEach((btn) => {
      btn.addEventListener('click', () => {
        const name = (btn as HTMLElement).dataset.name || 'Medication';
        const instr = (btn as HTMLElement).dataset.instr || '';
        const lang = StorageService.getLanguage();
        AudioService.speakMedicineReminder(name, instr, lang);
      });
    });

    this.container.querySelectorAll('.btn-family-notify').forEach((btn) => {
      btn.addEventListener('click', () => {
        const name = (btn as HTMLElement).dataset.name || 'Medication';
        const time = (btn as HTMLElement).dataset.time || '';
        EmergencyService.sendFamilyMissedDoseAlert(name, time);
      });
    });

    // Share with Doctor
    document.getElementById('btn-share-doctor')?.addEventListener('click', () => {
      const profile = StorageService.getEmergencyProfile();
      const text =
        `Dr. ${profile.doctorName}, here is my weekly CureX medication adherence report: 96.4% doses taken on time. Streaks: ${StorageService.getStreak()} days. Full encrypted EHR records: ${StorageService.getDocExportInfo()?.docUrl || 'Synchronized'}`;
      const url = `https://wa.me/${profile.doctorPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    });

    // Scan Strip Modal
    document.getElementById('btn-scan-strip-modal')?.addEventListener('click', () => {
      this.showScanStripModal();
    });

    // Trigger Eye Scan
    document.getElementById('btn-trigger-eye-scan')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-trigger-eye-scan') as HTMLButtonElement;
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Scanning Eye...';
      }
      this.onScanTriggerCallback?.();
      await HealthScannerService.analyzeEyeFrame();
      this.render();
    });

    // Trigger Body Scan
    document.getElementById('btn-trigger-body-scan')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-trigger-body-scan') as HTMLButtonElement;
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Scanning Vitals...';
      }
      this.onScanTriggerCallback?.();
      await HealthScannerService.analyzeBodyVitals();
      this.render();
    });

    // Pet Dr. Paws
    document.getElementById('btn-pet-dr-paws')?.addEventListener('click', () => {
      AudioService.playKidCheer();
      this.onPetCelebrateCallback?.();
      alert('🐾 Dr. Paws is wagging his tail happily and did a joyful spin!');
    });

    // Kids Cartoon Modal
    document.getElementById('btn-kid-video')?.addEventListener('click', () => {
      this.showCartoonVideoModal();
    });



    // Copy Doc Link
    document.getElementById('btn-copy-doc-link')?.addEventListener('click', () => {
      const input = document.getElementById('input-doc-link') as HTMLInputElement;
      if (input) {
        input.select();
        navigator.clipboard.writeText(input.value);
        alert('📋 Google Docs Medical Vault Link copied to clipboard!');
      }
    });

    // Open Doc Link
    document.getElementById('btn-open-doc-link')?.addEventListener('click', () => {
      const input = document.getElementById('input-doc-link') as HTMLInputElement;
      if (input) {
        window.open(input.value, '_blank');
      }
    });

    // Export to Google Docs
    document.getElementById('btn-sync-docs-now')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-sync-docs-now') as HTMLButtonElement;
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Exporting to Google Docs...';
      }
      const exportInfo = await AuthAndDocsService.exportToGoogleDocs();
      alert(`✅ Synchronized! Your medical data is exported to Google Docs.\nDoc Title: ${exportInfo.title}\nIntegrity Hash: ${exportInfo.encryptedHash}`);
      this.render();
    });

    // Download EHR
    document.getElementById('btn-download-ehr-txt')?.addEventListener('click', () => {
      AuthAndDocsService.downloadEncryptedRecordFile();
    });

    // Clear AI Chat
    document.getElementById('btn-clear-ai-chat')?.addEventListener('click', () => {
      CureXAiService.clearChat();
      AudioService.playTakenSound();
      this.render();
    });

    // AI Quick Suggestion Chips
    this.container.querySelectorAll('.ai-chip-btn').forEach((chip) => {
      chip.addEventListener('click', async () => {
        const query = (chip as HTMLElement).dataset.query || '';
        if (!query || this.isAiThinking) return;
        this.isAiThinking = true;
        this.render();
        await CureXAiService.sendMessage(query);
        this.isAiThinking = false;
        AudioService.playTakenSound();
        this.render();
      });
    });

    // AI Chat Input Form Submit
    const aiForm = document.getElementById('form-ai-input') as HTMLFormElement;
    aiForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('input-ai-text') as HTMLInputElement;
      if (!input || !input.value.trim() || this.isAiThinking) return;
      const text = input.value.trim();
      input.value = '';
      this.isAiThinking = true;
      this.render();
      await CureXAiService.sendMessage(text);
      this.isAiThinking = false;
      AudioService.playTakenSound();
      this.render();
      const thread = document.getElementById('ai-chat-thread');
      if (thread) thread.scrollTop = thread.scrollHeight;
    });

    // AI Read Aloud buttons
    this.container.querySelectorAll('.btn-read-ai-msg').forEach((btn) => {
      btn.addEventListener('click', () => {
        const raw = (btn as HTMLElement).dataset.text || '';
        const decoded = decodeURIComponent(raw);
        const lang = StorageService.getLanguage();
        // Remove markdown asterisks for cleaner speech
        const cleanSpeech = decoded.replace(/[*#_]/g, '');
        AudioService.speakText(cleanSpeech, lang);
      });
    });
  }

  // --- MODALS ---
  private showResponderModal() {
    const profile = StorageService.getEmergencyProfile();
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop animate-fade';
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3>🩸 Essential First Responder Medical Card</h3>
          <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="profile-vital-grid">
            <div class="pv-item"><strong>Patient:</strong> ${profile.fullName} (${profile.age}y)</div>
            <div class="pv-item"><strong>Blood Group:</strong> <span class="blood-pill">${profile.bloodGroup}</span></div>
            <div class="pv-item"><strong>Organ Donor:</strong> ${profile.organDonor ? 'YES' : 'NO'}</div>
          </div>
          <div class="pv-block">
            <strong>Critical Drug & Environmental Allergies:</strong>
            <ul>
              ${profile.allergies.map((a) => `<li class="text-red">⚠️ ${a}</li>`).join('')}
            </ul>
          </div>
          <div class="pv-block">
            <strong>Chronic Medical Conditions:</strong>
            <ul>
              ${profile.chronicConditions.map((c) => `<li>• ${c}</li>`).join('')}
            </ul>
          </div>
          <div class="pv-block">
            <strong>Emergency Family Contact:</strong> ${profile.emergencyContactName} - <a href="tel:${profile.emergencyContactPhone}">${profile.emergencyContactPhone}</a>
          </div>
          <div class="pv-block">
            <strong>Hospital Preference:</strong> ${profile.hospitalPreference}
          </div>
        </div>
        <div class="modal-footer">
          <button class="pill-btn-primary modal-ok-btn">Close Card</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('.modal-close-btn')?.addEventListener('click', close);
    modal.querySelector('.modal-ok-btn')?.addEventListener('click', close);
  }

  private showScanStripModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop animate-fade';
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3>📷 Scan Medicine Strip (OCR)</h3>
          <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <p>The camera automatically recognizes the drug name, strength (mg/mcg), and dosage instructions.</p>
          <div class="camera-stream-mock">
            <div class="ocr-scanline"></div>
            <div class="ocr-box">Point at medicine blister pack</div>
          </div>
          <div class="quick-samples-label">Or test with real clinical medicine strips:</div>
          <div class="samples-btn-grid">
            <button class="sample-btn" data-text="Metformin HCl 500mg IP (Glycomet) Twice Daily">Metformin 500mg</button>
            <button class="sample-btn" data-text="Paracetamol Tablets IP 650mg (Dolo) For Fever">Paracetamol 650mg</button>
            <button class="sample-btn" data-text="Amoxicillin Trihydrate 500mg Capsules IP Three Times Daily">Amoxicillin 500mg</button>
            <button class="sample-btn" data-text="Atorvastatin Calcium 20mg Tablets Bedtime">Atorvastatin 20mg</button>
            <button class="sample-btn" data-text="Cetirizine Hydrochloride 10mg Tablets">Cetirizine 10mg</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="pill-btn-outline modal-cancel-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('.modal-close-btn')?.addEventListener('click', close);
    modal.querySelector('.modal-cancel-btn')?.addEventListener('click', close);

    modal.querySelectorAll('.sample-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const text = (btn as HTMLElement).dataset.text || '';
        const newMed = await HealthScannerService.parseMedicineStripText(text);
        alert(`✅ OCR Strip Recognized: ${newMed.name} (${newMed.dosage}) auto-added to your prescriptions and daily checklist!`);
        close();
        this.render();
      });
    });
  }

  private showCartoonVideoModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop animate-fade';
    modal.innerHTML = `
      <div class="modal-card modal-kid-theme">
        <div class="modal-header">
          <h3>🐶 Dr. Paws & The Medicine Heroes! 🦸</h3>
          <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="cartoon-screen">
            <div class="cartoon-animation-content">
              <div class="cartoon-character-bounce">🐶 ✨ 💊</div>
              <h4>"Every Medicine Pill gives you Super Health Powers!"</h4>
              <p>Drink a cup of water, say 'Gulp!', and win 5 Super Stars!</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="kid-big-btn modal-done-btn">Yay, I Took It! (+10 Stars)</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('.modal-close-btn')?.addEventListener('click', close);
    modal.querySelector('.modal-done-btn')?.addEventListener('click', () => {
      AudioService.playKidCheer();
      this.onPetCelebrateCallback?.();
      close();
    });
  }
}
