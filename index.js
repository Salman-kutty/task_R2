const express = require('express');
require('dotenv').config();
const bodyParser = require('body-parser');
const db = require("./database");
const redisCtrl = require('./controller/redisCtrl');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
db.authenticate()
    .then(() => console.log("Database is connected..."))
    .catch((err) => console.log("Error while connecting Database...", err))
const port = process.env.PORT;

function run() {
    redisCtrl.resetting()
}
run()


app.post("/postData", redisCtrl.postData);
app.delete("/delete/:id", redisCtrl.deleteData);
app.put("/update/:id", redisCtrl.updateData);
//app.get("/allData", redisCtrl.getAllData);
app.get("/filterData", redisCtrl.filteringData)

app.listen(port, () => console.log(`Server is running at port number : ${port}`))
