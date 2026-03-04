const { MongoClient } = require('mongodb');

async function run() {
  const uri = "mongodb://admin:admin123@localhost:57428/aspire-admin-db?authSource=admin";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db('aspire-admin-db');
    const documents = database.collection('documents');

    const docs = await documents.find({}).sort({createdAt: -1}).limit(2).toArray();
    console.log(JSON.stringify(docs, null, 2));
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
