const express = require('express');
const axios = require('axios');
const path = require('path');
const twilio = require('twilio');
const admin = require('firebase-admin');
const cors = require('cors'); // <-- ADDED

// Initialize Firebase Admin SDK with error handling
let serviceAccount;
try {
    serviceAccount = require('./serviceAccountKey.json');
    console.log('✅ Service account loaded successfully');
} catch (error) {
    console.error('❌ Failed to load serviceAccountKey.json:', error.message);
    console.error('Make sure the file exists and is valid JSON.');
    process.exit(1);
}

// Validate JSON structure
if (!serviceAccount.type || !serviceAccount.project_id) {
    console.error('❌ Invalid serviceAccountKey.json – missing required fields.');
    console.error('Re-download from Firebase Console.');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3000;

// Twilio client – with fallback for missing env vars
const client = twilio(
    process.env.TWILIO_SID || 'missing_sid',
    process.env.TWILIO_AUTH_TOKEN || 'missing_token'
);
const VERIFY_SID = process.env.VERIFY_SERVICE_SID || 'missing_verify_sid';

// ===== CORS MIDDLEWARE =====
app.use(cors()); // <-- ADDED
app.use(express.json());
app.use(express.static(__dirname));

// ============ OTP ENDPOINTS ============

// Send OTP
app.post('/send-otp', async (req, res) => {
    const { phone, role } = req.body;

    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    // Check Twilio credentials
    if (VERIFY_SID === 'missing_verify_sid') {
        return res.status(500).json({ error: 'Twilio Verify Service SID not configured' });
    }

    try {
        const verification = await client.verify.v2.services(VERIFY_SID)
            .verifications.create({
                to: phone,
                channel: 'sms'
            });

        await db.collection('otps').add({
            phone,
            role: role || 'customer',
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'OTP sent successfully!' });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Verify OTP
app.post('/verify-otp', async (req, res) => {
    const { phone, code } = req.body;

    if (!phone || !code) {
        return res.status(400).json({ error: 'Phone and code are required' });
    }

    try {
        const verificationCheck = await client.verify.v2.services(VERIFY_SID)
            .verificationChecks.create({
                to: phone,
                code: code
            });

        if (verificationCheck.status === 'approved') {
            const snapshot = await db.collection('otps')
                .where('phone', '==', phone)
                .where('status', '==', 'pending')
                .get();

            let role = 'customer';
            snapshot.forEach(doc => {
                role = doc.data().role || 'customer';
                doc.ref.update({ status: 'verified' });
            });

            res.json({ success: true, role });
        } else {
            res.status(400).json({ error: 'Invalid or expired OTP' });
        }
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(400).json({ error: error.message });
    }
});

// ============ EXISTING PAYMENT ENDPOINT ============

app.post('/verify-payment', async (req, res) => {
    const { reference } = req.body;

    if (!reference) {
        return res.status(400).json({
            success: false,
            error: 'Payment reference is missing'
        });
    }

    try {
        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                }
            }
        );

        if (response.data.data.status === 'success') {
            return res.json({ success: true });
        }

        return res.json({ success: false });

    } catch (error) {
        console.error('Paystack verification error:', error.response?.data || error.message);

        return res.status(500).json({
            success: false,
            error: 'Verification failed'
        });
    }
});

// Serve index.html for other routes
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
});