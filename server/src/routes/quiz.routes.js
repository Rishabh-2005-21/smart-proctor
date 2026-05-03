const router = require("express").Router();
const Quiz = require("../models/Quiz");
const { v4: uuid } = require("uuid");

router.post("/create", async (req, res) => {
  const quiz = await Quiz.create({
    ...req.body,
    code: uuid().slice(0, 6).toUpperCase()
  });
  res.json(quiz);
});

router.get("/:code", async (req, res) => {
  const quiz = await Quiz.findOne({ code: req.params.code });
  res.json(quiz);
});

module.exports = router;
