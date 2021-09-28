const { admin, db } = require("../util/admin");
const config = require("../util/config");

const { validateAlbumTitle } = require("../util/validators");

const { generateRandomNumber } = require("../util/filenameGenerator");

//get all albums for the user
exports.getAllAlbums = (req, res) => {
  let allAlbumsQuery;

  if (req.body.limit) {
    allAlbumsQuery = db
      .collection("albums")
      .where("username", "==", req.user.username)
      .orderBy("createdAt", "desc")
      .startAfter(req.body.limit.createdAt)
      .limit(10);
  } else
    allAlbumsQuery = db
      .collection("albums")
      .where("username", "==", req.user.username)
      .orderBy("createdAt", "desc")
      .limit(10);

  allAlbumsQuery
    .get()
    .then((data) => {
      let albums = [];
      data.forEach((doc) => {
        albums.push({
          albumID: doc.id,
          albumTitle: doc.data().albumTitle,
          username: doc.data().username,
          albumImg: doc.data().albumImg,
          security: doc.data().security,
          likeCount: doc.data().likeCount,
          viewCount: doc.data().viewCount,
          profileImg: doc.data().profileImg,
          createdAt: doc.data().createdAt,
        });
      });
      if (albums.length > 0) return res.json(albums);
      else return res.status(404).json({ message: "No Books" });
    })
    .catch((error) => {
      console.error(error);
    });
};

//get an album
exports.getAnAlbum = (req, res) => {
  let albumData = {};

  //get the particular album's data
  db.doc(`/albums/${req.params.albumID}`)
    .get()
    .then((doc) => {
      //make sure album exists
      if (!doc.exists) {
        return res.status(404).json({ error: "Book not found" });
      }

      //if album is private and another user is accessing, deny access
      if (
        doc.data().security == "private" &&
        doc.data().username !== req.user.username
      ) {
        return res.status(403).json({ general: "Unauthorized" });
      }

      albumData = doc.data();
      albumData.albumID = doc.id;

      //increment viewCount if the current username is not same as the album's username
      if (req.user.username !== albumData.username) {
        albumData.viewCount++;
        db.doc(`/albums/${req.params.albumID}`)
          .update({
            viewCount: albumData.viewCount,
          })
          .catch((error) => {
            console.error(error);
          });
      }

      //get the album's links data
      return db
        .collection("links")
        .orderBy("createdAt", "desc")
        .where("albumID", "==", req.params.albumID)
        .get();
    })
    .then((data) => {
      albumData.links = [];
      data.forEach((doc) => {
        const linkObject = {
          ...doc.data(),
          linkID: doc.id,
        };
        albumData.links.push(linkObject);
      });
      return res.json(albumData);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: error.code });
    });
};

//get one album and the album only after changes are made
exports.getOneAlbum = (req, res) => {
  let albumData = {};

  //get the particular album's data
  db.doc(`/albums/${req.params.albumID}`)
    .get()
    .then((doc) => {
      //make sure album exists
      if (!doc.exists) {
        return res.status(404).json({ error: "Book not found" });
      }

      //if album is private and another user is accessing, deny access
      if (
        doc.data().security == "private" &&
        doc.data().username !== req.user.username
      ) {
        return res.status(403).json({ general: "Unauthorized" });
      }

      albumData = doc.data();
      albumData.albumID = doc.id;
      return res.json(albumData);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: error.code });
    });
};

//edit an album's details
exports.editAlbumDetails = (req, res) => {
  const albumDetails = {
    albumTitle: req.body.albumTitle,
    security: req.body.security,
  };

  let securityChanged = false;

  const { valid, errors } = validateAlbumTitle(albumDetails.albumTitle);

  if (!valid) return res.status(400).json(errors);

  db.doc(`/albums/${req.params.albumID}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Book not found" });
      }

      if (doc.data().username !== req.user.username) {
        return res.status(403).json({ error: "Unauthorized" });
      } else {
        //check if the security of the album has changed
        doc.data().security !== albumDetails.security
          ? (securityChanged = true)
          : (securityChanged = false);
        db.doc(`/albums/${req.params.albumID}`)
          .update(albumDetails)
          .then(() => {
            //album updated
          });
        return securityChanged;
      }
    })
    .then((security) => {
      //if it has, update the links under the album to match the new security settings
      if (security) {
        return db
          .collection("links")
          .where("albumID", "==", req.params.albumID)
          .get()
          .then((data) => {
            data.forEach((doc) => {
              db.doc(`/links/${doc.id}`)
                .update({
                  security: albumDetails.security,
                })
                .then(() => {
                  //links updated
                });
            });
          });
      }
    })
    .then(() => {
      return res.json({ message: "Details added successfully" });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: error.code });
    });
};

//create a new album
exports.createAnAlbum = (req, res) => {
  const noImg = "no-img-album.png";

  const newAlbum = {
    albumTitle: req.body.albumTitle,
    security: req.body.security,
    username: req.user.username,
    profileImg: req.user.profileImg,
    albumImg: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
    createdAt: new Date().getTime(),
    likeCount: 0,
    viewCount: 1,
  };

  const { valid, errors } = validateAlbumTitle(newAlbum.albumTitle);

  if (!valid) return res.status(400).json(errors);

  //make sure user is verified before allowing user to create an album
  if (!req.user.email_verified)
    return res
      .status(403)
      .json({ general: "Please verify your email before creating a Book." });

  db.collection("albums")
    .add(newAlbum)
    .then((doc) => {
      const resAlbum = newAlbum;
      resAlbum.albumID = doc.id;
      res.json(resAlbum);
    })
    .catch((error) => {
      res.status(500).json({ error: "Something went wrong" });
      console.error(error);
    });
};

//like an album
exports.likeAlbum = (req, res) => {
  const likeAlbumDocument = db
    .collection("likesAlbum")
    .where("username", "==", req.user.username)
    .where("albumID", "==", req.params.albumID)
    .limit(1);

  const albumDocument = db.doc(`/albums/${req.params.albumID}`);

  let albumData;

  albumDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        albumData = doc.data();
        albumData.albumID = doc.id;

        return likeAlbumDocument.get();
      } else {
        return res.status(404).json({ error: "Book not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection("likesAlbum")
          .add({
            albumID: req.params.albumID,
            username: req.user.username,
            profileImg: req.user.profileImg,
            createdAt: new Date().getTime(),
          })
          .then(() => {
            albumData.likeCount++;
            return albumDocument.update({ likeCount: albumData.likeCount });
          })
          .then(() => {
            return res.json(albumData);
          });
      } else {
        //the user has already liked the album (handle unlike here)
        db.doc(`/likesAlbum/${data.docs[0].id}`)
          .delete()
          .then(() => {
            albumData.likeCount--;
            return albumDocument.update({ likeCount: albumData.likeCount });
          })
          .then(() => {
            return res.json(albumData);
          });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: error.code });
    });
};

//get the user's liked albums
exports.getLikedAlbums = (req, res) => {
  //first, get the album ids from the user's liked albums collection
  //then, get the albums for the ids from the albums collection

  let likedAlbumsID = [];
  let albums = [];
  let index = 0;

  let likedAlbumsQuery;

  console.log(req.body.limit);

  if (req.body.limit) {
    likedAlbumsQuery = db
      .collection("likesAlbum")
      .where("username", "==", req.user.username)
      .orderBy("createdAt", "desc")
      .startAfter(req.body.limit.albumDocCreatedAt)
      .limit(10);
  } else
    likedAlbumsQuery = db
      .collection("likesAlbum")
      .where("username", "==", req.user.username)
      .orderBy("createdAt", "desc")
      .limit(10);

  likedAlbumsQuery
    .get()
    .then((data) => {
      data.forEach((doc) => {
        likedAlbumsID.push({
          albumID: doc.data().albumID,
          albumDocCreatedAt: doc.data().createdAt,
        });
      });

      return likedAlbumsID;
    })
    .then((albumID) => {
      //if there are no liked albums id, there are no liked albums for the user, so return
      if (albumID.length == 0) {
        return res.status(404).json({ message: "No liked Books" });
      }

      for (let [indexForEach, id] of albumID.entries()) {
        let tempIndex = indexForEach;
        db.doc(`/albums/${id.albumID}`)
          .get()
          .then((doc) => {
            if (
              doc.data().security == "private" &&
              doc.data().username !== req.user.username
            ) {
            } else {
              albums[tempIndex] = {
                albumID: doc.id,
                albumTitle: doc.data().albumTitle,
                username: doc.data().username,
                albumImg: doc.data().albumImg,
                likeCount: doc.data().likeCount,
                viewCount: doc.data().viewCount,
                profileImg: doc.data().profileImg,
                createdAt: doc.data().createdAt,
                security: doc.data().security,
                albumDocCreatedAt: id.albumDocCreatedAt,
              };
            }
            index++;
          })
          .then(() => {
            //return only after reaching the end of the for loop
            if (index == albumID.length) return res.json(albums);
          });
      }

      // albumID.forEach((id) => {
      //   db.doc(`/albums/${id}`)
      //     .get()
      //     .then((doc) => {
      //       if (
      //         doc.data().security == "private" &&
      //         doc.data().username !== req.user.username
      //       ) {
      //       } else {
      //         albums.push({
      //           albumID: doc.id,
      //           albumTitle: doc.data().albumTitle,
      //           username: doc.data().username,
      //           albumImg: doc.data().albumImg,
      //           likeCount: doc.data().likeCount,
      //           viewCount: doc.data().viewCount,
      //           profileImg: doc.data().profileImg,
      //           createdAt: doc.data().createdAt,
      //           security: doc.data().security,
      //         });
      //       }
      //       index++;
      //     })
      //     .then(() => {
      //       //return only after reaching the end of the for loop
      //       if (index == albumID.length) return res.json(albums);
      //     });
      // });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ general: "Error getting liked Books" });
    });
};

//upload album image
//image will be taken from req.body.albumID
exports.uploadAlbumImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  db.doc(`/albums/${req.params.albumID}`)
    .get()
    .then((doc) => {
      if (doc.data().username !== req.user.username)
        return res.status(403).json({ general: "Unauthorized" });
    })
    .catch((error) => {
      console.error(error);
    });

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }

    const imageExtension = filename.split(".")[filename.split(".").length - 1];

    const randomNum = generateRandomNumber();

    imageFileName = `${randomNum}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);

    imageToBeUploaded = {
      filepath,
      mimetype,
    };

    file.pipe(fs.createWriteStream(filepath));
  });

  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db
          .doc(`/albums/${req.params.albumID}`)
          .update({ albumImg: imageUrl });
      })
      .then(() => {
        return res.json({ message: "Book cover uploaded successfully" });
      })
      .catch((error) => {
        console.error(error);
        return res.status(500).json({ error: error.code });
      });
  });
  busboy.end(req.rawBody);
};

//delete album
//* deleting an album must also delete all the links along with it
exports.deleteAlbum = (req, res) => {
  const albumDocument = db.doc(`/albums/${req.params.albumID}`);
  // const linkDocument = db
  //   .collection("links")
  //   .where("albumID", "==", req.params.albumID);

  albumDocument
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Book not found" });
      }

      if (doc.data().username !== req.user.username) {
        return res.status(403).json({ error: "Unauthorized" });
      } else {
        // //delete all the links attached to the album first, and then delete the album
        // linkDocument
        //   .get()
        //   .then((data) => {
        //     data.forEach((doc) => {
        //       db.doc(`/links/${doc.id}`).delete();
        //     });
        //   })
        //   .then(() => {
        //     return albumDocument.delete();
        //   })
        //   .catch((error) => {
        //     console.error(error);
        //     return res.status(500).json({ error: error.code });
        //   });
        return albumDocument.delete();
      }
    })
    .then(() => {
      res.json({ message: "Book deleted successfully" });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: error.code });
    });
};
