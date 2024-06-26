const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_GATEWAY_SK);
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const req = require('express/lib/request');
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
        const upcomingCollection = client.db('hostelDB').collection("upcoming");
        const reviewCollection = client.db('hostelDB').collection("reviews");
        const requestCollection = client.db('hostelDB').collection("requests");
        const packageCollection = client.db('hostelDB').collection("packages");
        const paymentCollection = client.db('hostelDB').collection("payments");


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

        app.get('/user/:email', verifyToken, async (req, res) => {
            const query = { email: req.params.email }
            const users = await userCollection.findOne(query);
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

        app.patch("/user-membership/:email", async (req, res) => {
            const membership = req.body;
            const filter = { email: req.params.email };
            const updateMembership = {
                $set: {
                    membership: membership.status,
                }
            }
            const result = await userCollection.updateOne(filter, updateMembership);
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

        app.patch("/meal/:id", async (req, res) => {
            const updateMeal = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateInfo = {
                $set: {
                    title: updateMeal.title,
                    image: updateMeal.image,
                    rating: updateMeal.rating,
                    price: updateMeal.price,
                    category: updateMeal.category,
                    ingredients: updateMeal.ingredients,
                    description: updateMeal.description,
                    distributor_name: updateMeal.distributor_name,
                    distributor_email: updateMeal.distributor_email
                }
            };
            const result = await MealCollection.updateOne(filter, updateInfo);
            res.send(result);
        })

        app.delete("/meal/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await MealCollection.deleteOne(query);
            res.send(result);
        })


        // Upcoming Meal - API 
        app.get("/upcoming-meals", async (req, res) => {
            const result = await upcomingCollection.find().toArray();
            res.send(result);
        })

        app.post("/upcoming-meals", async (req, res) => {
            const upcomingMeal = req.body;
            const result = await upcomingCollection.insertOne(upcomingMeal);
            res.send(result);
        })

        app.delete("/upcoming-meals/:id", async (req, res) => {
            const query = { _id: new ObjectId(req.params.id) };
            const result = await upcomingCollection.deleteOne(query);
            res.send(result);
        })



        // Requested Meal - API 
        app.get("/requested-meals", async (req, res) => {
            const result = await requestCollection.find().toArray();
            res.send(result);
        })

        app.get("/requested-meals/:email", async (req, res) => {
            const query = { email: req.params.email };
            const result = await requestCollection.find(query).sort({ "status": -1 }).toArray();
            res.send(result);
        })

        app.post("/request", async (req, res) => {
            const requestInfo = req.body;
            const result = await requestCollection.insertOne(requestInfo);
            res.send(result);
        })

        app.patch("/request/:id", async (req, res) => {
            const filter = { _id: new ObjectId(req.params.id) };
            const updateReq = {
                $set: {
                    status: "delivered"
                }
            }
            const result = await requestCollection.updateOne(filter, updateReq);
            res.send(result);
        })

        app.delete("/request/:id", async (req, res) => {
            const query = { _id: new ObjectId(req.params.id) };
            const result = await requestCollection.deleteOne(query);
            res.send(result);
        })


        // Reviews collection - API 
        app.get("/reviews", async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })

        app.get("/reviews/:id", async (req, res) => {
            const id = req.params.id;
            const query = { meal_id: id };
            const result = await reviewCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/meal-reviews/:email', async (req, res) => {
            // const email = req.params.email;
            // const query = { email: req.params.email };
            // const result = await reviewCollection.find(query).toArray();
            const result = await reviewCollection.aggregate([
                {
                    $match: { email: `${req.params.email}` }
                },
                {
                    $lookup: {
                        from: "meals",
                        localField: "meal_id",
                        foreignField: "_id",
                        as: "meal_review"
                    }
                },
            ]).toArray();
            // {
            //     $unwind: "$meal_review"
            // },

            res.send(result);
        })

        app.post("/review", async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })

        app.patch("/review/:id", async (req, res) => {
            const updatedReview = req.body;
            const filter = { _id: new ObjectId(req.params.id) };
            const update = {
                $set: {
                    review: updatedReview.editItem,
                }
            }
            const result = await reviewCollection.updateOne(filter, update);
            res.send(result);
        })

        app.delete("/review/:id", async (req, res) => {
            const query = { _id: new ObjectId(req.params.id) };
            const result = await reviewCollection.deleteOne(query);
            res.send(result);
        })


        // Package collection - api 
        app.get("/packages", async (req, res) => {
            const result = await packageCollection.find().toArray();
            res.send(result);
        })

        app.get("/package/:package_name", async (req, res) => {
            const query = { package_name: req.params.package_name };
            const result = await packageCollection.findOne(query);
            res.send(result);
        })


        // Payment Intent - API
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);//Alert: price must be integer.*****

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        })

        // save info in Payment Collection - API
        app.post("/payment", async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            res.send(result);
        })

        app.get("/payment", async (req, res) => {
            const result = await paymentCollection.find().toArray();
            res.send(result);
        })

        app.get("/payment/membership/:email", async (req, res) => {
            const query = { email: req.params.email }
            const result = await paymentCollection.findOne(query);
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