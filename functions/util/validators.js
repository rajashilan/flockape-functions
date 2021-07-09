const isEmpty = (string) => {
  if (string.trim() === "") return true;
  else return false;
};

const isEmail = (email) => {
  const regEx =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(regEx)) return true;
  else return false;
};

const isDate = (date) => {
  const dateFormat =
    /^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}$/;

  var dateCheck = new Date();

  if (date.match(dateFormat)) {
    const dateSplit = date.split("/");
    const day = parseInt(dateSplit[0], 10);
    const month = parseInt(dateSplit[1], 10);
    const year = parseInt(dateSplit[2], 10);

    if (
      year < dateCheck.getFullYear() - 150 ||
      year > dateCheck.getFullYear() ||
      month < 1 ||
      month > 12
    ) {
      return false;
    } else {
      let monthsLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

      // Adjust for leap years
      if (year % 400 == 0 || (year % 100 != 0 && year % 4 == 0))
        monthLength[1] = 29;

      if (day > 0 && day >= monthsLength[month - 1]) {
        return true;
      } else {
        return false;
      }
    }
  } else return false;
};

exports.validateSignUpData = (data) => {
  let errors = {};

  if (isEmpty(data.email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(data.email)) {
    errors.email = "Must be a valid email address";
  }

  if (isEmpty(data.password)) errors.password = "Must not be empty";
  if (data.password !== data.confirmPassword)
    errors.confirmPassword = "Passwords must match";
  if (isEmpty(data.username)) errors.username = "Must not be empty";
  if (isEmpty(data.fullName)) errors.fullName = "Must not be empty";
  if (isEmpty(data.birthday)) {
    errors.birthday = "Must not be empty";
  } else if (isDate(data.birthday)) {
    errors.birthday = "Invalid date";
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.validateLogInData = (data) => {
  //validate users
  let errors = {};

  if (isEmpty(data.email)) errors.email = "Must not be empty";
  if (isEmpty(data.password)) errors.password = "Must not be empty";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.reduceUserDetails = (data) => {
  let userDetails = {};

  //if data has attributes that are empty, dont add them to userDetails object
  if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio;

  if (!isEmpty(data.website.trim())) {
    //add http to website input if it is not entered by user
    if (data.website.trim().substring(0, 4) !== "http") {
      userDetails.website = `http://${data.website.trim()}`;
    } else userDetails.website = data.website;
  }

  if (!isEmpty(data.location.trim())) userDetails.location = data.location;

  return userDetails;
};

exports.validatePasswordReset = (email) => {
  let errors = {};

  if (isEmpty(email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(email)) {
    errors.email = "Must be a valid email address";
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.validatePasswordUpdate = (data) => {
  let errors = {};

  if (isEmpty(data.oldPassword)) errors.oldPassword = "Must not be empty";
  if (isEmpty(data.password)) errors.password = "Must not be empty";
  if (data.password !== data.confirmPassword)
    errors.confirmPassword = "Passwords must match";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.validateAlbumTitle = (albumTitle) => {
  let errors = {};

  if (isEmpty(albumTitle)) errors.albumTitle = "Must not be empty";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};
