import express from 'express';
import twilio from 'twilio';

const router = express.Router();

router.post('/alert', async (req, res) => {
  const { userId, severity, location, lat, lng, deviceId, userName, vehiclePlate, bloodGroup, isAutoDispatch } = req.body;
  const { supabase } = req;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'Missing userId' });
  }

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    const twilioWhatsapp = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

    if (!accountSid || !authToken || !twilioNumber) {
      console.warn('⚠️ Twilio credentials missing. Emergency contacts not notified.');
      return res.json({ success: true, twilioNotConfigured: true, message: 'Crash recorded but Twilio not configured.' });
    }

    const client = twilio(accountSid, authToken);

    // Fetch emergency contacts
    const { data: contacts, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching contacts:', error);
      return res.status(500).json({ success: false, message: 'Database error fetching contacts' });
    }

    if (!contacts || contacts.length === 0) {
      console.log(`No emergency contacts for user ${userId}`);
      return res.json({ success: true, message: 'Crash recorded. No emergency contacts to notify.' });
    }

    const mapsLink = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : location;
    const dispatchType = isAutoDispatch ? '🤖 AUTO-DISPATCHED (no response in 15s)' : '🆘 MANUAL SOS TRIGGER';

    let messageBody = `🚨 JDC EMERGENCY ALERT 🚨\n`;
    messageBody += `${dispatchType}\n\n`;
    messageBody += `👤 Victim: ${userName || 'Unknown'}\n`;
    if (bloodGroup) messageBody += `🩸 Blood Group: ${bloodGroup}\n`;
    if (vehiclePlate) messageBody += `🚗 Vehicle: ${vehiclePlate}\n`;
    messageBody += `⚠️ Severity: ${severity?.toUpperCase() || 'HIGH'}\n`;
    messageBody += `📍 Location: ${mapsLink}`;

    const twimlVoice = `
      <Response>
         <Say voice="alice">Emergency Alert from JDC crash detection system.</Say>
         <Pause length="1"/>
         <Say voice="alice">A crash has been detected involving ${userName || 'your contact'}.</Say>
         <Pause length="1"/>
         ${bloodGroup ? `<Say voice="alice">Blood group is ${bloodGroup}.</Say><Pause length="1"/>` : ''}
         <Say voice="alice">Please check your text messages immediately for the exact GPS location.</Say>
         <Pause length="2"/>
         <Say voice="alice">Repeating. A crash has been detected. Check your messages for location. Goodbye.</Say>
      </Response>
    `;

    console.log(`Dispatching alerts to ${contacts.length} contacts for user ${userId}...`);
    const dispatchPromises = [];

    for (const contact of contacts) {
      let contactNumber = contact.phone;
      // BUG FIX #3: Fix double-escaped regex — was '\\\\D', should be '\\D'
      if (!contactNumber.startsWith('+')) {
        contactNumber = '+91' + contactNumber.replace(/\D/g, '');
      }

      // SMS
      dispatchPromises.push(
        client.messages.create({ body: messageBody, from: twilioNumber, to: contactNumber })
          .then(r => console.log(`SMS → ${contactNumber} (SID: ${r.sid})`))
          .catch(err => console.error(`SMS failed → ${contactNumber}:`, err.message))
      );

      // WhatsApp
      dispatchPromises.push(
        client.messages.create({ body: messageBody, from: twilioWhatsapp, to: `whatsapp:${contactNumber}` })
          .then(r => console.log(`WhatsApp → ${contactNumber} (SID: ${r.sid})`))
          .catch(err => console.error(`WhatsApp failed → ${contactNumber}:`, err.message))
      );

      // Voice Call
      dispatchPromises.push(
        client.calls.create({ twiml: twimlVoice, to: contactNumber, from: twilioNumber })
          .then(r => console.log(`Call → ${contactNumber} (SID: ${r.sid})`))
          .catch(err => console.error(`Call failed → ${contactNumber}:`, err.message))
      );
    }

    await Promise.allSettled(dispatchPromises);
    res.json({ success: true, message: `Emergency alerts dispatched to ${contacts.length} contact(s)` });

  } catch (e) {
    console.error('Emergency dispatch error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
