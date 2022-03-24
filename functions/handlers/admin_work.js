const { admin, db } = require("../util/admin");
const config = require("../util/config");

const { validateFeedbackData } = require("../util/validators");

//function to submit feedback forms
exports.submitFeedback = (req, res) => {
  const newFeedback = {
    email: req.body.email,
    message: req.body.message,
    read: false,
    implementable: false,
    createdAt: new Date().getTime(),
  };

  const { valid, errors } = validateFeedbackData(newFeedback);

  if (!valid) return res.status(400).json(errors);

  db.collection("feedback")
    .add(newFeedback)
    .then((doc) => {
      return res.json({
        message: "Feedback submitted successfully. Thank you :)",
      });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: "Something went wrong" });
    });
};
