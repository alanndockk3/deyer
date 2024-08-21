// /api/webhook.js

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Log the received webhook payload
    console.log('Webhook received:', req.body);

    // Process the webhook payload
    const { type, data } = req.body;

    // Handle different webhook types if necessary
    if (type === 'TRANSFER') {
      // Do something with the transfer data
      console.log('Processing transfer:', data);
      
      // Example: You can store this data in a database or trigger some actions
    }

    // Send a 200 status to indicate successful processing
    res.status(200).json({ message: 'Webhook received successfully' });
  } else {
    // Handle any other HTTP methods
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
