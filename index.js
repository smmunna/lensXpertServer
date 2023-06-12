const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const jwt = require('jsonwebtoken');

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

// VERIFY JWT FUNCTION
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization
    // console.log(authorization)
    if (!authorization) {
        return res.send({ error: 'Error occured', message: "You can not access this." })
    }
    const token = authorization.split(' ')[1]
    // console.log(token)
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decode) => {
        if (error) {
            return res.send({ error: 'Error occured', message: "You can not access this." })
        }
        req.decode = decode
        next()
    })
}



async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const database = client.db("lensxpertDB");
        const classesCollection = database.collection("classes");
        const instructorsCollection = database.collection("instructors");
        const cartsCollection = database.collection("carts");
        const usersCollection = database.collection("users");
        const paymentsCollection = database.collection("payments");

        // Write down all of your routes;

        // ---------------------------------------------



        // JWT IMPLEMENTATION
        // Jwt procedure for signin token;
        app.post('/jwt', async (req, res) => {
            const user = req.body.email;
            // console.log(user)
            const token = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            })
            // console.log(token)
            res.send({ token })

        })

        // Updating the number of students;
        app.patch('/updatestudentsnumber/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await classesCollection.findOne(query);

                if (!result) {
                    return res.status(404).send({ message: 'Class not found' });
                }

                // Update the fields
                const updatedResult = await classesCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $inc: { availableSeats: -1, numberOfStudents: 1 },
                    }
                );

                res.send({ message: 'Class updated successfully' });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Error updating class' });
            }
        });


        // Getting all the instructors
        app.get('/instructors', async (req, res) => {
            const result = await instructorsCollection.find().toArray()
            res.send(result)
        })
        // Sorting by number of students; higher students will show first;
        app.get('/topclasses', async (req, res) => {
            const result = await classesCollection.find().sort({ numberOfStudents: -1 }).toArray();
            res.send(result);
        });

        // Getting the totalClass;  
        app.get('/totalStudents', async (req, res) => {
            const result = await usersCollection.estimatedDocumentCount();
            res.send({ totalStudents: result })
        })
        app.get('/totalProducts', async (req, res) => {
            const result = await classesCollection.estimatedDocumentCount();
            res.send({ totalProducts: result })
        })

        // Classes Pagination
        app.get('/products', async (req, res) => {
            // console.log(req.query)
            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 5;
            const skip = page * limit;
            const result = await classesCollection.find().skip(skip).limit(limit).toArray()
            res.send(result)
        })

        // Search Classes;
        app.get('/search', async (req, res) => {
            const searchQuery = req.query.name
            const regexPattern = new RegExp(searchQuery, 'i')
            const result = await classesCollection.find({ name: regexPattern }).toArray()
            res.send(result)
        })


        // Getting the instrutor classes based on the maill
        app.get('/classes/myclasses', async (req, res) => {
            query = { instructorEmail: req.query.email }
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
            const query = { email: users.email }
            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: "User already exist" })
            }
            const result = await usersCollection.insertOne(users)
            res.send(result)
        })

        // Payment Hisstory for status completed for user by admin
        app.get('/userpaymenthistory', verifyJWT, async (req, res) => {
            // console.log(req.headers.authorization)
            const decode = req.decode
            // console.log('Comeback after decode',decode.user)
            if (decode.user !== req.query.email) {
                res.status(403).send("Unauthorized access")
            }
            let query = {}
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await paymentsCollection.find(query).toArray()
            res.send(result);
        })
        app.post('/paymenthistory/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: `completed`
                },
            };
            const result = await paymentsCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })
        app.get('/paymenthistory', async (req, res) => {
            const result = await paymentsCollection.find().toArray()
            res.send(result);
        })


        // Cart Payment total

        // Create a PaymentIntent with the order amount and currency
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = parseFloat(price * 100);
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

        // Delete all the carts item from the carts after successfull payments;
        app.delete('/deleteallcartsitems', async (req, res) => {
            const email = req.query.email;
            const query = { usermail: email };
            const result = await cartsCollection.deleteMany(query);
            res.send(result);
        })


        // Delete from Carts
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.deleteOne(query)
            res.send(result)
        })
        app.get('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.findOne(query)
            res.send(result)
        })

        // Add to cart;
        app.get('/carts', async (req, res) => {
            query = { usermail: req.query.email }
            // Showing the result;
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

        // valuable classes by the number of students;
        app.get('/priorityclass', async (req, res) => {
            const result = await classesCollection.find().sort({ numberOfStudents: 1 }).toArray()
            res.send(result)
        })
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