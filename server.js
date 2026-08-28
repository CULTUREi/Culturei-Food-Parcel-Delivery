const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

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
                    Authorization: 'Bearer YOUR_SECRET_KEY'
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
