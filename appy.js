var express = require('express');
var _ = require('underscore');
var passport = require('passport');
var fs = require('fs');
var async = require('async');
var mongo = require('mongodb');
var connectMongoDb = require('connect-mongodb');
var flash = require('connect-flash');

var options;
var db;
var app;
var insecure = { login: true, logout: true };

var authStrategies = {
  twitter: function(options)
  {
    var TwitterStrategy = require('passport-twitter').Strategy;
    passport.use(new TwitterStrategy(
      options,
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
  },
  local: function(options)
  {
    var LocalStrategy = require('passport-local').Strategy;
    passport.use(new LocalStrategy(
      function(username, password, done) {
        var user = _.find(options.users, function(user) {
          return ((user.username === username) && (user.password === password));
        });
        if (!user) {
          return done(null, false, { message: 'Invalid username or password' });
        }
        return done(null, user);
      }
    ));
    app.get('/login', function(req, res) {
      var message = req.flash('error');
      if (!options.template) {
        options.template =
          '<% if (message) { %>' +
          '<h3><%= message %></h3>' +
          '<% } %>' +
          '<form action="/login" method="post">' +
            '<div>' +
            '<label>Username:</label>' +
            '<input type="text" name="username" /><br/>' +
            '</div>' +
            '<div>' +
            '<label>Password:</label>' +
            '<input type="password" name="password"/>' +
            '</div>' +
            '<div>' +
            '<input type="submit" value="Submit"/>' +
            '</div>' +
          '</form>';
      }
      if (typeof(options.template) !== 'function') {
        options.template = _.template(options.template);
      }
      res.send(options.template({ message: message }));
    });
    app.post('/login',
      passport.authenticate('local',
        { failureRedirect: '/login', failureFlash: true }),
      function(req, res) {
        res.redirect('/');
      }
    );
  }
};

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

  // Serialize users directly in the session. So far this
  // works for the passport strategies I've used and
  // avoids database hits

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

  if (options.static)
  {
    app.use(express.static(options.static));
  }

  app.use(express.bodyParser());
  app.use(express.cookieParser());

  // Express sessions let us remember the mood the user wanted while they are off logging in on twitter.com
  // The mongo session store allows our sessions to persist between restarts of the app
  var mongoStore = new connectMongoDb({ db: db });

  app.use(express.session({ secret: options.sessionSecret, store: mongoStore }));
  // We must install passport's middleware before we can set routes that depend on it
  app.use(passport.initialize());
  // Passport sessions remember that the user is logged in
  app.use(passport.session());
  app.use(flash());

  // Before we set up any routes we need to set up our security middleware

  if (!options.unlocked)
  {
    options.unlocked = [];
  }
  _.each(['/login', '/logout', '/twitter-auth'], function(url) {
    if (!_.include(options.unlocked, url))
    {
      options.unlocked.push(url);
    }
  });

  if (options.locked === true) {
    // Secure everything except prefixes on the unlocked list
    // (the middleware checks for those)
    app.use(securityMiddleware);
  } else if (options.locked) {
    // Secure only things matching the given prefixes, minus things
    // matching the insecure list
    if (typeof(options.locked) === 'string')
    {
      options.locked = [options.locked];
    }
    _.each(options.locked, function(prefix) {
      app.use(prefix, securityMiddleware);
    });
  } else {
    // No security by default (but logins work and you can check req.user yourself)
  }

  if (options.auth)
  {
    authStrategies[options.auth.strategy](options.auth.options);
  }

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
  var port = options.port ? options.port : 3000;
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


function securityMiddleware(req, res, next) {
  var i;
  for (i = 0; (i < options.unlocked.length); i++)
  {
    if (prefixMatch(options.unlocked[i], req.url))
    {
      next();
      return;
    }
  }

  if (!req.user) {
    req.session.afterLogin = req.url;
    res.redirect(302, '/login');
    return;
  }
  else
  {
    next();
  }
}

// Match URL prefixes the same way Connect middleware does
function prefixMatch(prefix, url)
{
  var start = url.substr(0, prefix.length);
  if (prefix === start)
  {
    var c = url[prefix.length];
    if (c && ('/' != c) && ('.' != c) && ('?' != c))
    {
      return false;
    }
    return true;
  }
  return false;
}

