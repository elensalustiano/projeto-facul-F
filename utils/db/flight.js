const mongoose = require("mongoose");
mongoose.connect("mongodb+srv://projetof:projetoF@cluster0-wewpl.mongodb.net/projetof?retryWrites=true");

flightSchema = new mongoose.Schema({
    code: {type: String, required: true},
    company: String,
    priceAdult: Number,
    priceChild: Number,
    plane: {
      code: {type: String, required: true},
      model: String
    },
    departure: {
      airport: {type: String, required: true},
      abbreviation: String,
      city: String,
      gate: String,
      date: String,
      time:String
    },
    landing: {
      airport:{type: String, required: true},
      abbreviation: String,
      city: String,
      gate: String,
      date: String,
      time:String
    },
    connection: [{
      airport: {type: String, required: true},
      abbreviation: String,
      city: String,
      gate: String,
      date: String,
      time:String
    }],
    availableSeat: Number,
    seat: [{
      class: Number,
      line: Number,
      column: String,
      position: String, //(“janela”, “corredor”, ”meio”)
      emergencyExit: Boolean,
      status: Boolean,
      checkin: { type: Boolean, default: false },
      passenger: {
        name: String,
        phone: Number,
        gender: String,
        birthDate: Date,
        ageGroup: String,
        specialNeeds: {
          has: Boolean,
          description: String
        },
        document: {
          cpf: Number,
          rg: String,
          cnh: String,
          BirthCertificate: String,
          passport: String
        }
      }
    }],
    status: Number
  }, {collection: "flightCollection"}
);

module.exports = {
  flightSchema: flightSchema,
  mongoose: mongoose
}