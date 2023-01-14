const express = require("express");
const recordRoutes = express.Router();
const dbo = require("../db/conn");
const ObjectId = require("mongodb").ObjectId;

// przykład => /products?filter={"price": {"$gt": 100}}&sort={"name": 1}
recordRoutes.route("/products").get(async (req, res) => {
  try {
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    const sort = req.query.sort ? JSON.parse(req.query.sort) : {};

    let db_connect = dbo.getDb("magazyn");
    let docs = await db_connect
      .collection("products")
      .find(filter)
      .sort(sort)
      .toArray();
    res.send(docs);
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Wystąpił błąd podczas pobierania dokumentów z bazy danych.",
    });
  }
});

recordRoutes.route("/products/:id").get(async function (req, res) {
  try {
    let db_connect = dbo.getDb("magazyn");
    let myquery = { _id: ObjectId(req.params.id) };
    let result = await db_connect.collection("products").findOne(myquery);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Wystąpił błąd podczas pobierania dokumentu z bazy danych.",
    });
  }
});

recordRoutes.route("/products/add").post(async function (req, res) {
  try {
    let db_connect = dbo.getDb("magazyn");
    let existingProduct = await db_connect
      .collection("products")
      .findOne({ name: req.body.name });
    if (existingProduct) {
      res.status(400).send({ error: "Produkt o podanej nazwie już istnieje." });
    } else {
      let myobj = {
        name: req.body.name,
        price: req.body.price,
        description: req.body.description,
        quantity: req.body.quantity,
        unit: req.body.unit,
      };
      let insertResult = await db_connect
        .collection("products")
        .insertOne(myobj);
      res.json(insertResult);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Wystąpił błąd podczas dodawania produktu do bazy danych.",
    });
  }
});

recordRoutes.route("/products/update/:id").put(async function (req, res) {
  try {
    let db_connect = dbo.getDb("magazyn");
    let newValues = {};
    if (req.body.name) newValues.name = req.body.name;
    if (req.body.price) newValues.price = req.body.price;
    if (req.body.description) newValues.description = req.body.description;
    if (req.body.quantity) newValues.quantity = req.body.quantity;
    if (req.body.unit) newValues.unit = req.body.unit;

    let updateResult = await db_connect
      .collection("products")
      .updateOne({ _id: ObjectId(req.params.id) }, { $set: newValues });

    console.log("1 document updated successfully");
    res.json(updateResult);
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Wystąpił błąd podczas aktualizowania produktu w bazie danych.",
    });
  }
});

recordRoutes.route("/products/:id").delete(async function (req, res) {
  try {
    let db_connect = dbo.getDb("magazyn");
    let myquery = { _id: ObjectId(req.params.id) };
    let product = await db_connect.collection("products").findOne(myquery);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
    } else {
      let deleteResult = await db_connect
        .collection("products")
        .deleteOne(myquery);

      if (deleteResult.deletedCount === 0) {
        res.status(404).json({ error: "Product not found" });
      } else {
        console.log("1 document deleted");
        res.json(deleteResult);
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Wystąpił błąd podczas usuwania produktu z bazy danych.",
    });
  }
});

recordRoutes.route("/report").get(function (req, response) {
  let db_connect = dbo.getDb("magazyn");

  db_connect
    .collection("products")
    .aggregate([
      {
        $group: {
          _id: "$name",
          totalQuantity: { $sum: "$quantity" },
          totalValue: { $sum: { $multiply: ["$price", "$quantity"] } },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          totalQuantity: 1,
          totalValue: 1,
        },
      },
    ])
    .toArray((err, res) => {
      if (err) {
        console.error(err);
        response.status(500).send({
          error: "Wystąpił błąd podczas agregowania danych.",
        });
      } else {
        response.json(res);
      }
    });
});
module.exports = recordRoutes;
