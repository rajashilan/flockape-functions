const { admin, db } = require("./admin");

module.exports = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    //get the id token from the header
    idToken = req.headers.authorization.split("Bearer ")[1];

    admin
      .auth()
      .verifyIdToken(idToken)
      .then((decodedToken) => {
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
        return next();
      })
      .catch((error) => {
        console.error("Error while verifying token", error);
        return res.status(401).json({ error });
      });
  } else {
    req.user = {
      fullName: "none",
      username: "none",
    };
    return next();
  }
};
