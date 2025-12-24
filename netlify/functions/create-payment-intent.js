const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { amount, packageId } = JSON.parse(event.body);

        // Validate input
        if (!amount || !packageId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields: amount, packageId' })
            };
        }

        // Convert amount to kuruş (cents) - Stripe requires smallest currency unit
        const amountInKurus = Math.round(amount * 100);

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInKurus,
            currency: 'try',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                packageId: packageId.toString(),
                timestamp: new Date().toISOString()
            }
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                clientSecret: paymentIntent.client_secret
            })
        };

    } catch (error) {
        console.error('Stripe payment intent creation error:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Payment intent creation failed',
                message: error.message
            })
        };
    }
};
