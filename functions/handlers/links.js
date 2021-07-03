const { db } = require("../util/admin");
const linkPreviewGenerator = require("link-preview-generator");
const fetch = require("node-fetch");

exports.getAllLinks = (req, res) => {
  //user accesses the link from the album, so /albumID/linkID
  //is there a better version to implement?

  db.collection("links")
    .where("albumID", "==", req.body.albumID)
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let links = [];
      data.forEach((doc) => {
        links.push({
          linkID: doc.id,
          linkTitle: doc.data().linkTitle,
          linkDesc: doc.data().linkDesc,
          linkImg: doc.data().linkImg,
          linkDomain: doc.data().linkDomain,
          username: doc.data().username,
          albumID: doc.data().albumID,
          createdAt: doc.data().createdAt,
        });
      });
      return res.json(links);
    })
    .catch((error) => console.error(error));
};

exports.createALink = (req, res) => {
  const newLink = {
    linkTitle: "",
    linkDesc: "",
    linkImg: "",
    linkDomain: "",
    albumID: req.body.albumID,
    username: req.user.username,
    createdAt: new Date().getTime(),
  };

  let url = req.body.url;
  // let url = req.query.search;
  //async function to get the url data
  const startLinkPreview = async function scrape(url) {
    try {
      previewData = await linkPreviewGenerator(url);
      console.log(previewData);
      // return res.status(200).json(previewData);
      return previewData;
    } catch (e) {
      console.log("error", e);
      throw e;
    }
  };

  startLinkPreview(url)
    .then((data) => {
      newLink.linkTitle = data.title;
      newLink.linkDesc = data.description;
      newLink.linkImg = data.img;
      newLink.linkDomain = data.domain;

      db.collection("links")
        .add(newLink)
        .then((doc) => {
          res.json({ message: `Link ${doc.id} created successfully` });
        })
        .catch((error) => {
          res.status(500).json({ error: "something went wrong" });
          console.error(error);
        });
    })
    .catch((error) => console.error(error));
};

//******USER HAS TO BE LOGGED IN AND AUTHENTICATED INCLUDING ALBUM ID TO BE ABLE TO REQUEST FOR URL DATA*******
exports.fetchUrl = (req, res) => {
  //let url = req.body.url;
  let url = req.query.search;
  const startLinkPreview = async function scrape(url) {
    try {
      previewData = await linkPreviewGenerator(url);
      console.log(previewData);
      console.log(
        "successfully retrieved url data in nodejs...passing to front-end"
      );
      return res.status(200).json(previewData);
    } catch (e) {
      console.log("error", e);
      throw e;
    }
  };

  startLinkPreview(url);
};

exports.fetchImage = (req, res) => {
  let blob = req.query.search;

  fetch(blob)
    .then((res) => {
      return res.blob();
    })
    .then((blob) => {
      console.log(
        "successfully retrieved blob in nodejs...passing to front-end"
      );

      res.type(blob.type);
      blob.arrayBuffer().then((buf) => {
        res.end(Buffer.from(buf));
      });
    })
    .catch((error) => {
      console.log("error from NODEJS getting blob", error);
    });
};

exports.createLinkFrontEnd = (req, res) => {
  const newLink = {
    linkTitle: req.body.linkTitle,
    linkDesc: req.body.linkDesc,
    linkImg: req.body.linkImg,
    linkDomain: req.body.linkDomain,
    albumID: req.body.albumID, //manually for now?
    username: req.body.username,
    createdAt: new Date().getTime(),
  };

  //check if username is the same as the albumID username before uploading
  db.doc(`/albums/${newLink.albumID}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        if (newLink.username == doc.data().username) {
          db.collection("links")
            .add(newLink)
            .then((doc) => {
              res
                .status(201)
                .json({ message: `Link with ${doc.id} created successfully` });
            })
            .catch((error) => {
              res.status(500).json({ error: "Something went wrong" });
              console.error(error);
            });
        } else {
          return res.status(400).json({ username: "Invalid username" });
        }
      } else {
        return res.status(400).json({ album: "Album does not exist." });
      }
    });
};
