# Google Play Store Publishing Guide — ZH Einbürgerung (Grundkenntnistest Kanton Zürich)

Everything is configured (`minSdkVersion = 24`, `compileSdkVersion = 36`, `targetSdkVersion = 36`, `versionCode = 2`) and signed for uploading **ZH Einbürgerung** (`com.jonbaraq.zuricheinbuergerung`) to [Google Play Console](https://play.google.com/console).

---

## 1. Files Ready for Upload

| Resource | Path | Usage in Google Play Console |
| :--- | :--- | :--- |
| **Android App Bundle (`.aab`)** | `zurich_einbuergerung/android/app/build/outputs/bundle/release/app-release.aab` (also copied to `zurich_einbuergerung/ZurichEinbuergerung-release.aab`) | Upload in **Production / Closed testing → Create new release** |
| **Signed Production APK** | `zurich_einbuergerung/android/app/build/outputs/apk/release/app-release.apk` (also copied to `zurich_einbuergerung/ZurichEinbuergerung-release.apk`) | Direct device installation |
| **Upload Keystore** | `zurich_einbuergerung/android/app/upload-keystore.jks` | **Keep backed up safely!** Required for future app updates (Alias: `zuricheinbuergerung-key`) |
| **High-Res Store Icon (512×512)** | `zurich_einbuergerung/playstore_assets/icon_512x512.png` | Play Store listing icon (512 × 512 px, 24-bit PNG without transparency) |
| **Feature Graphic (1024×500)** | `zurich_einbuergerung/playstore_assets/feature_graphic_1024x500.png` | Play Store promotional header banner (1024 × 500 px) |
| **Phone Screenshots (1080×1920)** | `zurich_einbuergerung/playstore_assets/screenshot_*.png` | 4 high-resolution phone screenshots showing Dashboard, Training, 40-Question Exam Simulation, and Most Failed Questions |
| **Privacy Policy URL** | `https://github.com/jonathangsc-jonbaraq/zurich-einbuergerung/blob/main/PRIVACY_POLICY.md` | Paste under **App content → Privacy policy** |

---

## 2. Copy-Paste Store Listing Texts

### Deutsch (`de-CH` / `de-DE`) — Primary Language

- **App-Name (max. 30 Zeichen):**
  `ZH Einbürgerung: Test Zürich` *(28 Zeichen)*
- **Kurzbeschreibung (max. 80 Zeichen):**
  `Alle 350 offiziellen Fragen für den Grundkenntnistest im Kanton Zürich üben.` *(76 Zeichen)*
- **Vollständige Beschreibung:**
  ```text
  Bereite dich optimal und gezielt auf den kantonalen Grundkenntnistest im Einbürgerungsverfahren des Kantons Zürich vor!

  Diese App enthält den kompletten offiziellen Fragenkatalog (alle 350 Fragen inklusive Wappen-, Fahnen-, Karten- und Bildfragen) für die Einbürgerung im Kanton Zürich – übersichtlich gegliedert nach den 5 offiziellen Themengebieten und den 3 Staatsebenen (Bund, Kanton, Gemeinde).

  HAUPTFUNKTIONEN:
  • Alle 350 offiziellen Fragen: Vollständiger Fragenkatalog zu Demokratie & Föderalismus, Sozialstaat & Zivilgesellschaft, Geschichte, Geografie sowie Kultur & Alltagskultur.
  • 1. Trainingsmodus: Übe mit sofortigem Feedback nach jeder Antwort. Filtere gezielt nach Themengebiet, Staatsebene (Bund, Kanton, Gemeinde) oder Lernstatus (Alle, Noch unbeantwortet, Noch nicht gemeistert) in Katalog- oder Zufallsreihenfolge.
  • 2. Prüfungssimulation (40 Fragen): Simuliere den echten Grundkenntnistest des Kantons Zürich unter realen Prüfungsbedingungen – 40 zufällige Fragen aus allen 5 Themengebieten, 60 Minuten Zeitlimit und Auswertung nach der offiziellen Bestehensgrenze (mindestens 27 richtige Antworten / 67.5 %).
  • 3. Häufigste Fehler trainieren: Die App merkt sich automatisch jede falsch beantwortete Frage aus Trainings- und Prüfungsrunden und sortiert sie in einer persönlichen Fehler-Rangliste nach Fehlerhäufigkeit, damit du deine Schwachstellen gezielt meisterst.
  • Volltext-Fragenkatalog: Suche jederzeit nach Stichwörtern, Fragenummern oder Kapiteln.
  • 100 % Offline, Werbefrei & Datenschutzfreundlich: Keine Werbung, keine In-App-Käufe, keine Registrierung und keinerlei Datensammlung – dein gesamter Lernfortschritt bleibt lokal auf deinem Gerät.
  ```

---

### English (`en-US`)

- **App Name (max 30 chars):**
  `Zurich Naturalization Test ZH` *(29 chars)*
- **Short Description (max 80 chars):**
  `Prepare for the Canton of Zurich citizenship test with all 350 official questions` *(80 chars)*
- **Full Description:**
  ```text
  Prepare effectively for the Canton of Zurich naturalization basic knowledge test (Kantonaler Grundkenntnistest im Einbürgerungsverfahren)!

  This app includes the complete official catalog of 350 questions, options, answers, coats of arms, flags, and maps across all 5 official chapters and 3 state levels (Bund, Kanton, Gemeinde).

  KEY FEATURES:
  • All 350 Official Questions: Covers Democracy & Federalism, Social State & Civil Society, History, Geography, and Culture & Everyday Life.
  • 1. Training Mode: Practice with instant feedback after every question. Filter by topic, state level (Confederation, Canton, Municipality), or mastery status, in catalog order or shuffled.
  • 2. 40-Question Exam Simulation: Simulate the real Canton of Zurich citizenship test with 40 proportional questions across all 5 topics, a 60-minute timer, and official pass/fail evaluation (at least 27 / 40 correct, 67.5%).
  • 3. Most Failed Questions Trainer: Automatically tracks your mistakes across training and exam rounds and ranks them by failure frequency so you can focus on the questions you miss most often.
  • Searchable 350-Question Catalog: Look up any question by keyword, number, or topic at any time.
  • 100% Offline, Ad-Free & Privacy-First: No ads, no trackers, no login, and no personal data collection.
  ```

---

## 3. Google Play Console "App Content" Questionnaire Answers

1. **Privacy Policy**: `https://github.com/jonathangsc-jonbaraq/zurich-einbuergerung/blob/main/PRIVACY_POLICY.md`
2. **Ads**: Select **"No, my app does not contain ads"**.
3. **App Access**: Select **"All functionality in my app is available without any access restrictions"** (no login required).
4. **Content Rating (IARC)**: Category *Reference, News, or Educational* → Answer **"No"** to all violence, sexuality, profanity, user-generated content, or data sharing questions (receives **PEGI 3 / Everyone**).
5. **Data Safety**: Select **"No, my app does not collect or share any of the required user data types"**.
6. **Government Apps**: If asked whether the app is affiliated with a government entity, declare that it is an **independent educational study aid** based on the publicly available question catalog published by the Canton of Zurich (*Gemeindeamt des Kantons Zürich*, `zh.ch/grundkenntnistest`).
