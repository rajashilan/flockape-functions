const functions = require("firebase-functions");

const express = require("express");

const app = express();

const cors = require("cors");

const { db } = require("./util/admin");

const {
  getAllAlbums,
  searchAllAlbums,
  searchLikedAlbums,
  getAnAlbum,
  getAnAlbumDetailLinks,
  getOneAlbum,
  editAlbumDetails,
  createAnAlbum,
  uploadAlbumImage,
  likeAlbum,
  getLikedAlbums,
  getLikesAlbumGeneralPagination,
  getLikesAlbumUserPagination,
  deleteAlbum,
  searchAnAlbumDetailLinks,
} = require("./handlers/albums");
const {
  getAllLinks,
  createALink,
  fetchUrl,
  fetchImage,
  createLinkFrontEnd,
  likeLink,
  getLikedLinks,
  getLikesLinkPagination,
  deleteLink,
  getSearchedLikedLinks,
} = require("./handlers/links");
const {
  signup,
  login,
  uploadProfileImage,
  addUserDetails,
  getAuthenticatedUser,
  notificationPagination,
  getUserDetails,
  getUserDetailsSearchedAlbum,
  searchUsers,
  markNotificationsRead,
  resetPassword,
  changePassword,
} = require("./handlers/users");

const { submitFeedback } = require("./handlers/admin_work");

const DBAuth = require("./util/dbAuth");
const DBSelectedAuth = require("./util/dbSelectedAuth");
const dbAuth = require("./util/dbAuth");

app.use(cors());

// if (process.env.NODE_ENV === "production") {
//   // Exprees will serve up production assets
//   app.use(express.static("flockape-client/build"));

//   // Express serve up index.html file if it doesn't recognize route
//   const path = require("path");
//   app.get("*", (req, res) => {
//     res.sendFile(
//       path.resolve(__dirname, "flockape-client", "build", "index.html")
//     );
//   });
// }

//image will be taken from req.body.albumID
app.post("/albums", DBAuth, getAllAlbums); //gets all the albums for the user
app.post("/searchAlbums", DBAuth, searchAllAlbums); //user searches for all their own albums
app.post("/searchLikedAlbums", DBAuth, searchLikedAlbums); //user searches for their liked albums
app.post("/searchAlbumDetailLinks", DBSelectedAuth, searchAnAlbumDetailLinks);
app.post("/album/:albumID", DBAuth, editAlbumDetails); //edit album details
app.get("/album/:albumID", DBSelectedAuth, getAnAlbum); //get a particular album and its links
app.post("/albumDetailLinks/:albumID", DBSelectedAuth, getAnAlbumDetailLinks); //get the links pagination for an album detail
app.get("/album/:albumID/one", DBSelectedAuth, getOneAlbum); //get the album after changes are made
app.post("/createAlbum", DBAuth, createAnAlbum); //-------------------------------------------------------verification required
app.post("/album/:albumID/image", DBAuth, uploadAlbumImage); //user can use this to change album image even later (editing)
app.get("/album/:albumID/like", DBAuth, likeAlbum); //like and unlike handled in the same route
app.post("/getLikedAlbums", DBAuth, getLikedAlbums); //get a user's liked albums
app.post(
  "/getLikedAlbumGeneralPagination",
  DBAuth,
  getLikesAlbumGeneralPagination
); //get a user's liked albums (including other users)
app.post("/getLikedAlbumUserPagination", DBAuth, getLikesAlbumUserPagination); //get a user's liked albums (only the authenticated user's)
app.delete("/album/:albumID", DBAuth, deleteAlbum);

//link routes REMEMBER TO ADD IMAGE----------
app.post("/getLinks", DBAuth, getAllLinks); //gets all the links for the album //not to be used in production
app.post("/createLink", DBAuth, createALink);
app.post("/link/:linkID/like", DBAuth, likeLink); //like and unlike handled in the same route
app.post("/getLikedLinks", DBAuth, getLikedLinks); //get a user's liked links
app.post("/searchLikedLinks", DBAuth, getSearchedLikedLinks); // get the user's searched liked links
app.post("/getLikedLinkPagination", DBAuth, getLikesLinkPagination);
app.delete("/link/:linkID", DBAuth, deleteLink);

//******USER HAS TO BE LOGGED IN AND AUTHENTICATED INCLUDING ALBUM ID TO BE ABLE TO REQUEST FOR URL DATA*******
app.post("/fetchUrl", DBAuth, fetchUrl); //route to retrieve and send back url data
app.post("/fetchImage", fetchImage); //route to retrieve and send image blob data
app.post("/album/:albumID/link", DBAuth, createLinkFrontEnd); //route to upload data and respond to front end

//users routes----------
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", DBAuth, uploadProfileImage);
app.post("/user", DBAuth, addUserDetails);
app.get("/user", DBAuth, getAuthenticatedUser);
app.post("/user/notifications", DBAuth, notificationPagination);
app.post("/user/:username", getUserDetails);
app.post("/user/:username/search", getUserDetailsSearchedAlbum);
app.post("/searchUser", searchUsers);
app.post("/notifications", DBAuth, markNotificationsRead);
app.post("/password/reset", resetPassword); //forgot password
app.post("/password/update", DBAuth, changePassword); //update password
app.post("/submitFeedback", submitFeedback);

exports.api = functions.region("asia-southeast1").https.onRequest(app);

//triggers adding notifications for liking an album
exports.createNotificationOnLikeAlbum = functions
  .region("asia-southeast1")
  .firestore.document("likesAlbum/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/albums/${snapshot.data().albumID}`)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().username !== snapshot.data().username) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().getTime(),
            recipient: doc.data().username,
            sender: snapshot.data().username,
            senderProfileImg: snapshot.data().profileImg,
            read: false,
            contentID: doc.id,
            contentName: doc.data().albumTitle,
            contentImg: doc.data().albumImg,
            type: "album",
          });
        }
      })
      .catch((error) => {
        console.error(error);
      });
  });

//triggers deleting notifications for unliking an album
exports.deleteNotificationOnUnlikeAlbum = functions
  .region("asia-southeast1")
  .firestore.document("likesAlbum/{id}")
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((error) => {
        console.error(error);
      });
  });

//triggers adding notifications for liking a link
exports.createNotificationOnLikeLink = functions
  .region("asia-southeast1")
  .firestore.document("likesLink/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/links/${snapshot.data().linkID}`)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().username !== snapshot.data().username) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().getTime(),
            recipient: doc.data().username,
            sender: snapshot.data().username,
            senderProfileImg: snapshot.data().profileImg, //sender's dp not owner's dp
            read: false,
            contentID: doc.id,
            contentName: doc.data().linkTitle,
            contentImg: doc.data().linkImg,
            type: "link",
          });
        }
      })
      .catch((error) => {
        console.error(error);
      });
  });

//triggers deleting notifications for unliking a link
exports.deleteNotificationOnUnlikeLink = functions
  .region("asia-southeast1")
  .firestore.document("likesLink/{id}")
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((error) => {
        console.error(error);
      });
  });

//sync user profile image change across their previously created albums
exports.onProfileImageChange = functions
  .region("asia-southeast1")
  .firestore.document("/users/{userID}")
  .onUpdate((change) => {
    //change snapshot has values before and after it was edited

    if (change.before.data().profileImg !== change.after.data().profileImg) {
      const batch = db.batch();
      return db
        .collection("albums")
        .where("username", "==", change.before.data().username)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const album = db.doc(`/albums/${doc.id}`);
            batch.update(album, {
              profileImg: change.after.data().profileImg,
            });
          });
          return batch.commit();
        });
    } else return true;
  });

//delete the particular album's likes, the links under the album, and the likes of those links, and the notifications
exports.onAlbumDelete = functions
  .region("asia-southeast1")
  .firestore.document("/albums/{albumID}")
  .onDelete((snapshot, context) => {
    //context has the parameters that we have in the url
    const albumID = context.params.albumID;
    const batch = db.batch();
    let linkIDs = [];

    return db
      .collection("likesAlbum")
      .where("albumID", "==", albumID)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likesAlbum/${doc.id}`));
        });

        return db.collection("links").where("albumID", "==", albumID).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          linkIDs.push(doc.id);
          batch.delete(db.doc(`/links/${doc.id}`));
        });

        linkIDs.forEach((id) => {
          db.collection("likesLink")
            .where("linkID", "==", id)
            .get()
            .then((data) => {
              data.forEach((doc) => {
                batch.delete(db.doc(`/likesLink/${doc.id}`));
              });
            })
            .catch((error) => {
              console.error(error);
            });
          //here we have access to each link's id
          //delete the link's notifications from here
          db.collection("notifications")
            .where("contentID", "==", id)
            .get()
            .then((data) => {
              data.forEach((doc) => {
                batch.delete(db.doc(`/notifications/${doc.id}`));
              });
            })
            .catch((error) => {
              console.error(error);
            });
        });
        return db
          .collection("notifications")
          .where("contentID", "==", albumID)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((error) => {
        console.error(error);
      });
  });
//delete the link and if like links has the link's id, delete that like too
exports.onLinkDelete = functions
  .region("asia-southeast1")
  .firestore.document("/links/{linkID}")
  .onDelete((snapshot, context) => {
    //context has the parameters that we have in the url
    const linkID = context.params.linkID;
    const batch = db.batch();

    return db
      .collection("likesLink")
      .where("linkID", "==", linkID)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likesLink/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((error) => {
        console.error(error);
      });
  });

//to change region:
// exports.api = functions.region('europe-west1').https.onRequest(app);
