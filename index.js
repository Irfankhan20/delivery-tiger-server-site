const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

//middleWare
app.use(cors());
app.use(express.json());


//----------------------------------------------------------------------------

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@project1.4j1y0pd.mongodb.net/?retryWrites=true&w=majority`;

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

    const userCollection = client.db("deliveryTiger").collection("users");
    const bookingCollection = client.db("deliveryTiger").collection("bookings");

    //jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      });
      res.send({ token })
    })
    //middleWares
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unAuthorized1 access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unAuthorized2 access' });
        }
        req.decoded = decoded;
        next();
      })
    }
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });

      }
      next();
    }


    // user related api
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })
    app.get('/users/deliveryman/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let deliveryman = false;
      if (user) {
        deliveryman = user?.role === 'deliveryman';
      }
      res.send({ deliveryman });
    })
    app.get('/users',  async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })
    app.get('/users/:id', async (req, res) => {
      const result = await userCollection.findOne(
        { _id: new ObjectId(req.params.id) }
      );
     
      console.log(result);
      if(result){
       
        return res.status(200).send(result)
      }
      else{
        return res.status(404).send({message: 'not found'})
      }
    })


    //booking related api
    app.post('/bookings', async (req, res) => {
      const bookItem = req.body;
      const result = await bookingCollection.insertOne(bookItem);
      res.send(result);
    })
    app.get('/books', async (req, res) => {
      const result = await bookingCollection.find().toArray();
      res.send(result);
    })
    app.patch('/books/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
          $set: {
              role: 'admin'
          }
      };
      const result = await bookingCollection.updateOne(filter, updatedDoc);
      res.send(result);
  });
  
  

    app.get('/bookings', async (req,res)=>{
      const email = req.query.email;
      if(!email){
        res.send([]);
      }
      const decodedEmail = req.query.email;
      if(email !== decodedEmail){
        return res.status(403).send({error: true, message: 'forviden access'})
      }
      const query = {email: email};
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/books/:id', async (req, res) => {
      const result = await bookingCollection.findOne(
        { _id: new ObjectId(req.params.id) }
      );
     
      console.log(result);
      if(result){
       
        return res.status(200).send(result)
      }
      else{
        return res.status(404).send({message: 'not found'})
      }
    })

    app.delete('/books/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })
    app.patch('/books/:id', async (req,res) => {
      const book = req.body;
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set: {
          address: book.address,
          date: book.date,
          email:book.email,
          latitude: book.latitude,
          longitude:book.longitude,
          name: book.name,
          phone: book.phone,
          price: book.price,
          receivername: book.receivername,
          receiverphone: book.receiverphone,
          type: book.type,
          weight: book.weight,
          status:'pending'
        }
      }
      const result = await bookingCollection.updateOne(filter,updatedDoc);
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


//----------------------------------------------------------------------------

app.get('/', (req, res) => {
  res.send('deliveryTiger is sitting')
})

app.listen(port, () => {
  console.log(`deliveryTiger is sitting on port ${port}`);
})