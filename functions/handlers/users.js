const { admin, db } = require("../util/admin");

const config = require("../util/config");

const firebase = require("firebase");
firebase.initializeApp(config);

const {
  validateSignUpData,
  capitaliseName,
  validateLogInData,
  reduceUserDetails,
  validatePasswordReset,
  validatePasswordUpdate,
  validateFullName,
} = require("../util/validators");

const { generateRandomNumber } = require("../util/filenameGenerator");

exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    username: req.body.username,
    fullName: req.body.fullName,
    birthday: req.body.birthday,
  };

  const { valid, errors } = validateSignUpData(newUser);

  if (!valid) return res.status(400).json(errors);

  //validate age (>13)
  const dateSplit = newUser.birthday.split("/");
  const year = parseInt(dateSplit[2], 10);
  var dateCheck = new Date();
  if (dateCheck.getFullYear() - year < 13)
    return res.status(400).json({ birthday: "Age must be 13 or older" });

  //capitalise user's full name
  newUser.fullName = capitaliseName(newUser.fullName);

  //set all letters in username to lowercase
  newUser.username = newUser.username.toLowerCase();

  const noImg = "no-img-profile.png";

  //check if username already exists before registering user (email will be taken care of by firebase)
  let token, userID;
  db.doc(`/users/${newUser.username}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res
          .status(400)
          .json({ username: "This username is already taken." });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userID = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCredentials = {
        username: newUser.username,
        email: newUser.email,
        createdAt: new Date().getTime(),
        profileImg: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        userID,
        fullName: newUser.fullName,
        birthday: newUser.birthday,
      };

      //create a new document for the user under the 'users' collection using the data recieved
      return db.doc(`/users/${newUser.username}`).set(userCredentials);
    })
    .then(() => {
      firebase
        .auth()
        .currentUser.sendEmailVerification()
        .then(() => {
          return res.status(201).json({ token });
        });
    })
    .catch((error) => {
      console.error(error);
      //handle the email error from firebase
      if (error.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already in use." });
      } else {
        return res
          .status(500)
          .json({ general: "Something went wrong, please try again" });
      }
    });
};

exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  const { valid, errors } = validateLogInData(user);

  if (!valid) return res.status(400).json(errors);

  //sign in user
  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      // console.log("dataAAAA:::::", data.user.refreshToken);
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({ token });
    })
    .catch((error) => {
      console.error(error);
      return res
        .status(400)
        .json({ general: "Invalid user credentials, please try again" });
    });
};

//edit user details (name, bio, location, website)
exports.addUserDetails = (req, res) => {
  const { valid, errors } = validateFullName(req.body.fullName);
  if (!valid) return res.status(400).json(errors);

  let userDetails = reduceUserDetails(req.body);
  userDetails.fullName = capitaliseName(userDetails.fullName);

  db.doc(`/users/${req.user.username}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: "Details added successfully" });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: error.code });
    });
};

//get own user details
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};

  //get all user data from user collection
  //get likes from likes links
  //and get likes from likes albums
  db.doc(`/users/${req.user.username}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        userData.credentials.isVerified = req.user.email_verified;
        return db
          .collection("likesAlbum")
          .where("username", "==", req.user.username)
          .get();
      }
    })
    .then((data) => {
      userData.likesAlbum = [];
      data.forEach((doc) => {
        userData.likesAlbum.push(doc.data());
      });
      return db
        .collection("likesLink")
        .where("username", "==", req.user.username)
        .get();
    })
    .then((data) => {
      userData.likesLink = [];
      data.forEach((doc) => {
        userData.likesLink.push(doc.data());
      });
      return db
        .collection("notifications")
        .where("recipient", "==", req.user.username)
        .orderBy("createdAt", "desc")
        .get();
    })
    .then((data) => {
      userData.notifications = [];
      data.forEach((doc) => {
        userData.notifications.push({
          recipient: doc.data().recipient,
          sender: doc.data().sender,
          read: doc.data().read,
          contentID: doc.data().contentID,
          contentName: doc.data().contentName,
          contentImg: doc.data().contentImg,
          senderProfileImg: doc.data().senderProfileImg,
          createdAt: doc.data().createdAt,
          type: doc.data().type,
          notificationID: doc.id,
        });
      });
      return res.json(userData);
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: error.code });
    });
};

//get any user's details, along with their albums
//private albums should not be shown at all since any user can see this info
exports.getUserDetails = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.username}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.user = doc.data();
        return db
          .collection("albums")
          .where("username", "==", req.params.username)
          .where("security", "==", "public")
          .orderBy("createdAt", "desc")
          .get();
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    })
    .then((data) => {
      userData.albums = [];
      data.forEach((doc) => {
        userData.albums.push({
          albumTitle: doc.data().albumTitle,
          albumImg: doc.data().albumImg,
          likeCount: doc.data().likeCount,
          viewCount: doc.data().viewCount,
          createdAt: doc.data().createdAt,
          username: doc.data().username,
          profileImg: doc.data().profileImg,
          albumID: doc.id,
        });
      });
      return res.json(userData);
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: error.code });
    });
};

exports.searchUsers = (req, res) => {
  let users = [];

  if (req.body.username.length >= 3) {
    db.collection("users")
      .orderBy("username")
      .startAt(req.body.username)
      .endAt(req.body.username + "\uf8ff")
      .limit(5)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          users.push({
            username: doc.data().username,
            avatar: doc.data().profileImg,
            fullName: doc.data().fullName,
          });
        });
        return res.json(users);
      })
      .catch((error) => {
        console.error(error);
        return res.status(500).json({ error: error.code });
      });
  } else {
    return res.json({ message: "Loading" });
  }
};

//marked notifications as read
exports.markNotificationsRead = (req, res) => {
  let batch = db.batch();

  req.body.forEach((notificationID) => {
    const notification = db.doc(`/notifications/${notificationID}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return res.json({ message: "Notificatons marked read" });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: error.code });
    });
};

//upload profile image
exports.uploadProfileImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ image: "Invalid image type" });
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
          .doc(`/users/${req.user.username}`)
          .update({ profileImg: imageUrl });
      })
      .then(() => {
        return res.json({ message: "Profile image uploaded successfully" });
      })
      .catch((error) => {
        console.error(error);
        return res.status(500).json({ error: error.code });
      });
  });
  busboy.end(req.rawBody);
};

//reset forgotten password through email link
exports.resetPassword = (req, res) => {
  const email = req.body.email;

  const { valid, errors } = validatePasswordReset(email);
  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .sendPasswordResetEmail(email)
    .then(() => {
      return res
        .status(200)
        .json({ message: "Reset link sent to your email successfully" });
    })
    .catch((error) => {
      var errorCode = error.code;
      var errorMessage = error.message;
      console.error(errorCode);
      if (errorCode === "auth/user-not-found")
        return res.status(404).json({ email: "Email is not registered." });
      else return res.status(500).json({ error: "Something went wrong" });
    });
};

//update password
exports.changePassword = (req, res) => {
  const newPassword = {
    oldPassword: req.body.oldPassword,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
  };

  const { valid, errors } = validatePasswordUpdate(newPassword);

  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(req.user.email, newPassword.oldPassword)
    .then((userCredentials) => {
      var user = userCredentials.user;
      user
        .updatePassword(newPassword.password)
        .then(() => {
          return res
            .status(200)
            .json({ message: "Password updated successfully" });
        })
        .catch((error) => {
          console.error(error);
          return res.status(500).json({ error: "Failed to update password" });
        });
    })
    .catch((error) => {
      console.error(error);
      return res
        .status(400)
        .json({ oldPassword: "Invalid password. Please try again" });
    });
};
