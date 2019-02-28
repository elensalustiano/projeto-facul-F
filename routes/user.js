//MODULES
const  routes = require('express').Router(),
       bcrypt = require('bcryptjs');

//CUSTOM
const db = require('../utils/db/user'),
      auth = require('../utils/auth'),
      mailgun = require('./email'),
      MESSAGES = require('../utils/messages');

const Client = db.mongoose.model('clientCollection', db.clientSchema);

/**
 * Realiza cadastro de clientes, com criptografia de senha.
 */
routes.post('/', (req, res) => {

  let user = req.body;
  if (!user.password || user.password.trim().length == 0) {
    res.status(401).json(MESSAGES.REQUIRED_PASS);
  }
  else {
    user.password = bcrypt.hashSync(user.password, 8);

    Client.create(user, function (err) {
      if (err) {
        if (err.name == 'MongoError') {
          res.status(401).json(MESSAGES.REGISTERED_USER);
        }
        else {
          res.status(401).json(MESSAGES.REQUIRED_FIELD);
        }
      }
      else {
        res.status(200).json(MESSAGES.SUCCESS_REGISTER);
      }
    });
  }
});

routes.post('/login', (req, res) => {
  let user = req.body;

  if(!user.id || !user.password) {
    res.status(401).json(MESSAGES.REQUIRED_FIELD);
  }

  else {
    Client.findOne({ $or:[ {'email': user.id}, {'cpf': user.id} ] }, {'passage': 0}, function (err, data) {

      if (err) {
        return res.status(500).json(MESSAGES.UNEXPECTED_ERROR);
      }

      if (!data) {
        return res.status(500).json(MESSAGES.LOGIN_ERROR);
      }

      bcrypt.compare(user.password, data.password, function (err, result) {
        if (err) {
          return res.status(401).json(MESSAGES.LOGIN_ERROR);
        }
        if (result) {
          delete data.password;
          return res.json({'token': auth.encode(data.email,'1d'), 'user': data});
        }
        return res.status(401).json(MESSAGES.LOGIN_ERROR);
      });
    });
  }
});

/**
 * Faz update dos dados do usuario
 */
routes.patch('/', auth.authenticate('jwt', { session: false }), (req, res) => {

  const email = req.user.email;
  const newData = req.body;
  const fieldsNotAllow = ['email', 'passage'];
  delete newData._id;

  //Verifica se o objeto possue campos que não podem ser feitos update
  const isNotAllow = fieldsNotAllow.some ((elem) => {
    return newData.hasOwnProperty(elem);
  });

  if(isNotAllow) {
    return res.status(401).json(MESSAGES.FIELDS_NOT_ALLOW_UPDATE);
  }

  if(newData.hasOwnProperty('password')) {
    if(newData.password.trim().length == 0) {
      return res.status(401).json(MESSAGES.REQUIRED_PASS);
    }
    newData.password = bcrypt.hashSync(newData.password, 8);
  }

  Client.findOneAndUpdate({'email': email}, { $set: newData }, { fields: { 'passage': 0 }, new: true }, function (err, data) {
    if (err) {
      return res.status(401).json(MESSAGES.UPDATE_USER_ERROR);
    }
    return res.status(200).json(data);
  });
});

/**
 * Faz update da senha do usuario
 */
routes.patch('/changePassword', auth.authenticate('jwt', { session: false }), (req, res) => {

  const email = req.user.email;
  let newPass = req.body.password;

  if(newPass.trim().length == 0) {
    return res.status(401).json(MESSAGES.REQUIRED_PASS);
  }
  newPass = bcrypt.hashSync(newPass, 8);

  Client.updateOne({'email': email}, { $set: {'password': newPass} }, function (err, raw) {
    if (err || raw.nModified == 0) {
      return res.status(401).json(MESSAGES.CHANGE_PASS_ERROR);
    }
    return res.status(200).json(MESSAGES.CHANGE_PASS_SUCCESS);
  });
});

/**
 * Realiza/cancela web check-in
 */
routes.get('/checkin/:locator/:makeCheck', (req, res) => {

  const locator = req.params.locator;
  const checkin = req.params.makeCheck;

  //verificando os dados enviados
  if(checkin != 'true' && checkin != 'false') {
    return res.status(401).json(MESSAGES.ERROR_CHECKIN);
  }

  const makeCheck =  checkin === 'true';

  Client.findOneAndUpdate({ 'passage': { $elemMatch: { 'locator': locator, 'checkin': !makeCheck, 'status': 'confirmado' }}}, { $set: { 'passage.$.checkin': makeCheck }}, {'fields': { 'passage.$': 1 }}).
    populate('passage.flight', { 'availableSeat': 0, 'seat': 0, 'priceAdult': 0, 'priceChild': 0 }).exec(function (err, data) {

      if (err) {
        return res.status(500).json(MESSAGES.ERROR_CHECKIN);
      }
      if (!data) {
        return res.status(401).json(MESSAGES.ERROR_CHECKIN_LOCATOR);
      }

      if(makeCheck) {
        mailgun.send(data.passage, 'checkin').then(() => {
          return res.status(200).json(MESSAGES.CHECKIN_SUCCESS);
        }).catch(() => {
          return res.status(500).json(MESSAGES.CHECKIN_ERROR_EMAIL);
        });
      }
      else {
        return res.status(200).json(MESSAGES.CANCEL_CHECKEIN);
      }
    });
});

/**
 * Devolve todos os voos que o usuario ja realizou
 */
routes.get('/historic', auth.authenticate('jwt', { session: false }), (req, res) => {
  const user = req.user;
  Client.findOne({ 'email': user.email }, { 'passage': 1 }).
    populate('passage.flight', { 'availableSeat': 0, 'seat': 0, 'priceAdult': 0, 'priceChild': 0 }).exec(function (err, data) {

      if (err) {
        return res.status(500).json(MESSAGES.UNEXPECTED_ERROR);
      }
      return res.status(200).json(data);
    });
});

/**
 * Envia email para recuperação de senha
 */
routes.get('/passwordRecovery/:id', (req, res) => {

  const id = req.params.id;
  const data = {
    url: req.headers.origin + '/password-recovery.php'
  };

  Client.findOne({ $or:[ {'email': id}, {'cpf': id} ] }, { 'email': 1, 'name': 1 }, function (err, user) {

    if (err) {
      return res.status(500).json(MESSAGES.UNEXPECTED_ERROR);
    }

    if (!user) {
      return res.status(401).json(MESSAGES.NOT_REGISTERED_USER);
    }
    data.name = user.name;
    data.email = user.email;

    mailgun.send(data, 'forgotPass').then((result) => {
      return res.status(200).json(result);
    }).catch((err) => {
      return res.status(500).json(err);
    });
  });
});
/**
 * Retorna o status do voo
 */
routes.get('/flight/:locator', (req, res) => {

  const locator = req.params.locator;

  Client.findOne({ 'passage': { $elemMatch: { 'locator': locator }}}, {'_id': 0, 'passage.$': 1}).
    populate('passage.flight', { 'availableSeat': 0, 'seat': 0, 'priceAdult': 0, 'priceChild': 0 }).exec(function (err, data) {

      if(!data) {
        return res.status(401).json(MESSAGES.ERROR_STATUS_FLIGHT);
      }
      return res.status(200).json(data.passage[0].flight);
    });
});

module.exports = routes;