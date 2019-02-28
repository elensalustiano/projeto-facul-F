//Mailgun
const api_key = 'api_key',
  domain = 'domain',
  Mailgun = require('Mailgun-js')({ apiKey: api_key, domain: domain });

//MODULE
const Handlebars = require('Handlebars'), //module para manipular template de email
  Fs = require('Fs'), //module para ler o template de email
  Auth = require('../utils/Auth');

//CUSTOM
const Messages = require('../utils/constant/messages');
const Title = require('../utils/constant/title');

/**
 * @param {JSON} data dados para serem enviados:
 *                    Para tipo checkin: data contem localizador, passageiros e dados do voo,
 *                    Para tipo order: data contem objeto de pedido
 *                    Para tipo forgotPass: data contem nome, email e url
 * @param {String} type tipo de assunto do email
 */
send = (data, type) => {
  let template = {
    path: '',
    variable: '',
    subject: ''
  };

  switch (type) {
    case 'checkin':
      template.path = './utils/template/departureCard.html';
      template.subject = Title.CHECK_IN;
      template.variable = {
        locator: data[0].locator,
        passenger: data[0].passenger,
        flight: data[0].flight
      };
      break;
    case 'order':
      template.path = './utils/template/voucher.html';
      template.subject = Title.VOUCHER;
      template.variable = {
        order: data,
        pay: data[0].pay
      };
    break;
    case 'forgotPass':
      template.path = './utils/template/passwordRec.html';
      template.subject = Title.RECOVERY_PASS;
      template.variable = {
        name: data.name,
        url: data.url += '?key=' + Auth.encode(data.email,'1h')
      };
  }

  return new Promise((resolve, reject) => {
    Fs.readFile(template.path, 'utf8', (err, file) => {
      if (err) {
        reject(Messages.ERROR_SEND_EMAIL);
      }

      const html = Handlebars.compile(file);

      const emailInfo = {
        from: Title.EMAIL_SENDER,
        to: 'projetointegrado509@gmail.com',
        subject: template.subject,
        html: html(template.variable)
      };

      Mailgun.Messages().send(emailInfo, (err) => {
        if (err) {
          reject(Messages.ERROR_SEND_EMAIL);
        }
        resolve(Messages.SUCCESS_SEND_EMAIL);
      });
    });
  });
}

module.exports = {
  send
}