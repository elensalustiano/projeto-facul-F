const jwt = require("jsonwebtoken"),
    passport = require("passport"),
    passportJWT = require("passport-jwt");

let ExtractJwt = passportJWT.ExtractJwt,
  JwtStrategy = passportJWT.Strategy;

let jwtOptions = {}
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
jwtOptions.secretOrKey = "projetointegradof";
jwtOptions.passReqToCallback = true;

//Valida se o usuario tem acesso a pagina
let strategy = new JwtStrategy(jwtOptions, function (req, jwtPayload, next) {
  // usually this would be a database call:
  let db = require("./db/user");
  let Client = db.mongoose.model("clientCollection", db.clientSchema);

  if (jwtPayload.data) {
    Client.findOne({"email": jwtPayload.data}, {"email":1,"name":1,"phone":1,"cpf":1}, function (err, data) {
      if (err) return next(null, false);

      else {
        return next(null, data);
      }
    });
  }
  else {
    return next(null, false);
  }
});

/**
 * Promise que devolve as informações do JWT
 * @param  {[type]} req requisição com o header Bearer
 */
passport.decode = function (req) {
  let token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  return new Promise((resolve, reject) => {
    jwt.verify(token, jwtOptions.secretOrKey, function (err, decoded) {
      if (err)
        reject(err);
      resolve(decoded);
    });
  });
}

/**
 * Gera um token para o usuario
 * @param  {[Object]} payload dados do token
 * @param  {[string]} exp     tempo de duração do token (1d,1h,etc)
 * @return {[type]}         token
 */
passport.encode = function (payload, exp) {
  return jwt.sign({
    data: payload
  }, jwtOptions.secretOrKey, {
    expiresIn: exp
  });
}

passport.use(strategy);
passport.jwtOptions = jwtOptions;
passport.initialize();

module.exports = passport;