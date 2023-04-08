const express = require('express');
const bodyParser = require('body-parser');
const mongodb = require('mongodb');
const stripe = require('stripe')('sk_test_51MuRVpGkOBZlJUoJnfHSceLmbcvStjTesvjxCTyS7wzvA68tztlLOwd13RqWWg42X3MX6bfz1fIQyLJrWbF9HoVr00F0HcsTUJ');
const nodemailer = require('nodemailer');
const path = require('path');

// Connect to MongoDB
const MongoClient = mongodb.MongoClient;
const uri = "mongodb+srv://est:yLvwzxRC1J3ozhJo@cluster0.rmvzzax.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Set up the email transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'g6lw3mrk6o2z8jnf@gmail.com',
    pass: 'Lucifer.44'
  }
});

// Create the Express app
const app = express();

// Set up the middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Set up the routes
app.post('/payment', async (req, res) => {
  const amount = 1000; // $10 USD in cents
  const email = req.body.email;
  const discordId = req.body.discordId;

  // Create a payment intent with Stripe
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd'
  });

  // Return the client_secret to the client
  res.send({ client_secret: paymentIntent.client_secret });
});

app.post('/complete-payment', async (req, res) => {
  const paymentIntentId = req.body.paymentIntentId;
  const email = req.body.email;
  const discordId = req.body.discordId;

  // Confirm the payment with Stripe
  const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

  if (paymentIntent.status === 'succeeded') {
    // Generate a random key
    const key = generateRandomKey();

    // Store the user data in MongoDB
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const database = client.db('api-keys');
      const collection = database.collection('users');
      const result = await collection.insertOne({ email, discordId, key });
    } finally {
      await client.close();
    }

    // Send an email to the user with the key
    const mailOptions = {
      from: 'g6lw3mrk6o2z8jnf@gmail.com',
      to: email,
      subject: 'Your API Key',
      text: `Thank you for your payment! Your API key is ${key}.`
    };
    await transporter.sendMail(mailOptions);

    // Return a success message to the client
    res.send({ success: true });
  } else {
    // Return an error message to the client
    res.send({ success: false, message: 'Payment failed' });
  }
});

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(8080, () => {
  console.log('Server started on port 8080');
});

// Helper function to generate a random key
function generateRandomKey() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < 32; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
