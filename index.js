const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bm0qnz4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // await client.connect();


        const userCollection = client.db('hostelDB').collection("users");
        const MealCollection = client.db('hostelDB').collection("meals");


        // jwt api 
        app.post("/jwt", async (req, res) => {
            const userEmail = req.body;
            const token = jwt.sign(
                userEmail,
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: "1h" }
            );
            res.send({ token });
            console.log('token jwt api:', token);
        })

        // jwt middleware 
        const verifyToken = async (req, res, next) => {
            console.log("token middle:", req.headers.authorization);
            // jwt authorization
            if (!req.headers.authorization) {
                return res.status(403).send({ message: "access forbidden" });
            }
            const token = req.headers.authorization.split(" ")[1];
            console.log('split token:', token);
            // jwt verification
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: "Unauthorized access" });
                }
                req.decoded = decoded;
                next();
            })
        }

        // Users API >>>>>>
        app.get('/users', verifyToken, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            // if (email !== req.decoded.email) {
            //     return res.status(403).send({ message: "forbidden access" });
            // }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = (user?.role === "admin");
            }
            res.send({ admin })

        })

        app.post('/users', async (req, res) => {
            const user = req.body;

            // to stop re-insert of register user 
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "user already existing", insertedId: null });
            }

            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.patch("/user/:email", async (req, res) => {
            const filter = { email: req.params.email };
            const updateUser = {
                $set: {
                    role: "admin",
                }
            }
            const result = await userCollection.updateOne(filter, updateUser);
            res.send(result);
        })


        // meal collection api >>>>>>>
        app.get("/meals", async (req, res) => {
            const allMeals = await MealCollection.find().toArray();
            res.send(allMeals);
        })

        app.get("/meal/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const meal = await MealCollection.findOne(query);
            res.send(meal);
        })

        app.post("/meal", async (req, res) => {
            const meal = req.body;
            const result = await MealCollection.insertOne(meal);
            res.send(result);
        })

        app.delete("/meal/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await MealCollection.deleteOne(query);
            res.send(result);
        })





        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Hostel meals management is running >>>>>')
})

app.listen(port, () => {
    console.log(`Hostel meals management is running on port ${port}`)
})