// /api/webhook.js

const admin = require('firebase-admin');

const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const data = req.body;
    console.log('Webhook received:', JSON.stringify(data, null, 2));

    // Process the data as needed
    if (Array.isArray(data)) {
      data.forEach(async (transaction) => {
        const { type, accountData } = transaction;

        if (type === 'TRANSFER') {
          accountData.forEach(async (account) => {
            const { signature, source, destination, amount } = account;

            // Store transaction details in Firestore
            const transactionDetails = {
              signature,
              amount,
              source,
              destination,
              timestamp: new Date().toISOString(),
            };

            try {
              await storeTransactionDetails(signature, transactionDetails);
              const senderWalletDocId = await checkWalletInDatabase(source);
              if (senderWalletDocId) {
                console.log(`Sender wallet ${source} exists in the database.`);
                await updateFirebaseDocumentSequentially(senderWalletDocId, {
                  transactions: admin.firestore.FieldValue.arrayUnion(signature),
                });
              } else {
                console.log(`Sender wallet ${source} does not exist in the database.`);
              }
            } catch (error) {
              console.error('Error processing transaction:', error);
            }
          });
        }
      });
    }

    res.status(200).json({ message: 'Webhook received successfully' });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Store transaction details in Firestore
async function storeTransactionDetails(signature, transactionDetails) {
  try {
    const transactionRef = db.collection('transactions').doc(signature);
    await transactionRef.set(transactionDetails);
    console.log(`Transaction stored with signature ${signature}:`, transactionDetails);
  } catch (error) {
    console.error('Error storing transaction details:', error);
  }
}

// Function to check if a wallet exists in the database
async function checkWalletInDatabase(walletAddress) {
  console.log(`Checking if wallet ${walletAddress} exists in the database...`);

  try {
    const querySnapshot = await db.collection('wallets')
      .where('wallet_address', '==', walletAddress)
      .limit(1)
      .get();

    if (!querySnapshot.empty) {
      console.log('Wallet found in the database:', walletAddress);
      return querySnapshot.docs[0].id; // Return the document ID
    } else {
      console.log('Wallet not found in the database:', walletAddress);
      return null;
    }
  } catch (error) {
    console.error('Error querying wallet in database:', error);
    return null;
  }
}

// Function to update a Firebase document sequentially
async function updateFirebaseDocumentSequentially(docId, updateData) {
  try {
    const docRef = db.collection('wallets').doc(docId);
    await docRef.update(updateData);
    console.log(`Document ${docId} updated successfully.`);
  } catch (error) {
    console.error('Error updating document:', error);
  }
}
