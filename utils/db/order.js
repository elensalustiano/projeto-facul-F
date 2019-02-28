const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  locator: { type: String },
  price: Number,
  flight: { type: mongoose.Schema.Types.ObjectId, ref: 'flightCollection' },
  checkin: { type: Boolean, default: false },
  passenger: [{
    name: { type: String},
    phone: Number,
    gender: String,
    birthDate: Date,
    ageGroup: String,
    specialNeeds: {
      has: Boolean,
      description: String
    },
    document: String,
    seat: {
      _id: String,
      class: Number,
      line: Number,
      column: String,
      position: String,
      emergencyExit: Boolean
    }
  }],
  pay: {
    creditCardNumber: { type: Number },
    name: { type: String },
    validationDate: { type: Date },
    flag: { type: String },
    status: Boolean
  },
  status: { type: String, default: 'confirmado' }
});

module.exports = {
  orderSchema: orderSchema
};