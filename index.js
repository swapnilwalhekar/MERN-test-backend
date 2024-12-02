const express = require("express");
const cors = require("cors");
require("./db/config");
const User = require("./db/User");
const Post = require("./db/Post");
const Jwt = require("jsonwebtoken");
const jwtKey = "test";
const app = express();

app.use(express.json());
app.use(cors());

// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];
//   if (!token)
//     return res.status(401).send({ error: "Token missing or invalid" });

//   Jwt.verify(token, jwtKey, (err, user) => {
//     if (err) {
//       console.error("JWT Verification Error:", err);
//       return res.status(403).send({ error: "Invalid token" });
//     }

//     req.user = user;
//     next();
//   });
// };

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token)
    return res.status(401).send({ error: "Token missing or invalid" });

  Jwt.verify(token, jwtKey, (err, user) => {
    if (err) {
      console.error("JWT Verification Error:", err);
      return res.status(403).send({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

app.get("/swapnil", (req, res) => {
  res.send("Getting a msg from Server...");
});

app.post("/register", async (req, resp) => {
  let user = new User(req.body);
  let result = await user.save();
  result = result.toObject();
  delete result.password;
  Jwt.sign({ result }, jwtKey, { expiresIn: "2h" }, (err, token) => {
    if (err) {
      resp.send("Something went wrong");
    }
    resp.send({ result, auth: token });
  });
});

app.post("/login", async (req, resp) => {
  if (req.body.password && req.body.email) {
    let user = await User.findOne(req.body).select("-password");
    if (user) {
      Jwt.sign(
        { id: user._id, email: user.email },
        jwtKey,
        { expiresIn: "2h" },
        (err, token) => {
          if (err) {
            return resp.status(500).send("Error signing token");
          }
          resp.send({ user, auth: token });
        }
      );
    } else {
      resp.status(400).send({
        message: "No User found, Please enter valid email and password",
      });
    }
  } else {
    resp.send({ result: "Please enter valid email and password" });
  }
});

app.post("/like-post/:postId", authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).send({ message: "Post not found" });

    if (!post.likes.includes(req.user.id)) {
      post.likes.push(req.user.id);
    } else {
      post.likes = post.likes.filter((userId) => userId !== req.user.id); // Toggle like
    }

    await post.save();
    res.send({ message: "Post liked/unliked successfully", post });
  } catch (err) {
    res.status(500).send({ error: "Failed to like post" });
  }
});

app.post("/follow/:userId", authenticateToken, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user.id);

    if (!targetUser) return res.status(404).send({ message: "User not found" });

    if (!currentUser.following.includes(targetUser._id)) {
      currentUser.following.push(targetUser._id);
      targetUser.followers.push(currentUser._id);
    } else {
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== targetUser._id.toString()
      );
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== currentUser._id.toString()
      );
    }

    await currentUser.save();
    await targetUser.save();

    res.send({
      message: "Follow/unfollow successful",
      currentUser,
      targetUser,
    });
  } catch (err) {
    res.status(500).send({ error: "Failed to follow/unfollow user" });
  }
});

app.post("/create-post", authenticateToken, async (req, res) => {
  try {
    console.log("swwwwwwwwwwwww", req.user);
    const post = new Post({
      userId: req.user.id,
      content: req.body.content,
      createdAt: new Date(),
    });

    const result = await post.save();
    res
      .status(201)
      .send({ message: "Post created successfully", post: result });
  } catch (err) {
    console.error("Error creating post:", err.message);
    res.status(500).send({ error: "Failed to create post" });
  }
});

app.get("/posts", async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  try {
    const posts = await Post.find()
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    res.send(posts);
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch posts" });
  }
});

const port = 9000;
app.listen(port, () => {
  console.log("Server is running on port:", port);
});
