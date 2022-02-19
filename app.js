var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var as1apiRouter = require('./routes/as1_api');
var authRouter = require('./routes/api/auth');
var frontendRouter = require('./routes/frontend/main')
const { json } = require('body-parser');
var bodyParser = require('body-parser');
let dotenv = require('dotenv').config();
const expressSvelte = require('express-svelte');
const sveltePreprocess = require('svelte-preprocess');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer')
const util = require('util')

var passport = require('passport');
var SteamStrategy = require('passport-steam').Strategy;
var session = require('express-session');

var app = express();

app.disable('x-powered-by');

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }))

app.use(logger('dev'));

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

passport.use(new SteamStrategy({
  returnURL: 'https://localhost/api/auth/steam/return',
  realm: 'https://localhost/',
  apiKey: process.env.STEAM_API_KEY
},
  function (identifier, profile, done) {
    process.nextTick(function () {
      profile.identifier = identifier;
      return done(null, profile);
    });
  }
));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000 //1 week
  }
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(expressSvelte({
  hydratable: true,
  preprocess: [sveltePreprocess({
    postcss: {
      plugins: [
        autoprefixer
      ]
    }
  })],
  templateFilename: "wavebreaker_template.html"
}));
app.use('/public', express.static(__dirname + '/public'));

//Frontend
app.use('/', frontendRouter);

//These are the endpoints the game will access
app.use('/as', as1apiRouter);
//The game tries accessing an endpoint under //as instead of /as in one single instance
//That is the only reason this is here. I don't know what happened there.
app.use('//as', as1apiRouter);

//Site API
app.use('/api', authRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

module.exports = app;