const { db } = require("../util/admin");

exports.getAllAlbums = (req, res) => {
  db.collection("albums")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let albums = [];
      data.forEach((doc) => {
        albums.push({
          albumID: doc.id,
          albumTitle: doc.data().albumTitle,
          username: doc.data().username,
          createdAt: doc.data().createdAt,
        });
      });
      return res.json(albums);
    })
    .catch((error) => console.error(error));
};

exports.createAnAlbum = (req, res) => {
  const newAlbum = {
    albumTitle: req.body.albumTitle,
    username: req.user.username,
    createdAt: new Date().getTime(),
  };

  db.collection("albums")
    .add(newAlbum)
    .then((doc) => {
      res.json({ message: `Album ${doc.id} created successfully` });
    })
    .catch((error) => {
      res.status(500).json({ error: "something went wrong" });
      console.error(error);
    });
};
