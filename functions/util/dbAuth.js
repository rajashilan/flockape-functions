const { admin } = require("./admin");
const { db } = require("../util/admin");

module.exports = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    //get the id token from the header
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    console.error("No token found");
    return res.status(403).json({ error: "Unauthorized" });
  }

  //check whether the id token is from our database
  //if yes, decode the token to get user data
  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.user = decodedToken;
      console.log(decodedToken);

      //get the username
      return db
        .collection("users")
        .where("userID", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      req.user.username = data.docs[0].data().username;
      return next();
    })
    .catch((error) => {
      console.error("Error while verifying token", error);
      return res.status(403).json({ error });
    });
};
