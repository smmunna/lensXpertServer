const express = require('express')
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000

//It should be in the top side
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//For using the MongoDB Cloud (online)
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvrwrto.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const database = client.db("lensxpertDB");
        const usersCollection = database.collection("classes");

        // Write down all of your routes;

        


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error (Removed this portion for solving the error)
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('hello from simple server :)')
})


app.listen(port, () => console.log('> Server is up and running on port : ' + port))