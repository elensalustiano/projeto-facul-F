const jwt = require('jsonwebtoken'),
    //module para manipular template de email
    handlebars = require('handlebars'),
    //module para ler o template de email
    fs = require('fs'),
    messages = require('../utils/constant/messages'),
    title = require('../utils/constant/title');

/**
 * Send mail for user with permission for change your password.
 * the url contains jwt for verification the user.
 * @param  {json} config api_key : mailgun Key
 *                         domain : mailgun domain
 *                         secretJwt : jwt secret
 *                         from : company name
 * @param  {string} email   user email
 * @return {promise}        promise
 */
module.exports = (config, template, email) => {
  const mailgun = require('mailgun-js')({
    apiKey: config.api_key,
    domain: config.domain
  });
  return new Promise((resolve, reject) => {
    fs.readFile(template.path, 'utf8', (err, data) => {
      if (err)
        reject(messages.ERROR_SEND_EMAIL);

      const html = handlebars.compile(data);
      template.variable.url += '?key=' + jwt.sign({data:{ mail:mail} }, config.secretJwt, { expiresIn: '1h'});

      const mailInfo = {
        from: title.EMAIL_SENDER,
        to: email,
        subject: title.RECOVERY_PASS,
        html: html(template.variable)
      };
      mailgun.messages().send(mailInfo, (err) => {
        if (err) {
          reject(Messages.ERROR_SEND_EMAIL);
        }
        resolve(Messages.SUCCESS_SEND_EMAIL);
      });
    });
  });
}
