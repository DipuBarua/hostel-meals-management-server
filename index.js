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
        await client.connect();


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
        })

        // jwt middleware 
        const verifyToken = async (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(403).send({ message: "access forbidden" });
            }
            const token = req.headers.authorization.split(" ")[1];

            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: "Unauthorized" });
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