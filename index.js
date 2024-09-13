require("dotenv").config();
const dns = require("dns");
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const bodyParser = require("body-parser");
const { Serializer } = require("v8");
const { toUnicode } = require("punycode");
const { error } = require("console");
const { SocketAddress } = require("net");

app.use(bodyParser.urlencoded({ extended: false }));
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

//Create new schema to hold url and shortened urls
const urlSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true,
  },
  short_url: {
    type: Number,
    unique: true,
  },
});

urlSchema.plugin(AutoIncrement, { inc_field: "short_url" });

let Url = mongoose.model("Url", urlSchema);

function isUrlPattern(req, res, next) {
  let originalUrl;
  //Check if it is a valid url pattern
  try {
    originalUrl = new URL(req.body.url);
    req.urlObj = originalUrl;
    next();
  } catch (error) {
    console.error("Invalid URL pattern");
    res.json({ error: "invalid url" });
  }
}

function urlExists(req, res, next) {
  const hostname = req.urlObj.hostname;
  //Check if the url exists
  dns.lookup(hostname, (err) => {
    if (err) {
      console.error("Invalid URL (DNS lookup failed):", err);
      return res.json({ error: "invalid url" });
    } else {
      req.originalUrl = req.urlObj.href;
      next();
    }
  });
}

app.post("/api/shorturl", isUrlPattern, urlExists, async (req, res) => {
  const originalUrl = req.originalUrl;
  const newUrl = new Url({
    url: originalUrl,
  });
  newUrl
    .save()
    .then((savedUrl) => {
      res.json({
        original_url: savedUrl.url,
        short_url: savedUrl.short_url,
      });
    })
    .catch((err) => console.error("Error saving user:", err));
});

app.get("/api/shorturl/:short_url", (req, res) => {
  //Check if there is a url with the shortened url
  Url.findOne({ short_url: req.params.short_url })
    .then((foundUrl) => {
      // res.json({ url: foundUrl.url });
      res.redirect(foundUrl.url);
    })
    .catch((err) => console.error("Error finding url:", err));
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
