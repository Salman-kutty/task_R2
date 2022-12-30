const { Sequelize } = require('sequelize');
const db = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USERNAME,
    process.env.DB_PASSWORD,
    {
        host: 'localhost',
        dialect: 'mssql'
    }
)
db.sync({}).then(() => console.log("Models are Synced"))
    .catch((err) => console.log("Error while syncing models ", err))


module.exports = db;