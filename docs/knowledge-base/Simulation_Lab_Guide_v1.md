[Simulation_Lab_Guide_v1.md](https://github.com/user-attachments/files/29462618/Simulation_Lab_Guide_v1.md)
# Simulation_Lab_Guide_v1.md
# MomenPix — Simulation Lab Guide
Version 1.0 | June 2026

---

## 1. מה Simulation Lab בודק היום

Simulation Lab בודק את הלוגיקה הפנימית של האפליקציה — בלי מכשיר אמיתי, בלי מצלמה אמיתית, ובלי Firebase אמיתי.

המטרה היא לתפוס תקלות קריטיות לפני שהן מגיעות למשתמשים אמיתיים.

Phase 1 מכסה את הסיכונים הגבוהים ביותר:

- מה קורה כשה-ImageCapture לא קיים בדפדפן
- מה קורה כש-ImageCapture עובד תקין
- שה-Blob לעולם לא מגיע לתור ה-Upload או ל-IDB
- מה קורה כש-Cloudinary נכשל

---

## 2. ארבע הבדיקות של Phase 1

| מספר | שם | מה נבדק |
|---|---|---|
| MVP-01 | ImageCapture לא קיים | האפליקציה עוברת אוטומטית למסלול המצלמה הרגיל — בלי קריסה |
| MVP-02 | ImageCapture עובד תקין | התמונה עוברת: Blob ← מסך ← watermark ← dataURL ← uploadPhoto |
| MVP-03 | Blob לא מגיע ל-uploadPhoto | הכלל הקריטי ביותר — uploadPhoto מקבל תמיד string, לעולם לא Blob |
| MVP-04 | Cloudinary נכשל | הפריט נשאר בתור ה-IDB — לא אובד |

---

## 3. איך מריצים את הבדיקות

### בדיקות סטטיות

פותחים טרמינל בתיקיית הפרויקט ומריצים:

```
node tests/check-index.js
```

תוצאה צפויה: 160/160 ✅

---

### בדיקות Playwright רגילות

```
npx playwright test
```

תוצאה צפויה: 17/17 ✅

---

### בדיקות Simulation

```
npx playwright test -c playwright.simulation.config.js
```

תוצאה צפויה: 4/4 ✅

---

## 4. מה PASS ומה FAIL בכל בדיקה

### MVP-01 — ImageCapture לא קיים

| תוצאה | קריטריון |
|---|---|
| PASS | האפליקציה לא קורסת, מסלול המצלמה הרגיל רץ, אין Blob ב-IDB |
| FAIL | קריסה, שגיאה בקונסול הקשורה ל-ImageCapture, או Blob ב-IDB |

---

### MVP-02 — ImageCapture עובד תקין

| תוצאה | קריטריון |
|---|---|
| PASS | הפונקציה רצה בלי שגיאה, אין Blob ב-IDB, כל פריט ב-IDB מתחיל ב-data: |
| FAIL | שגיאת JavaScript, Blob הגיע ל-IDB, או uploadPhoto לא נקרא |

---

### MVP-03 — Blob לא מגיע ל-uploadPhoto

| תוצאה | קריטריון |
|---|---|
| PASS | uploadPhoto נקרא תמיד עם string שמתחיל ב-data: — לעולם לא עם Blob |
| FAIL | uploadPhoto קיבל Blob, או שהסוג של הארגומנט אינו string |

---

### MVP-04 — Cloudinary נכשל

| תוצאה | קריטריון |
|---|---|
| PASS | אחרי כל הניסיונות — הפריט עדיין נמצא ב-IDB, לא אבד |
| FAIL | הפריט נעלם מה-IDB אחרי כישלון, כלומר נמחק בטעות |

---

## 5. מה עדיין לא מכוסה

| נושא | סיבה |
|---|---|
| כניסה למערכת (Login) | דורש Firebase Emulator — Phase 2 |
| צילום בלי חיבור לאינטרנט (Offline) | דורש Firebase Auth — Phase 2 |
| חזרה לאינטרנט וריקון התור (Queue Drain) | דורש Firebase Auth — Phase 2 |
| הפרדת Admin מ-Owner בצורה מלאה | דורש Firebase Auth — Phase 2 |
| מצב לילה (Night Mode) | דורש מצלמה אמיתית — ידני בלבד |
| פלאש/פנס | דורש מכשיר אמיתי — ידני בלבד |
| Burst mode על מכשיר אמיתי | דורש מכשיר אמיתי — ידני בלבד |

---

## 6. מה נשאר ידני

הדברים האלה לא ניתן לבדוק במחשב — חייבים טלפון אמיתי:

| בדיקה | מכשיר |
|---|---|
| איכות התמונה בפועל — האם מעל 2000px | Android Chrome |
| Watermark נראה בתמונה שנשמרה ב-Cloudinary | Android Chrome |
| Burst mode עובד אחרי הוספת ImageCapture | Android Chrome |
| האפליקציה עובדת על iPhone ב-Safari | iPhone Safari |
| צילום יחיד על Android — 3 תמונות ברצף | Android Chrome |

הבדיקות האלה מתועדות ב-ImageCapture Validation Checklist שנוצר מוקדם יותר.

---

## 7. תנאים לפתיחת Phase 2

Phase 2 יפתח רק אחרי שכל התנאים האלה מתקיימים:

| תנאי | סטטוס |
|---|---|
| Phase 1 רץ ירוק מקומית — 4/4 | ממתין לאימות מקומי |
| CI ירוק אחרי העלאת הקבצים | ✅ אושר |
| 160/160 static tests עדיין עוברים | ✅ אושר |
| 17/17 Playwright UI tests עדיין עוברים | ממתין לאימות מקומי |
| אישור מפורש לפתיחת Phase 2 | ממתין |

Phase 2 ידרוש:

- Firebase Emulator (Auth + Firestore)
- קובץ `.env.test` עם כתובות ה-Emulator
- חבילת `wait-on` ב-package.json
- שינוי בקובץ GitHub Actions

---

## 8. איפה הקבצים נמצאים

```
snaptogether2/
│
├── playwright.simulation.config.js     ← הגדרות להרצת simulation בלבד
│
└── tests/
    ├── check-index.js                  ← בדיקות סטטיות (160 בדיקות) — לא שונה
    ├── ui.spec.js                      ← בדיקות Playwright רגילות (17 בדיקות) — לא שונה
    │
    ├── mocks/
    │   ├── imagecapture.mock.js        ← מדמה ImageCapture: קיים / נכשל / לא קיים
    │   ├── cloudinary.mock.js          ← מדמה Cloudinary: הצלחה / כישלון
    │   └── idb.mock.js                 ← קורא את תור ה-IDB לצורך אימות
    │
    └── simulation/
        ├── camera.sim.spec.js          ← MVP-01, MVP-02, MVP-03
        └── upload.sim.spec.js          ← MVP-04
```

---

*מסמך זה מתעדכן בתחילת כל Phase חדש.*
*לא לשנות קוד ייצור לפני אישור מפורש.*
