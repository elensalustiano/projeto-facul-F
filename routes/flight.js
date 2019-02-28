//MODULES
const Db = require('../utils/Db/flight'),
  Routes = require('express').Router();

//CUSTOM
const Messages = require('../utils/Messages');

const Flight = Db.mongoose.model('flightCollection', Db.flightSchema);

/**
 * Pesquisa voos
 */
Routes.post('/search', (req, res) => {
  let search = req.body;

    //Busca de ida
    Flight.find({'status': 0, 'availableSeat': { $gt: 0 }, 'departure.airport': search.origin, 'departure.date' : search.dateOut,'landing.airport': search.destiny}, (errGoing, dataGoing) => {

    //Busca de volta
    if (search.dateReturn) {
      Flight.find({'status': 0, 'availableSeat': { $gt: 0 }, 'departure.airport': search.destiny, 'departure.date' : search.dateReturn,'landing.airport': search.origin}, (errBack, dataBack) => {
        if (errBack && errGoing) {
          return res.status(500).json(Messages.UNEXPECTED_ERROR);
        }
        return res.status(200).json({'ida': dataGoing, 'volta': dataBack});
      });
    }
    else {
      if (errGoing) {
        return res.status(500).json(Messages.UNEXPECTED_ERROR);
      }
      return res.status(200).json({'ida': dataGoing});
    }
  });
});

Routes.post('/register', (req, res) => {
  const user = req.body;
  Flight.create(user, (err) => {
    if (err) {
        res.status(401).json(err);
    }
    else {
      res.status(200).json('Cadastrado realizado com sucesso');
    }
    });
});

module.exports = Routes;