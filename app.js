var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var as1apiRouter = require('./routes/as1_api');
var authRouter = require('./routes/api/auth');
var usersRouter = require('./routes/api/users');
var frontendRouter = require('./routes/frontend/main')
const { json } = require('body-parser');
var bodyParser = require('body-parser');
let dotenv = require('dotenv').config();

const expressSvelte = require('express-svelte');
const sveltePreprocess = require('svelte-preprocess');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer')
const purgecss = require('@fullhuman/postcss-purgecss')

const util = require('util')

var passport = require('passport');
var SteamStrategy = require('passport-steam').Strategy;
var session = require('express-session');
const database = require('./database');

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
    console.log(profile);
    database.findUserSteam(profile.id, true, false).then(wavebreakerProfile => {
      wavebreakerProfile.identifier = identifier;
      wavebreakerProfile.avatarFull = profile._json.avatarfull;
      wavebreakerProfile.steamName = profile.displayName;
      return done(null, wavebreakerProfile);
    })
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
  // Support legacy browsers only on production
  legacy: process.env.NODE_ENV !== 'development',
  hydratable: true,
  viewsDirname: __dirname + '/views',
  bundlesDirname: __dirname + '/public/dist',
  bundlesHost: '/public/dist',
  bundlesPattern: '[name][extname]',
  preprocess: [sveltePreprocess({
    postcss: {
      plugins: [
        autoprefixer,
        //purgecss({
        //  content: ['./**/*.html']
        //})
        require('cssnano')({
          preset: 'default',
        }),
      ]
    }
  })],
  templateFilename: "wavebreaker_template.html"
}));
app.use('/public', express.static(__dirname + '/public'));

//These are the endpoints the game will access
app.use('/as', as1apiRouter);
//The game tries accessing an endpoint under //as instead of /as in one single instance
//That is the only reason this is here. I don't know what happened there.
app.use('//as', as1apiRouter);

//Site API
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

app.get("/account-init", (req, res) => {
  if (req.isAuthenticated() && !req.user.username) {
    res.svelte('account-init', {
      globalStores: {
        user: req.user,
      }
    });
  }
  else {
    res.redirect("/");
  }
});

//Redirect people with uninitialized accounts to account initialization
app.get('/*', function (req, res, next) {
  console.log(req.baseUrl + " is baseUrl");
  if (req.isAuthenticated() && !req.user.username) {
    console.log("Redirecting to account init");
    res.redirect('/account-init');
  } else {
    next();
  }
});

//Frontend
app.use('/', frontendRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

module.exports = app;