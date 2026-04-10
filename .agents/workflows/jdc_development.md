---
description: How to run the JDC project (Mobile + Backend) locally and setup Firebase
---

# JDC Development Workflow

## 1. Firebase Admin & Flutter Setup
To enable Push Notifications in the app, you need a Firebase project.

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/) and click "Add project".
2. Name it "JDC App" (disable Analytics for now).

### Step 2: Set up `firebase_options.dart` for Flutter
Because you had the missing `firebase_options.dart` file issue:
1. Make sure you have the Firebase CLI installed (`npm install -g firebase-tools`) and run `firebase login`.
2. Install `flutterfire_cli` -> `dart pub global activate flutterfire_cli`.
3. Inside `d:\Final_Year_Project\JDC\jdc_mobile` directory, run:
   ```bash
   flutterfire configure
   ```
4. This command will auto-generate `firebase_options.dart` corresponding to your new Firebase project.

### Step 3: Download Firebase Admin Key for the Backend
Because you lacked `serviceAccountKey.json`:
1. In Firebase Console settings -> **Project settings** (gear icon) -> **Service accounts**.
2. Click **Generate new private key** for the Node.js SDK.
3. Save the downloaded JSON file as `serviceAccountKey.json` inside `d:\Final_Year_Project\JDC\backend\`.

---

## 2. Supabase Settings
1. Go to your Supabase Project dashboard.
2. Open **SQL Editor**.
3. Create a new query, copy the contents of `d:\Final_Year_Project\JDC\jdc_mobile_schema.sql` and run it. This creates the missing tables (`users`, `devices`, `incidents`, `fcm_tokens`).

---

## 3. Running the Stack

// turbo-all

1. **Start the backend server:**
```bash
cd d:\Final_Year_Project\JDC\backend
npm run dev
```

2. **Run the Flutter App:**
(In a new terminal tab):
```bash
cd d:\Final_Year_Project\JDC\jdc_mobile
flutter clean
flutter pub get
flutter run
```
