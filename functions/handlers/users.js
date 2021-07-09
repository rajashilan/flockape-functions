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
} = require("../util/validators");

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
          //return res.status(201).json({ token });
          return res.status(201).json({ message: "Email verification sent" });
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

//add user details
exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);

  if (userDetails.hasOwnProperty("fullName")) {
    //capitalise user's full name
    userDetails.fullName = capitaliseName(userDetails.fullName);
  }

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
  //get all the user's likes from the likes collection
  db.doc(`/users/${req.user.username}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection("likes")
          .where("username", "==", req.user.username)
          .get();
      }
    })
    .then((data) => {
      userData.likes = [];
      data.forEach((doc) => {
        userData.likes.push(doc.data());
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
  });
  busboy.end(req.rawBoy);
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
      return res.status(500).json({ message: "Something went wrong" });
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

  const user = firebase.auth().currentUser;

  var credential = firebase.auth.EmailAuthProvider.credential(
    firebase.auth().currentUser.email,
    newPassword.oldPassword
  );

  user
    .reauthenticateWithCredential(credential)
    .then(() => {
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
        .json({ message: "Invalid password. Please try again" });
    });
};
