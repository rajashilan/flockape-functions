const { db } = require("../util/admin");
const linkPreviewGenerator = require("link-preview-generator");
const fetch = require("node-fetch");

const { validateLink, validateManualLink } = require("../util/validators");

exports.getAllLinks = (req, res) => {
  //user accesses the link from the album, so /albumID/linkID
  //is there a better version to implement?
  //***HOW DO I SHOW THE PARTICULAR ALBUM DETAILS IN LINKS PAGE?? */

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
          res.json({ message: `Page ${doc.id} created successfully` });
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
  console.log("UERLLLL", url);
  const { valid, errors } = validateLink(url);

  if (!valid) return res.status(400).json(errors);

  const startLinkPreview = async function scrape(url) {
    try {
      previewData = await linkPreviewGenerator(url);
      // console.log(previewData);
      // console.log(
      //   "successfully retrieved url data in nodejs...passing to front-end"
      // );
      if (
        previewData.title == "" ||
        previewData.title == null ||
        previewData.title == undefined ||
        previewData.title === "Log in to Facebook" ||
        previewData.title === "Log in or sign up to view" ||
        previewData.img == "" ||
        previewData.img == null ||
        previewData.img == undefined
      )
        return res
          .status(400)
          .json({ error: "Oops! Unable to extract link's details." });

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
      return res.status(400).json({ error: "Couldn't extract link info" });
    });
};

exports.createLinkFrontEnd = (req, res) => {
  const newLink = {
    linkUrl: req.body.linkUrl,
    linkTitle: req.body.linkTitle,
    linkDesc: req.body.linkDesc,
    linkImg: req.body.linkImg,
    linkDomain: req.body.linkDomain,
    albumID: req.params.albumID,
    username: req.user.username,
    profileImg: req.user.profileImg,
    likeCount: 0,
    createdAt: new Date().getTime(),
  };

  const validateData = {
    link: newLink.linkUrl,
    title: newLink.linkTitle,
  };

  const { valid, errors } = validateManualLink(validateData);
  if (!valid) return res.status(400).json(errors);

  //check if username is the same as the albumID username before uploading
  db.doc(`/albums/${newLink.albumID}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        if (newLink.username == doc.data().username) {
          //add the link security the same as the album's
          newLink.security = doc.data().security;

          db.collection("links")
            .add(newLink)
            .then(() => {
              res.status(201).json(newLink); // return the newly added link to add to the UI
            })
            .catch((error) => {
              res.status(500).json({ error: "Something went wrong" });
              console.error(error);
            });
        } else {
          return res.status(403).json({ username: "Unauthorized" });
        }
      } else {
        return res.status(404).json({ album: "Book does not exist." });
      }
    });
};

//like a link
exports.likeLink = (req, res) => {
  const likeLinkDocument = db
    .collection("likesLink")
    .where("username", "==", req.user.username)
    .where("linkID", "==", req.params.linkID)
    .limit(1);

  const linkDocument = db.doc(`/links/${req.params.linkID}`);

  let linkData;

  linkDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        linkData = doc.data();
        linkData.linkID = doc.id;

        return likeLinkDocument.get();
      } else {
        return res.status(404).json({ error: "Page not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection("likesLink")
          .add({
            linkID: req.params.linkID,
            username: req.user.username,
            createdAt: new Date().getTime(),
            profileImg: req.user.profileImg,
          })
          .then(() => {
            linkData.likeCount++;
            return linkDocument.update({ likeCount: linkData.likeCount });
          })
          .then(() => {
            return res.json(linkData);
          });
      } else {
        //the user has already liked the link (handle unlike here)
        db.doc(`/likesLink/${data.docs[0].id}`)
          .delete()
          .then(() => {
            linkData.likeCount--;
            return linkDocument.update({ likeCount: linkData.likeCount });
          })
          .then(() => {
            return res.json(linkData);
          });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: error.code });
    });
};

//get the user's liked links
exports.getLikedLinks = (req, res) => {
  //first, get the links ids from the user's liked albums collection
  //then, get the links for the ids from the albums collection

  let likedLinksID = [];
  let links = [];
  let index = 0;

  db.collection("likesLink")
    .orderBy("createdAt", "desc")
    .where("username", "==", req.user.username)
    .get()
    .then((data) => {
      data.forEach((doc) => {
        likedLinksID.push(doc.data().linkID);
      });

      return likedLinksID;
    })
    .then((linkID) => {
      //if there are no liked links id, there are no liked links for the user, so return
      if (linkID.length == 0) {
        return res.status(404).json({ message: "No liked pages" });
      }

      linkID.forEach((id) => {
        db.doc(`/links/${id}`)
          .get()
          .then((doc) => {
            if (
              doc.data().security == "private" &&
              doc.data().username !== req.user.username
            ) {
              //dont push anything
            } else {
              links.push({
                linkID: doc.id,
                linkTitle: doc.data().linkTitle,
                linkDesc: doc.data().linkDesc,
                linkImg: doc.data().linkImg,
                linkUrl: doc.data().linkUrl,
                username: doc.data().username,
                likeCount: doc.data().likeCount,
                createdAt: doc.data().createdAt,
                security: doc.data().security,
              });
            }
            index++;
          })
          .then(() => {
            //return only after reaching the end of the for loop
            if (index == linkID.length) return res.json(links);
          });
      });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ general: "Error getting liked pages" });
    });
};

//delete link
exports.deleteLink = (req, res) => {
  const linkDocument = db.doc(`/links/${req.params.linkID}`);

  linkDocument
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Page not found" });
      }

      if (doc.data().username !== req.user.username) {
        return res.status(403).json({ error: "Unauthorized" });
      } else {
        return linkDocument.delete();
      }
    })
    .then(() => {
      res.json({ message: "Page deleted successfully" });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: error.code });
    });
};
