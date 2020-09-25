const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://admin-braden:meanaboutit@cluster0.ftn1z.mongodb.net/todolistDB?retryWrites=true&w=majority", {useNewUrlParser: true, useUnifiedTopology: true});

const itemsSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your list."
});
const item2 = new Item({
  name: "Click the plus button to add some items."
});
const item3 = new Item({
  name: "Check items off to remove them."
});

const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema]
});

const List = mongoose.model("List", listSchema);


app.get("/", function(req, res) {

  Item.find({}, function (err, foundItems) {

    if (foundItems.length === 0) {

      Item.insertMany(defaultItems, function (err) {
        if (!err) {
          console.log("Added default items.");
        }
      });

      res.redirect("/")

    } else {
      res.render("list", {listTitle: "Today", newListItems: foundItems});
    }
  });

});

app.get("/:requestedListName", function (req, res) {
  const requestedListName = _.capitalize(req.params.requestedListName);

  List.findOne({name: requestedListName}, function (err, result) {
    if (result) {
      // Return existing list.
      res.render("list", {listTitle: result.name, newListItems: result.items});

    } else {
      // Create new list.
      const list = List({
        name: requestedListName,
        items: defaultItems
      });

      list.save();
      res.redirect("/" + requestedListName);
    }
  });

});

app.post("/", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  if (listName === "Today") {
    item.save();
    res.redirect("/");

  } else {
    List.findOne({name: listName}, function (err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }

});

app.post("/delete", function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndRemove(checkedItemId, function (err) {});
    res.redirect("/");

  } else {
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function (err, results){});
    res.redirect("/" + listName);
  }

});

app.get("/about", function(req, res){
  res.render("about");
});

app.listen(process.env.PORT || 3000, function() {
  console.log("Server started.");
});
