const { db } = require("../util/admin");

const config = require("../util/config");

const firebase = require("firebase");
firebase.initializeApp(config);

const { validateSignUpData, validateLogInData } = require("../util/validators");

exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    username: req.body.username,
  };

  const { valid, errors } = validateSignUpData(newUser);

  if (!valid) return res.status(400).json(errors);

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
        userID,
      };

      //create a new document for the user under the 'users' collection using the data recieved
      return db.doc(`/users/${newUser.username}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch((error) => {
      console.error(error);
      //handle the email error from firebase
      if (error.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already in use." });
      } else {
        return res.status(500).json({ error: error.code });
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
      if (error.code === "auth/user-not-found") {
        return res.status(400).json({ general: "User not found" });
      } else if (error.code === "auth/wrong-password") {
        return res
          .status(400)
          .json({ general: "Invalid user credentials, please try again" });
      } else {
        return res.status(500).json({ error: error.code });
      }
    });
};
