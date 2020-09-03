//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const _ = require('lodash');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const ATLAS_ADMIN_USER = process.env.ATLAS_ADMIN_USER;
const ATLAS_ADMIN_PASSWORD = process.env.ATLAS_ADMIN_PASSWORD;
const ATLAS_MONGODB_URI = process.env.ATLAS_MONGODB_URI;
mongoose.connect(`mongodb+srv://${ATLAS_ADMIN_USER}:${ATLAS_ADMIN_PASSWORD}@${ATLAS_MONGODB_URI}`, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

const itemsSchema = {name: String};
const Item = mongoose.model('Item', itemsSchema);

const item1 = new Item({
  name: 'Welcome to your todolist!',
});
const item2 = new Item({
  name: 'Hit the + button to add a new item.',
});
const item3 = new Item({
  name: '<-- Hit this to delete an item.',
});
const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema],
}
const List = mongoose.model('List', listSchema);


const workItems = [];

app.get("/", function(req, res) {

  Item.find({}, (err, items) => {
    if (err) {
      console.log(err);
      return;
    }

    if (items.length === 0) {
      Item.insertMany(defaultItems, (err) => {
        if (err) { console.log(err); }

        res.redirect('/');
      });
    } else {
      res.render("list", {listTitle: 'Today', newListItems: items});
    }
  })

});

app.get("/:customListName", function(req,res){
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({name: customListName}, (err, foundList) => {
    if (err) return;

    if(!foundList) {
      console.log(`Doesn't exist`);
      // Create a new list
      const list = new List({
        name: customListName,
        items: defaultItems,
      });
      list.save();
      res.redirect('/'+customListName);
    } else {
      console.log('Exists');
      // Show an existing list
      res.render('list', {listTitle: customListName, newListItems: foundList.items});
    }
  });
});

app.post("/", function(req, res){
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName,
  });

  if (listName === 'Today') {
    item.save();
    res.redirect('/');
  } else {
    List.findOne({name: listName}, (err, foundList) => {
      foundList.items.push(item);
      foundList.save();
      res.redirect('/' + listName);
    });
  }

  
});

app.post('/delete', (req, res) => {
  console.log(req.body);
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === 'Today') {
    Item.findByIdAndRemove(checkedItemId, (err) => {
      if (!err) {
        console.log('Successfully deleted checked item.');
        res.redirect('/');
      }
    });
  } else {
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, (err, foundList) => {
      if (!err) {
        res.redirect('/'+listName);
      }
    })
  }
});

app.get("/about", function(req, res){
  res.render("about");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started on port "+port);
});
