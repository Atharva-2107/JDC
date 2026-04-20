import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  admin.initializeApp({
    credential: admin.credential.cert(path.join(__dirname, 'serviceAccountKey.json')),
  });
  console.log('✅ Firebase Admin initialized successfully.');
} catch (err) {
  console.log('⚠️ Firebase Admin initialization failed (missing or invalid serviceAccountKey.json). Push notifications will not work.');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function sendCrashAlertNotification(userId, incidentId, lat, lng) {
  try {
    const { data: tokens, error } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', userId);

    if (error || !tokens?.length) {
      console.log(`No FCM tokens for user ${userId}`);
      return;
    }

    const tokenList = tokens.map((t) => t.token);

    const message = {
      notification: {
        title: '🚨 CRASH DETECTED',
        body: 'Your JDC device detected a crash. Tap to respond immediately.',
      },
      data: {
        type: 'crash_alert',
        incident_id: String(incidentId),
        lat: String(lat),
        lng: String(lng),
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'jdc_crash_alert',
          priority: 'max',
          defaultVibrateTimings: false,
          vibrateTimingsMillis: [0, 500, 200, 500, 200, 500],
          defaultSound: true,
          color: '#E8002D',
          icon: 'ic_launcher',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: '🚨 CRASH DETECTED',
              body: 'Your JDC device detected a crash. Tap to respond immediately.',
            },
            sound: 'default',
            badge: 1,
            'interruption-level': 'critical',
          },
        },
      },
      tokens: tokenList,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`FCM crash alert sent: ${response.successCount} success, ${response.failureCount} failed`);

    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code;
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          supabase.from('fcm_tokens').delete().eq('token', tokenList[idx]).then();
        }
      }
    });

    return response;
  } catch (err) {
    console.error('FCM error:', err);
  }
}

export async function sendClaimedNotification(userId, incidentId, claimedBy) {
  try {
    const { data: tokens } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', userId);

    if (!tokens?.length) return;

    await admin.messaging().sendEachForMulticast({
      notification: {
        title: '✅ Help is on the way',
        body: `${claimedBy} has responded to your crash alert.`,
      },
      data: {
        type: 'claimed',
        incident_id: incidentId,
      },
      android: {
        priority: 'high',
        notification: { channelId: 'jdc_info' },
      },
      tokens: tokens.map((t) => t.token),
    });
  } catch(e) {
      console.error('FCM Claim Notification Error', e);
  }
}
