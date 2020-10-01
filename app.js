require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");


// Initialize Express
const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// Initialize Mongoose
mongoose.connect(process.env.MONGO_DB_URL, {useNewUrlParser: true, useUnifiedTopology: true});

// Schema for items with one field for the note itself.
const itemsSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemsSchema);

// List of default items to display in case the list is empty.
const defaultItems = [
  new Item({
  name: "Welcome to your list."
}),
  new Item({
  name: "Click the plus button to add some items."
}),
  new Item({
  name: "Check items off to remove them."
})
];

// Schema for custom lists, which can be accessed by going to /<listName>.
const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema]
});

const List = mongoose.model("List", listSchema);


// Home route, returning all list items or adding one to the database.

app.route("/")

  .get(function(req, res) {

    Item.find({}, function (err, foundItems) {

      // If no items were found in the database, add the defaultItems list.
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

  })

  .post(function(req, res){

    const itemName = req.body.newItem;
    const listName = req.body.list;

    const item = new Item({
      name: itemName
    });

    // If it's the default list, simply save to the database.
    if (listName === "Today") {
      item.save();
      res.redirect("/");

    // If it's a custom list, find the list name and push the list content
    // to it, then save it.
    } else {
      List.findOne({name: listName}, function (err, foundList) {
        foundList.items.push(item);
        foundList.save();
        // Redirect to lists/about page if the user added an item to the
        // "About" list.
        res.redirect("list/" + listName);
      });
    }

  });


// Route for custom lists. If the list doesn't exist, it'll create it.
// Lodash capitalizes the list title so that it can be accessed regardless
// of the capitalization.

app.get("/list/:requestedListName", function (req, res) {
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

      list.save(function (err) {res.redirect("/" + requestedListName);})
    }
  });

});


// Route for deleting a note

app.post("/delete", function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndRemove(checkedItemId, function (err) {});
    res.redirect("/");

  } else {
    // Use $pull to remove the item from the list
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function (err, results){
      res.redirect("list/" + listName);
    });
  }

});


// Returns the about page, about.ejs

app.get("/about", function(req, res){
  res.render("about");
});


// Spin up the server

app.listen(process.env.PORT || 3000, function() {
  console.log("Server started.");
});
