var express = require('express');
var _ = require('underscore');
var passport = require('passport');
var fs = require('fs');
var async = require('async');
var mongo = require('mongodb');

var options;
var db;
var app;

module.exports.bootstrap = function(optionsArg)
{
  options = optionsArg;

  async.series([dbBootstrap, appBootstrap], function(err) {
    if (err) {
      console.log(err);
      process.exit(1);
    }
    options.ready(app, db);
  });
}

function dbBootstrap(callback) {
  if (!options.db.host) {
    options.db.host = 'localhost';
  }
  if (!options.db.port) {
    options.db.port = 27017;
  }
  // Open the database connection
  db = module.exports.db = new mongo.Db(
    options.db.name,
    new mongo.Server(options.db.host, options.db.port, {}),
    {});

  db.open(function(err) {
    if (err)
    {
      callback(err);
      return;
    }
    callback(null);
  });
}

function appBootstrap(callback) {
  app = module.exports.app = express();
  var TwitterStrategy = require('passport-twitter').Strategy;
  passport.use(new TwitterStrategy(
    options.twitter,
    function(token, tokenSecret, profile, done) {
      // We now have a unique id, username and full name
      // (display name) for the user courtesy of Twitter.
      var user = {
        'id': profile.id,
        'username': profile.username,
        'displayName': profile.displayName
      };
      done(null, user);
    }
  ));

  // It's up to us to tell Passport how to store the current user in the session, and how to take
  // session data and get back a user object. We could store just an id in the session and go back
  // and forth to the complete user object via MySQL or MongoDB lookups, but since the user object
  // is small and changes rarely, we'll save a round trip to the database by storing the user
  // information directly in the session in JSON string format.

  passport.serializeUser(function(user, done) {
    done(null, JSON.stringify(user));
  });

  passport.deserializeUser(function(json, done) {
    var user = JSON.parse(json);
    if (user)
    {
      done(null, user);
    }
    else
    {
      done(new Error("Bad JSON string in session"), null);
    }
  });

  app.use(canonicalizeHost);
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  // Express sessions let us remember the mood the user wanted while they are off logging in on twitter.com
  app.use(express.session({ secret: options.sessionSecret }));
  // We must install passport's middleware before we can set routes that depend on it
  app.use(passport.initialize());
  // Passport sessions remember that the user is logged in
  app.use(passport.session());

  // Borrowed from http://passportjs.org/guide/twitter.html

  // Redirect the user to Twitter for authentication.  When complete, Twitter
  // will redirect the user back to the application at
  // /auth/twitter/callback
  app.get('/login', passport.authenticate('twitter'));

  // Twitter will redirect the user to this URL after approval.  Finish the
  // authentication process by attempting to obtain an access token.  If
  // access was granted, the user will be logged in.  Otherwise,
  // authentication has failed.
  app.get('/twitter-auth',
    passport.authenticate('twitter', { successRedirect: '/',
                                       failureRedirect: '/' }));

  app.get('/logout', function(req, res)
  {
    req.logOut();
    res.redirect('/');
  });

  callback(null);

  // Canonicalization is good for SEO and prevents user confusion,
  // Twitter auth problems in dev, etc.
  function canonicalizeHost(req, res, next)
  {
    if (req.headers.host !== options.host)
    {
      res.redirect(301, 'http://' + options.host + req.url);
    }
    else
    {
      next();
    }
  }
}

module.exports.listen = function() {
  var port = 3000;
  try {
    // In production get the port number from stagecoach
    port = fs.readFileSync(__dirname + '/data/port', 'UTF-8').replace(/\s+$/, '');
  } catch (err) {
    // This is handy in a dev environment
    console.log("I see no data/port file, defaulting to port " + port);
  }
  console.log("Listening on port " + port);
  app.listen(port);
}
