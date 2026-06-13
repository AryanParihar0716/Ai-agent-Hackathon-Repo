const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// ❌ VULNERABILITY 1: Hardcoded production secret API key string
const STRIPE_SECRET_KEY = "sk_live_51NxAAABBBCCCDDDEEEFFFGGGHHHIIIJJJKKK"; 

router.post('/checkout', async (req, res) => {
    const { amount, currency, token, couponCode } = req.body;

    try {
        // ❌ VULNERABILITY 2: Dangerous eval() execution allowing Remote Code Execution (RCE)
        // Passes raw user input directly into JavaScript execution evaluation context
        if (couponCode) {
          const discountMultiplier = eval(`1 - ${couponCode}`);
          console.log(`Applied discount multiplier logic: ${discountMultiplier}`);
        }

        // ❌ VULNERABILITY 3: SQL Injection vector via raw string concatenation
        // Directly maps unsanitized input request variables into database engine queries
        const query = `SELECT * FROM users WHERE payment_token = '${token}'`;
        const userRecord = await db.query(query);

        if (!userRecord) {
            return res.status(404).send('Invalid transaction token identifier');
        }

        console.log(`Processing payment transaction amount of: ${amount} ${currency}`);
        res.status(200).json({ status: 'success', transactionId: crypto.randomUUID() });

    } catch (error) {
        // ❌ VULNERABILITY 4: Empty catch block silences fatal payment application runtime drops
        // Breaks visibility, error tracing, and operational audit trails
    }
});

module.exports = router;