const { db } = require("../util/admin");
const config = require("../util/config");

const { validateAlbumTitle } = require("../util/validators");

//get all albums for the user
exports.getAllAlbums = (req, res) => {
  db.collection("albums")
    .orderBy("createdAt", "desc")
    .where("username", "==", req.user.username)
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
      return res.json(albums);
    })
    .catch((error) => console.error(error));
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
        return res.status(404).json({ error: "Album not found" });
      }

      //if album is private and another user is accessing, deny access
      if (
        doc.data().security == "private" &&
        req.user.username !== doc.data().username
      ) {
        return res.status(403).json({ message: "Unauthorized" });
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
        albumData.links.push(doc.data());
      });
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

  const { valid, errors } = validateAlbumTitle(albumDetails.albumTitle);

  if (!valid) return res.status(400).json(errors);

  db.doc(`/albums/${req.params.albumID}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Album not found" });
      }

      if (doc.data().username !== req.user.username) {
        return res.status(403).json({ error: "Unauthorized" });
      } else {
        return db.doc(`/albums/${req.params.albumID}`).update(albumDetails);
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

  db.collection("albums")
    .add(newAlbum)
    .then((doc) => {
      const resAlbum = newAlbum;
      resAlbum.albumID = doc.id;
      res.json(resAlbum);
    })
    .catch((error) => {
      res.status(500).json({ error: "something went wrong" });
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
        return res.status(404).json({ error: "Album not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection("likesAlbum")
          .add({
            albumID: req.params.albumID,
            username: req.user.username,
            createdAt: new Date().getTime(),
          })
          .then(() => {
            albumData.likeCount++;
            return albumDocument.update({ likeCount: albumData.likeCount });
          })
          .then(() => {
            return res.json({ albumData });
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
            res.json(albumData);
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

  likedAlbumsID = [];
  albums = [];

  db.collection("likesAlbum")
    .where("username", "==", req.user.username)
    .get()
    .then((data) => {
      data.forEach((doc) => {
        likedAlbumsID.push(doc.data().albumID);
      });

      return likedAlbumsID;
    })
    .then((albumID) => {
      //if there are no liked albums id, there are no liked albums for the user, so return
      if (albumID.length == 0) {
        return res.status(404).json({ message: "No liked albums" });
      }

      albumID.forEach((id) => {
        db.doc(`/albums/${id}`)
          .get()
          .then((doc) => {
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
          })
          .then(() => {
            //return only after reaching the end of the for loop
            if (id == albumID[albumID.length - 1]) return res.json(albums);
          });
      });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ message: "Error getting liked albums" });
    });
};

//upload album image
//image will be taken from req.body.albumID
exports.uploadAlbumImage = (req, res) => {
  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }

    const imageExtension = filename.split(".")[filename.split(".").length - 1];

    imageFileName = `${Math.round(
      Math.random() * 1000000000000000
    )}.${imageExtension}`;
    const filePath = path.join(os.tempdir(), imageFileName);

    imageToBeUploaded = { filePath, mimetype };

    file.pipe(fs.createWriteStream(filePath));

    busboy.on("finish", () => {
      admin.storage
        .bucket()
        .upload(imageToBeUploaded.filePath, {
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
          return res.json({ message: "Album image uploaded successfully" });
        })
        .catch((error) => {
          console.error(error);
          return res.status(500).json({ error: error.code });
        });
    });
  });
  busboy.end(req.rawBoy);
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
        return res.status(404).json({ error: "Album not found" });
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
      res.json({ message: "Album deleted successfully" });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: error.code });
    });
};
