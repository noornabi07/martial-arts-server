const express = require('express');
const app = express();
require('dotenv').config()
const jwt = require('jsonwebtoken');
const cors = require('cors')
const stripe = require('stripe')(process.env.Payment_secret_key);
const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json())

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' })
  }

  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cnuoch3.mongodb.net/?retryWrites=true&w=majority`;

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

    const usersCollection = client.db("martialDB").collection("allusers");
    const instructorsCollection = client.db("martialDB").collection("instructors");
    const classesCollection = client.db("martialDB").collection("classes")
    const studentSelectClassCollection = client.db("martialDB").collection("selectClass");
    const paymentCollection = client.db("martialDB").collection("payment");


    // json web token relate
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token });
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        res.status(403).send({ error: true, message: 'unauthorized user token' });
      }
      next()
    }

    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'instructor') {
        res.status(403).send({ error: true, message: 'unauthorized user token' });
      }
      next()
    }

    const limit = 6;


    // allusers get data here
    app.get('/allinstructors', async (req, res) => {
      const result = await usersCollection.find({ role: "instructor" }).toArray();
      res.send(result);
    })

    // ***************************
    app.get('/allApprovedClass', async(req, res) =>{
      const result = await classesCollection.find({status: "approved"}).toArray();
      res.send(result);
    })

    // ***************************

    app.get('/enrolledClass/:email', async(req, res) =>{
      const email = req.params.email;
      const query = {email: email};
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/enrolled', async(req, res) =>{
      const result = await paymentCollection.find().toArray();
      res.send(result);
    })

    // popular classes
    app.get('/popularClasses',async(req,res)=>{
      const result = await classesCollection.find({status:"approved"}).sort({student: -1}).toArray();
      res.send(result);
    })

    // popular instructor
    app.get('/popularInstructors', async(req, res) =>{
      const result = await usersCollection.find({ role: "instructor" }).limit(limit).toArray();
      res.send(result);
    })

    // ********************



    // all users get admin handle related api
    app.post('/allusers', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User Already Exsited' });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })


    app.get('/allusers', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })


    // admin check related api
    app.get('/allusers/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' };
      res.send(result);
    })

    app.patch('/allusers/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.patch('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'approved'
        }
      }
      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.patch('/classes/deny/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'deny'
        }
      }
      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    })


    // instructor related api
    app.get('/allusers/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' };
      res.send(result);
    })

    app.get('/myClasses/:email', async(req, res) => {
      const email = req.params.email;
      const query = {email: email};
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    })


// TODO: verifyJWT, using this *************************
    app.get('/classes', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }
      const query = { email: email }
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    })
    // *******************



    app.patch('/allusers/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.get('/allInstructors', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.post('/instructors', verifyJWT, verifyInstructor, async (req, res) => {
      const newInstructor = req.body;
      const result = await instructorsCollection.insertOne(newInstructor);
      res.send(result);
    })

    app.post('/classes', verifyJWT, verifyInstructor, async (req, res) => {
      const newClass = req.body;
      const result = await classesCollection.insertOne(newClass);
      res.send(result);
    })  
    
    // Admin deny and send feedback instructor class findOne
    app.put('/addClasses/:id', async (req, res) => {
      const id = req.params.id;
      const feedback = req.body.feedback; // Assuming the new seat value is provided in the request body

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $push: { feedback: feedback } // Push the new seat value to the "availableSeats" array field
      };

      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    })


    // *****************
    app.get('/allClasses', async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result)
    })
    // ******************

    app.get('/selectClass', verifyJWT, async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }

      const query = { email: email }
      const result = await studentSelectClassCollection.find(query).toArray();
      res.send(result);
    })

    app.delete('/selectClass/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await studentSelectClassCollection.deleteOne(query);
      res.send(result);
    })

    app.get("/selectClass/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await studentSelectClassCollection.findOne(query);
      res.send(result);
    });

    app.post("/selectClass", async (req, res) => {
      const item = req.body;

      const query = { selectClassId: item.selectClassId };
      const existingCart = await studentSelectClassCollection.findOne(query);

      if (existingCart) {
        return res.send({ message: "user already exists" });
      }

      const result = await studentSelectClassCollection.insertOne(item);
      return res.send(result);
    });

    // create payment intent
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      const id = payment.id;
      console.log(id);
      const filter = { id: id };
      const query = {
        _id: new ObjectId(id),
      };
      const existingPayment = await paymentCollection.findOne(filter);
      if (existingPayment) {
        return res.send({ message: "Already Enrolled This Class" })
      }
      const insertResult = await paymentCollection.insertOne(payment);
      const deleteResult = await studentSelectClassCollection.deleteOne(query);
      return res.send({ insertResult, deleteResult });
    });


    app.patch("/all-classes/seats/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateClass = await classesCollection.findOne(filter);
      if (!updateClass) {
        return;
      }
      const updateEnrollStudent = updateClass.student + 1;
      const updatedAvailableSeats = updateClass.seats - 1;
      const update = {
        $set: {
          seats: updatedAvailableSeats,
          student: updateEnrollStudent,
        },
      };
      const result = await classesCollection.updateOne(filter, update);
      res.send(result);
    });

    // TODO: verifyJWT using this here
    app.get('/payments', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' });
      }
      const query = { email: email }
      const result = await paymentCollection.find(query).sort({ date: 1 }).toArray()
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Martial Arts is coming...')
})

app.listen(port, () => {
  console.log(`martial arts running port: ${port}`)
})