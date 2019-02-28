//MODULES
const UserSchema = require('../utils/db/user'),
  FlightSchema = require('../utils/db/flight'),
  routes = require('express').Router(),
  auth = require('../utils/auth');

//CUSTOM
const MESSAGES =  require('../utils/messages'),
  mailgun = require('./email');


const Client = UserSchema.mongoose.model('clientCollection', UserSchema.clientSchema),
  Flight = FlightSchema.mongoose.model('flightCollection', FlightSchema.flightSchema);

//Verifica se o localizador da passagem já existe
generateLocator = function () {
  return new Promise(function (resolve, reject) {
    const RAND_TOKEN = require('rand-token');
    let code = new Array();
    code.push(RAND_TOKEN.generate(10));
    code.push(RAND_TOKEN.generate(10));

    Client.find({ 'passage.locator': { $in: [code[0], code[1]] } }, { 'passage.locator': 1 }, function (err, data) {
      if (err) {
        reject(false);
      }
      else if (data.length == 0) {
        resolve(code);
      }
      reject(false);
    });
  });
}

routes.post('/', auth.authenticate('jwt', { session: false }), (req, res) => {

  let order = new Array(req.body.going);
  let id = new Array(req.body.going.flight);
  const user = req.user;

  if (req.body.back) {
    id[1] = req.body.back.flight;
    if(id[0] == id[1]) {
      return res.status(500).json(MESSAGES.ERROR_SEARCH_FLIGHT);
    }
    order[1] = req.body.back;
  }

  Flight.find({ '_id': { $in: id } }, { 'departure': 1, 'landing': 1, 'availableSeat': 1, 'status': 1, 'seat': 1 }, function (err, data) {

    if (err || !data) {
      return res.status(500).json(MESSAGES.NOT_REGISTERED_FLIGHT);
    }
    //Verifica se o voo ainda esta disponivel para compra
    if (data[0].status != 0) {
      return res.status(500).json(MESSAGES.INDISPONIBLE_GOING_FLIGHT);
    }
    if (data[1]) {
      if (data[1].status != 0) {
        return res.status(500).json(MESSAGES.INDISPONIBLE_BACK_FLIGHT);
      }
    }
    //Verifica se os assentos estão disponiveis
    if (!checkSeat(data[0].seat, order[0].passenger) || data[0].availableSeat < order[0].passenger.length) {
      return res.status(500).json(MESSAGES.INDISPONIBLE_GOING_FLIGHT);
    }
    if (order[1]) {
      if (!checkSeat(data[1].seat, order[1].passenger) || data[1].availableSeat < order[1].passenger.length) {
        return res.status(500).json(MESSAGES.INDISPONIBLE_BACK_FLIGHT);
      }
      //Adiciona dados do voo no objeto de ordem para poder enviar os dados por email
      order[1].dataFlight = {
        'departure': data[1].departure,
        'landing': data[1].landing
      };
    }
    //Adiciona dados do voo no objeto de ordem para poder enviar os dados por email
    order[0].dataFlight = {
      'departure': data[0].departure,
      'landing': data[0].landing
    };

    updateFight(order[0]).then(() => {
      if (data[1]) {
        updateFight(order[1]).then(() => {
          updateClient(order, user.email, res);

        }).catch(() => {
          return res.status(500).json(ERROR_REGISTER_FLIGHT);
        });
      }
      else {
        updateClient(order, user.email, res);
      }
    }).catch(() => {
      return res.status(500).json(ERROR_REGISTER_FLIGHT);
    });
  });
});


/**
 * Verifica se o assento esta disponivel
 * @param flightSeat os assentos do voo
 * @param passenger objeto de passageiro
 */
checkSeat = function (flightSeat, passenger) {
  let isFree = true;
  for (let i = 0; i != passenger.length; i++) {
    for (let j = 0; j != flightSeat.length; j++) {
      if (passenger[i].seat._id == flightSeat[j]._id) {
        if (flightSeat[j].status) {
          isFree = false;
          break;
        }
      }
    }
    if (!isFree) {
      return isFree;
    }
  }
  return isFree;
}

/**
 * Faz update da passagem na collection de client
 * @param order objeto de passagem
 * @param email email do cliente
 */
updateClient = function (order, email, res) {
  generateLocator().then(result => {
    //Adiciona o localizador na passagem
    order[0].locator = result[0];
    if (order[1]) {
      order[1].locator = result[1];
    }
    Client.update({ 'email': email }, { $push: { passage: { $each: order } } }, { upsert: false, multi: false }, function (err, raw) {
      if (err || raw.nModified == 0) {
        return res.status(500).json(ERROR_REGISTER_FLIGHT);
      }
      mailgun.send(order, 'order');
      return res.status(200).json(MESSAGES.SUCCESS_REGISTER_FLIGHT);
    });
  }).catch(() => {
    generateLocator();
  });
}

/**
 * Faz o update das passagens compradas
 * @param order as passagens que serão compradas
 */
updateFight = function (order) {
  return new Promise(function (resolve, reject) {
    for (let i = 0; i != order.passenger.length; i++) {
      let seat = order.passenger[i].seat._id;
      Flight.updateOne({ '_id': order.flight, 'seat._id': seat }, { 'seat.$.passenger': order.passenger[i], $inc: { 'availableSeat': -1 }, 'seat.$.status': true }, function (err, raw) {
        if (err || raw.nModified == 0) {
          reject();
        }
        else if (i == order.passenger.length - 1) {
          resolve();
        }
      });
    }
  });
}

routes.patch('/cancel', auth.authenticate('jwt', { session: false }), (req, res) => {

  const locator = req.body.locator;
  Client.findOneAndUpdate({ 'passage': { $elemMatch: { 'locator': locator, 'status': 'confirmado' } } }, { $set: { 'passage.$.status': 'cancelado', 'passage.$.checkin': false } }, { 'fields': { 'passage.$.flight': 1 } }, function (err, data) {
    if (err) {
      return res.status(500).json(MESSAGES.INTERNAL_ERROR_CANCEL_ORDER);
    }
    if (!data) {
      return res.status(401).json(MESSAGES.ERROR_CANCEL_ORDER);
    }

    const passage = data.passage[0].passenger;
    for (let i = 0; i != passage.length; i++) {
      let seat = passage[i].seat._id;
      Flight.updateOne({ 'seat._id': seat }, { $unset: { 'seat.$.passenger': '' }, $inc: { 'availableSeat': 1 }, 'seat.$.status': false }, function (err, raw) {
        if (err || raw.nModified == 0) {
          return res.status(500).json(MESSAGES.INTERNAL_ERROR_CANCEL_ORDER);
        }
        else if (i == passage.length - 1) {
          return res.status(200).json(MESSAGES.SUCCESS_CANCEL_ORDER);
        }
      });
    }
  });
});

module.exports = routes;