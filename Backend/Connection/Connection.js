const mongoose = require('mongoose');
require('dotenv').config();

const conn = ()=>{
    mongoose.connect(process.env.URI);
    console.log('database connected');
}
module.exports= conn;