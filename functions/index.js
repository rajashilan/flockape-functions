const functions = require("firebase-functions");

const app = require("express")();

const cors = require("cors");

const { getAllAlbums, createAnAlbum } = require("./handlers/albums");
const {
  getAllLinks,
  createALink,
  fetchUrl,
  fetchImage,
  createLinkFrontEnd,
} = require("./handlers/links");
const { signup, login } = require("./handlers/users");
const DBAuth = require("./util/dbAuth");

app.use(cors());

//album routes REMEMBER TO ADD IMAGE----------
app.get("/getAlbums", getAllAlbums);
app.post("/createAlbum", DBAuth, createAnAlbum);

//link routes REMEMBER TO ADD IMAGE----------
app.post("/getLinks", getAllLinks);
app.post("/createLink", DBAuth, createALink);

//******USER HAS TO BE LOGGED IN AND AUTHENTICATED INCLUDING ALBUM ID TO BE ABLE TO REQUEST FOR URL DATA*******
app.post("/fetchUrl", fetchUrl); //route to retrieve and send back url data
app.post("/fetchImage", fetchImage); //route to retrieve and send image blob data
app.post("/createLinkFrontEnd", createLinkFrontEnd); //route to upload data and respond to front end

//users routes----------
app.post("/signup", signup);
app.post("/login", login);

exports.api = functions.region("asia-southeast1").https.onRequest(app);

//to change region:
// exports.api = functions.region('europe-west1').https.onRequest(app);
