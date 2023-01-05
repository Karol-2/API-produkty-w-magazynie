const express = require("express");
const recordRoutes = express.Router();
const dbo = require("../db/conn");
const ObjectId = require("mongodb").ObjectId;

recordRoutes.route("/products").get((req, res) => {
  // przykład => /products?filter={"price": {"$gt": 100}}&sort={"name": 1}

  const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
  const sort = req.query.sort ? JSON.parse(req.query.sort) : {};

  let db_connect = dbo.getDb("magazyn");

  db_connect
    .collection("products")
    .find(filter)
    .sort(sort)
    .toArray((err, docs) => {
      if (err) {
        console.error(err);
        res.status(500).send({
          error: "Wystąpił błąd podczas pobierania dokumentów z bazy danych.",
        });
      } else {
        res.send(docs);
      }
    });
});

recordRoutes.route("/products/:id").get(function (req, res) {
  let db_connect = dbo.getDb("magazyn");
  let myquery = { _id: ObjectId(req.params.id) };
  db_connect.collection("products").findOne(myquery, function (err, result) {
    if (err) throw err;
    res.json(result);
  });
});

recordRoutes.route("/products/add").post(function (req, response) {
  let db_connect = dbo.getDb("magazyn");

  db_connect
    .collection("products")
    .findOne({ name: req.body.name }, function (err, result) {
      if (err) throw err;

      if (result) {
        // Jeśli produkt istnieje, zwróć błąd
        response
          .status(400)
          .send({ error: "Produkt o podanej nazwie już istnieje." });
      } else {
        // produkt  nie istnieje
        let myobj = {
          name: req.body.name,
          price: req.body.price,
          description: req.body.description,
          quantity: req.body.quantity,
          unit: req.body.unit,
        };
        db_connect.collection("products").insertOne(myobj, function (err, res) {
          if (err) throw err;
          response.json(res);
        });
      }
    });
});

recordRoutes.route("/products/update/:id").put(function (req, response) {
  let db_connect = dbo.getDb("magazyn");

  let newValues = {};
  if (req.body.name) newValues.name = req.body.name;
  if (req.body.price) newValues.price = req.body.price;
  if (req.body.description) newValues.description = req.body.description;
  if (req.body.quantity) newValues.quantity = req.body.quantity;
  if (req.body.unit) newValues.unit = req.body.unit;

  db_connect
    .collection("products")
    .updateOne(
      { _id: ObjectId(req.params.id) },
      { $set: newValues },
      function (err, res) {
        if (err) throw err;
        console.log("1 document updated successfully");
        response.json(res);
      }
    );
});

recordRoutes.route("/products/:id").delete(function (req, res) {
  let db_connect = dbo.getDb("magazyn");
  let myquery = { _id: ObjectId(req.params.id) };
  db_connect.collection("products").deleteOne(myquery, function (err, obj) {
    if (err) throw err;
    console.log("1 document deleted");
    res.json(obj);
  });
});

recordRoutes.route("/report").get(function (req, response) {
  let db_connect = dbo.getDb("magazyn");

  db_connect.collection("products").aggregate(
    [
      {
        $group: {
          _id: "$name",
          totalQuantity: { $sum: "$quantity" },
          totalValue: { $sum: "$price" },
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
    ],
    function (err, res) {
      if (err) throw err;
      response.json(res);
    }
  );
});

module.exports = recordRoutes;
