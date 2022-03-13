const { admin, db } = require("../util/admin");
const config = require("../util/config");

const { validateAlbumTitle } = require("../util/validators");

const { generateRandomNumber } = require("../util/filenameGenerator");
const {
  exampleUserRecord,
} = require("firebase-functions-test/lib/providers/auth");

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

//get all albums , search,  for the user
exports.searchAllAlbums = (req, res) => {
  let allAlbumsQuerySearch;
  let searchQuery = req.body.search.toLowerCase();
  searchQuery = searchQuery.replace(/\s/g, "");

  if (req.body.limit) {
    allAlbumsQuerySearch = db
      .collection("albums")
      .where("username", "==", req.user.username)
      .where("searchTerms", "array-contains", searchQuery)
      .orderBy("createdAt", "desc")
      .startAfter(req.body.limit.createdAt)
      .limit(10);
  } else
    allAlbumsQuerySearch = db
      .collection("albums")
      .where("username", "==", req.user.username)
      .where("searchTerms", "array-contains", searchQuery)
      .orderBy("createdAt", "desc")
      .limit(10);

  allAlbumsQuerySearch
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

  //if request.body.limit
  //use an if else statement, if none, use normal code, limit links to 16
  //if yes, just take the album id and the limit, and use the limit to start after, limit to 16
  //send the response to the front end, but in a different name?
  //in the front end, in data actions, if the action.payload has that particular name,
  //use an if else statement, if no, continue as normal
  //if yes, let the album state remain as is, and just spread the album's links state, and add
  //basically the same procedure as other paginations done before

  //get album's details with the first 10 links
  console.log("no limit");
  console.log("limit:", req.body);
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
        .limit(16)
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
      //return res.json(albumData);

      //for enabling the front end to check if the album in the album details page is liked by user, after pagination
      return db
        .collection("likesAlbum")
        .where("username", "==", req.user.username)
        .where("albumID", "==", req.params.albumID)
        .get();
    })
    .then((data) => {
      //for enabling the front end to check if the album in the album details page is liked by user, after pagination
      data.forEach((doc) => {
        if (doc.exists) {
          albumData.isLiked = true;
        } else {
          albumData.isLiked = false;
        }
      });

      return db
        .collection("likesLink")
        .orderBy("createdAt", "desc")
        .where("username", "==", req.user.username)
        .where("albumID", "==", req.params.albumID)
        .limit(16)
        .get();

      //return res.json(albumData);
    })
    .then((data) => {
      albumData.likedLinks = [];
      data.forEach((doc) => {
        const likedLinkObject = {
          ...doc.data(),
        };
        albumData.likedLinks.push(likedLinkObject);
      });

      return res.json(albumData);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: error.code });
    });
};

exports.getAnAlbumDetailLinks = (req, res) => {
  //get album detail's other 16 links for pagination (continuation of getAnAlbum function)
  //also get album detail's other 16 likes links for pagination

  let albumDetailLinksData = {};

  if (req.body.limit) {
    db.collection("links")
      .orderBy("createdAt", "desc")
      .where("albumID", "==", req.params.albumID)
      .startAfter(req.body.limit.createdAt)
      .limit(16)
      .get()
      .then((data) => {
        albumDetailLinksData.links = [];
        data.forEach((doc) => {
          const linkObject = {
            ...doc.data(),
            linkID: doc.id,
          };
          albumDetailLinksData.links.push(linkObject);
        });

        //to get the album detail link's likes link pagination
        if (req.body.limitLikedLinks && albumDetailLinksData.links.length > 0) {
          db.collection("likesLink")
            .orderBy("createdAt", "desc")
            .where("username", "==", req.user.username)
            .where("albumID", "==", req.params.albumID)
            .startAfter(req.body.limitLikedLinks.createdAt)
            .limit(16)
            .get()
            .then((data) => {
              albumDetailLinksData.likedLinks = [];
              data.forEach((doc) => {
                const likedLinkObject = {
                  ...doc.data(),
                };
                albumDetailLinksData.likedLinks.push(likedLinkObject);
              });
              if (albumDetailLinksData.links.length > 0)
                return res.json(albumDetailLinksData);
              else return res.status(404).json({ message: "No Pages" });
            })
            .catch((error) => {
              console.error(error);
            });
        } else {
          if (albumDetailLinksData.links.length > 0)
            return res.json(albumDetailLinksData);
          else return res.status(404).json({ message: "No Pages" });
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }
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
    searchTerms: [],
  };

  let securityChanged = false;

  const { valid, errors } = validateAlbumTitle(albumDetails.albumTitle);

  if (!valid) return res.status(400).json(errors);

  let albumTitle = albumDetails.albumTitle.toLowerCase();
  albumTitle = albumTitle.replace(/\s/g, "");

  let index = 1;
  let iterate = albumTitle.length;

  if (iterate > 30) iterate = 30; //make sure maximum is 30

  const searchTerm = [];

  for (index; index <= iterate; index++) {
    searchTerm.push(albumTitle.substring(0, index));
  }

  albumDetails.searchTerms = searchTerm;

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
    searchTerms: [],
  };

  const { valid, errors } = validateAlbumTitle(newAlbum.albumTitle);

  if (!valid) return res.status(400).json(errors);

  let albumTitle = newAlbum.albumTitle.toLowerCase();
  albumTitle = albumTitle.replace(/\s/g, "");

  let index = 1;
  let iterate = albumTitle.length;

  if (iterate > 30) iterate = 30; //make sure maximum is 30

  const searchTerm = [];

  for (index; index <= iterate; index++) {
    searchTerm.push(albumTitle.substring(0, index));
  }

  newAlbum.searchTerms = searchTerm;

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
            ownerusername: albumData.username,
            profileImg: req.user.profileImg,
            createdAt: new Date().getTime(),
            albumCreatedAt: albumData.createdAt,
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

//album likes pagination for albums created by other users
exports.getLikesAlbumGeneralPagination = (req, res) => {
  let paginate;

  if (req.body.limit.albumDocCreatedAt) {
    paginate = req.body.limit.albumDocCreatedAt;
  } else {
    return res.status(404).json({ message: "No liked books found" });
  }

  db.collection("likesAlbum")
    .where("username", "==", req.user.username)
    .orderBy("createdAt", "desc")
    .startAfter(paginate)
    .limit(10)
    .get()
    .then((data) => {
      let likesAlbum = [];
      data.forEach((doc) => {
        likesAlbum.push(doc.data());
      });
      if (likesAlbum.length > 0) return res.json(likesAlbum);
      else return res.status(404).json({ message: "No liked books found" });
    })
    .catch((error) => {
      console.error(error);
    });
};

//album like pagination for albums created by authenticated user
exports.getLikesAlbumUserPagination = (req, res) => {
  let paginate;

  if (req.body.limit.createdAt) {
    paginate = req.body.limit.createdAt;
  } else {
    return res.status(404).json({ message: "No liked books found" });
  }

  db.collection("likesAlbum")
    .where("username", "==", req.user.username)
    .where("ownerusername", "==", req.user.username)
    .orderBy("albumCreatedAt", "desc")
    .startAfter(paginate)
    .limit(10)
    .get()
    .then((data) => {
      let likesAlbum = [];
      data.forEach((doc) => {
        likesAlbum.push(doc.data());
      });
      console.log(likesAlbum);
      if (likesAlbum.length > 0) return res.json(likesAlbum);
      else return res.status(404).json({ message: "No liked books found" });
    })
    .catch((error) => {
      console.error(error);
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
