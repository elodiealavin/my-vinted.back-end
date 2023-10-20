const User = require("../index");

const isAuthenticated = async (req, res, next) => {
  //console.log("test");
  if (req.headers.authorization) {
    const user = await User.findOne({
      token: req.headers.authorization.replace("Bearer ", ""), // => méthode replace
    });
    console.log(req.headers.authorization.replace("Bearer ", ""));
    console.log(user);
    if (!user) {
      return res.status(401).json({ error: " Unauthorized1" });
    } else {
      req.user = user; // attention ici contient toutes les infos du client
      // on peut utiliser : const user = await findOne ({token, token}).select("account_id") =>> plus sécure
      return next();
    }
  } else {
    return res.status(401).json({ error: "Unauthorized2" });
  }
};

module.exports = isAuthenticated;
