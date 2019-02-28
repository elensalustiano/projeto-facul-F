const mongoose = require("mongoose");
mongoose.connect("mongodb+srv://projetof:projetoF@cluster0-wewpl.mongodb.net/projetof?retryWrites=true");
const schema = require('./order');

let clientSchema =  new  mongoose.Schema({
    email: {type: String, required: true, unique: true},
    cpf: {type: String, required: true, unique: true},
    name : {type: String, required: true},
    phone: Number,
    password: {type: String, required: true},
    address: {
      number: String,
      neighborhood: String,
      city: String,
      country: String,
      zipCode: Number
    },
    passage: [schema.orderSchema]
  }, {collection: "clientCollection"}
);

module.exports = {
  clientSchema: clientSchema,
  mongoose: mongoose
};