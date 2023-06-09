const express = require('express');
const app = express();
require('dotenv').config()
const cors = require('cors')
const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json())



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


    // all users related api
    app.post('/allusers', async(req, res) =>{
      const user = req.body;
      const query = {email: user.email};
      const existingUser = await usersCollection.findOne(query);
      if(existingUser){
        return res.send({message: 'User Already Exsited'});
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    // instructors api code
    app.get('/instructors', async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result);
    })

    // instructors classes api code
    app.get('/classes', async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result)
    })

    // student select class collection
    app.post('/selectClass', async (req, res) => {
      const classes = req.body;
      const result = await studentSelectClassCollection.insertOne(classes);
      res.send(result)
    })

    app.get('/selectClass', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email }
      const result = await studentSelectClassCollection.find(query).toArray();
      res.send(result);
    })

    app.delete('/selectClass/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await studentSelectClassCollection.deleteOne(query);
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