const mongoose = require("mongoose");

const url =
  "mongodb+srv://swapnilwalhekar1999:F6u1ptW3G8oFkziG@cluster0.jm9k7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(url, () => {
  console.log("ok DB Connected:");
});
