let storedData = []; // In-memory storage (use a database in production)

export default function handler(req, res) {
  if (req.method === 'POST') {
    const data = req.body;
    console.log('Webhook received:', JSON.stringify(data, null, 2));

    // Store the data
    storedData.push(data);

    res.status(200).json({ message: 'Webhook received successfully' });
  } else if (req.method === 'GET') {
    // Send the stored data back to the client
    res.status(200).json(storedData);

    // Optionally clear the data after fetching it
    storedData = [];
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
