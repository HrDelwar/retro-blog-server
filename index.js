const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("welcome to server");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vzza0.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// fetch user
const fetchUser = async (email) => {
  const respose = await fetch(`http://localhost:5000/getUser/${email}`);
  const result = await respose.json();
  return result;
};

client.connect((err) => {
  const userCollection = client.db(process.env.DB_NAME).collection("user");
  const postsCollection = client.db(process.env.DB_NAME).collection("posts");

  // add user
  app.post("/addUser", (req, res) => {
    const user = req.body;
    const isUserExist = fetchUser(user.email)
      .then((result) => {
        if (result === false) {
          userCollection
            .insertOne({ ...user, rule: "user", created: new Date() })
            .then((result) => {
              res.send(result.insertedCount > 0);
            })
            .catch((err) => {
              console.log(err);
              res.send(err);
            });
        } else {
          res.send({
            name: "This Email already have an account. Try another email. ",
          });
        }
      })
      .catch((err) => console.log(err));
  });

  //get user
  app.get("/getUser/:email", (req, res) => {
    const email = req.params.email;
    userCollection
      .findOne({ email: email })
      .then((result) => {
        if (result) {
          const { firstName, lastName, rule, email } = result;
          res.send({ firstName, lastName, rule, email });
        } else {
          res.send(false);
        }
      })
      .catch((err) => console.error(`Failed to find document: ${err}`));
  });

  //handle login
  app.post("/handleLogin", (req, res) => {
    const { email, password } = req.body;
    userCollection
      .findOne({ email: email, password: password })
      .then((result) => {
        if (result) {
          const { firstName, lastName, rule, email } = result;
          res.send({ status: true, firstName, lastName, rule, email });
        } else {
          res.send({
            status: false,
            message: "Wrong Email or wrong password. Try again!",
          });
        }
      })
      .catch((err) => {
        console.error(err);
        res.send({
          status: false,
          message: "Wrong Email or wrong password. Try again!",
        });
      });
  });

  // add post
  app.post("/addPost", (req, res) => {
    const { title, description, category, coverImage, author, email } =
      req.body;
    const user = fetchUser(email)
      .then((result) => {
        if (result.rule === "admin") {
          postsCollection
            .insertOne({
              title,
              description,
              category,
              coverImage,
              author,
              created: new Date(),
            })
            .then((result) => {
              if (result.insertedCount > 0) {
                res.send({
                  status: 200,
                  success: true,
                  message: "Post add successfully",
                });
              } else {
                res.send({
                  status: 424,
                  success: false,
                  message: "Post Inserted failed!",
                });
              }
            })
            .catch((err) => {
              console.log(err);
              res.send({
                status: 424,
                success: false,
                message: "Post Inserted failed!",
              });
            });
        } else {
          res.send({ status: 401, message: "Only admin can add post!" });
        }
      })
      .catch((err) => console.log(err));
  });

  // delete post
  app.delete("/deletePost/:id", (req, res) => {
    const id = req.params.id;
    console.log(id);
    postsCollection
      .deleteOne({ _id: ObjectId(id) })
      .then((result) => {
        res.send(result.deletedCount > 0);
      })
      .catch((err) => res.send(err));
  });

  //see all post
  app.get("/getAllPost", (req, res) => {
    postsCollection.find({}).toArray((err, docs) => res.send(docs));
  });

  //single post
  app.get("/singleBlog/:id", (req, res) => {
    const id = req.params.id;
    postsCollection
      .find({ _id: ObjectId(id) })
      .toArray((err, docs) => res.send(docs[0]));
  });

  // see all user
  app.get("/seeAllUser/:email", (req, res) => {
    const email = req.params.email;
    fetchUser(email)
      .then((result) => {
        if (result.rule === "admin") {
          userCollection.find({}).toArray((err, docs) => res.send(docs));
        } else {
          res.send({ status: 401, message: "Only admin can see all user!" });
        }
      })
      .catch((err) => console.log(err));
  });
});

app.listen(process.env.PORT || 5000);
