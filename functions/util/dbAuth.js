const { admin, db } = require("./admin");
module.exports = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    //get the id token from the header
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    console.error("No token found db auth");
    return res.status(401).json({ error: "Unauthorized" });
  }

  //check whether the id token is from our database
  //if yes, decode the token to get user data
  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      //check if user is verified
      // if (!decodedToken.email_verified) {
      //   return res.status(401).json({ general: "Please verify your email" });
      // }

      req.user = decodedToken;
      //get the username
      return db
        .collection("users")
        .where("userID", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      req.user.username = data.docs[0].data().username;
      req.user.profileImg = data.docs[0].data().profileImg;
      req.user.email = data.docs[0].data().email;
      return next();
    })
    .catch((error) => {
      console.error("Error while verifying token", error);
      return res.status(401).json({ error });
    });
};
