require('dotenv').config();

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using environment variables
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

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
