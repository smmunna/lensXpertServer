const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

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
        const classesCollection = database.collection("classes");
        const instructorsCollection = database.collection("instructors");
        const cartsCollection = database.collection("carts");
        const usersCollection = database.collection("users");
        const paymentsCollection = database.collection("payments");

        // Write down all of your routes;

        // Getting the instrutor classes based on the mail
        app.get('/classes/myclasses', async (req, res) => {
            const email = req.query.email;
            const query = { instructorEmail: email }
            const result = await classesCollection.find(query).toArray()
            res.send(result)
        })
        // Users api;
        // Making the admin;
        app.post('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    role: `admin`
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })
        // Making the instructor;
        app.post('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    role: `instructor`
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        // Getting the all valid user
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })
        // Insert SignUp user
        app.post('/users', async (req, res) => {
            const users = req.body;
            const result = await usersCollection.insertOne(users)
            res.send(result)
        })

        // Cart Payment total

        // Create a PaymentIntent with the order amount and currency
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: [
                    "card"
                ],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });

        });

        app.post('/payments', async (req, res) => {
            const payments = req.body;
            const result = await paymentsCollection.insertOne(payments)
            const query = { _id: { $in: payments.itemid.map(id => new ObjectId(id)) } }
            const deleteResult = await cartsCollection.deleteMany(query)
            res.send({ result, deleteResult })
        })

        // Delete from Carts
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.deleteOne(query)
            res.send(result)
        })

        // Add to cart;
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { usermail: email };
            const result = await cartsCollection.find(query).toArray();
            res.send(result);
        });

        // New Item adding for class
        app.post('/classes', async (req, res) => {
            const cartItem = req.body;
            const result = await cartsCollection.insertOne(cartItem)
            res.send(result)
        })

        // Pending Update
        app.post('/classes/status/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: `approved`
                },
            };
            const result = await classesCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        app.get('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await classesCollection.findOne(query)
            res.send(result)
        })

        // Get All the Instructors
        app.get('/instructors', async (req, res) => {
            const result = await instructorsCollection.find().toArray()
            res.send(result)
        })

        // All the added Classes;


        app.post('/classes/addclass', async (req, res) => {
            const classes = req.body;
            const result = await classesCollection.insertOne(classes)
            res.send(result)
        })
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray()
            res.send(result)
        })


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