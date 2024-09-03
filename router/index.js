var express = require("express");
var router = express.Router();

require("dotenv").config();

router.get("/", function (req, res, next) {
  res.render("index", {
    title: "Express Server",
  });
});

module.exports = router;
