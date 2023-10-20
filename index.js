const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

const app = express();
app.use(express.json());
// app.use(fileUpload());
app.use(cors());

require("dotenv").config();
mongoose.connect(process.env.MONGODB_URI);

const User = mongoose.model("User", {
  email: String,
  account: {
    username: String,
    avatar: Object, // nous verrons plus tard comment uploader une image
  },
  newsletter: Boolean,
  token: String,
  hash: String,
  salt: String,
});

module.exports = User; // j'exporte mon modèle

//Create
app.post("/user/signup", async (req, res) => {
  //console.log(req.body.password);
  try {
    const token = uid2(64);
    const salt = uid2(16);
    const hash = SHA256(req.body.password + salt).toString(encBase64); // pour encrypter un mot de passe

    const newUser = new User({
      account: {
        username: req.body.username,
      },
      email: req.body.email,
      newsletter: req.body.newsletter,
      token,
      hash,
      salt,
    });
    // console.log(newUser);

    // le mail existe déjà
    const userMail = await User.findOne({ email: req.body.email });
    //console.log(userMail);
    if (userMail) {
      return res.json({ message: "email already exist" });
    }
    //si le username n'est pas renseigné
    if (req.body.username === undefined) {
      res.json({ message: "username doesn't registered" });
    } else {
      await newUser.save();
      // {
      //     "_id": "5b4cdf774f53952a5f849635",
      //     "token": "bmaDNrycfhCkmXYKRdRUrzSkUAW-8LuxfdUyfStVNFS1fklp1t17nBkZrRdSNh7W",
      //     "account": {
      //       "username": "JohnDoe",// }

      //je répond au client
      res.status(201).json({
        _id: newUser._id,
        token: newUser.token,
        account: newUser.account,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// login - connexion
app.post("/user/login", async (req, res) => {
  try {
    const userLogin = await User.findOne({ email: req.body.email });
    // si l'email n'est pas enregistré
    if (!userLogin) {
      return res.status(401).json({ message: "error" });
    }
    // vérification mot de passe
    const hash2 = SHA256(req.body.password + userLogin.salt).toString(encBase64);

    if (hash2 !== userLogin.hash) {
      return res.status(401).json({ message: "error" });
    } else {
      // Je répond OK au client
      res.status(200).json({
        _id: userLogin._id,
        token: userLogin.token,
        account: {
          username: userLogin.account.username,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//--------

// poster une annonce ==>> avoir une reference vers l'utilisateur qui la poste + être authentifié
// import dossier middlewares et converToBase64
const convertToBase64 = require("../Vinted/utils/convertToBase64 ");
const isAuthenticated = require("../Vinted/middlewares/isAuthenticated");

// Import de fileupload
const fileUpload = require("express-fileupload");
// Import de cloudinary
const cloudinary = require("cloudinary").v2;
//const isAuthenticated = require("./middlewares/isAuthenticated");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// poster une annonce

const Offer = mongoose.model("Offer", {
  product_name: String,
  product_description: String,
  product_price: Number,
  product_details: Array,
  product_image: Object,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

app.post("/offer/publish", isAuthenticated, fileUpload(), async (req, res) => {
  try {
    const newOffer = new Offer({
      product_name: req.body.title,
      product_description: req.body.description,
      product_price: req.body.price,
      product_details: [
        { MARQUE: req.body.brand },
        { TAILLE: req.body.size },
        { ETAT: req.body.condition },
        { COULEUR: req.body.color },
        { EMPLACEMENT: req.body.city },
      ],
      owner: req.user,
    });

    if (req.files) {
      // traitement image
      const picture = req.files.picture; // ==>> stock la clef de picture
      const readablePicture = convertToBase64(picture); // ==>> converti l'image pour être lu par cloudinary
      const picturefolder = await cloudinary.api.create_folder(`/vinted/offers/${newOffer._id}`); // ==>> creation dossier sur cloudinary pous stocker l'image
      const result = await cloudinary.uploader.upload(readablePicture, { folder: picturefolder.path }); // ==>> envoi de l'image à cloudinary et recup de la réponse
      // const result = await cloudinary.uploader.upload(convertToBase64(req.files.picture));
      newOffer.product_image = result;
    }
    //newOffer.product_image = result; // ==>> j'assigne l'image à mon offre
    //console.log(result);
    //return;
    await newOffer.save();
    //console.log(newOffer);
    res.status(201).json(newOffer);
  } catch (error) {
    //console.log(error);
    res.status(500).json({ message: error.message });
  }
});

//--------

// route pour modifier l'annonce

//Update
app.put("/offer/publish/:id", fileUpload(), async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    //console.log(offer);
    //console.log(req.params); => { id: '_id=6531301cd832d1c030c490e0' }
    //console.log(req.body);
    if (offer) {
      if (req.body.product_title) {
        offer.product_name = req.body.product_title;
      }
      if (req.body.product_price) {
        offer.product_price = req.body.product_price;
      }
      if (req.body.product_description) {
        offer.product_description = req.body.product_description;
      }
      if (req.body.product_size) {
        offer.product_details[1] = req.body.product_size;
      }
      if (req.body.product_brand) {
        offer.product_details[0] = req.body.product_brand;
      }
      if (req.body.product_condition) {
        offer.product_details[2] = req.body.product_condition;
      }
      if (req.body.product_color) {
        offer.product_details[3] = req.body.product_color;
      }
      if (req.body.product_city) {
        offer.product_details[4] = req.body.product_city;
      }
    }
    //console.log(offer);
    await offer.save();

    res.json({ message: "offer updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//ANNONCE

app.get("/offers", (req, res) => {});
// pour pouvoir faire des annonces sans photos
try {
} catch (error) {
  res.status(500).json({ message: error.message });
}

app.all("*", (req, res) => {
  res.status(404).json({ message: "This route doesn't exist" });
});

app.listen(process.env.PORT, () => {
  console.log("server started");
});
