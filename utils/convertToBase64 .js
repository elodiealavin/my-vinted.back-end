const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

//convertToBase64(req.files.pictures[0]);

module.exports = convertToBase64;
