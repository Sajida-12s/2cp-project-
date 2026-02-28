const mysql = require("mysql2");

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "your_password",
    database: "your_database"
});

module.exports = db.promise();