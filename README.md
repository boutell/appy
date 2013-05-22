# Appy

Bootstraps a typical Express 3.0 app with even less fuss than usual. Makes a bunch of bold assumptions that are spot on for me and allow me to get moving swiftly. If they work for you too... awesome! If not, no worries - Appy isn't doing anything you can't do yourself in an hour or two.

Right now appy creates an app that:

* Supports local users in a MongoDB collection and/or a hardcoded list
* Alternatively, supports Twitter authentication
* Also supports custom auth strategy functions
* Has /login and /logout URLs for the above
* Provides a post-authentication callback
* Provides a MongoDB database for storage and for sessions (safe: true is on)
* Provides ready-to-rock MongoDB collections
* Eases configuration of MongoDB indexes
* Redirects traffic to a canonical hostname
* Offers a simple way to lock any part of the app to require login
* Has the Express bodyParser, session and cookie middleware in place
* Uses the jade template engine by default, but you can configure others
* Listens on port 3000 unless it sees a PORT environment variable
 or a data/port file (ready for use with Heroku or Stagecoach)
* Adds support for robust partials to whatever template language you choose
* Serves static files from a specified folder (use the `static` option)
* Performs automatic LESS stylesheet compilation with `less-middleware` if a `.css` file is requested and the corresponding `.less` file exists in the static folder
* Provies a way to add more custom middleware if you wish, before any routes are added.

## Using Appy

You must pass a callback function called `ready` to the appy.boostrap method. This callback receives the Express app and the db for convenience, however you can also access them as properties of the appy object.

Your `ready` callback must then invoke `appy.listen`.

Here's a simple example (see also `sample.js`):

var appy = require(__dirname + '/appy.js');

appy.bootstrap({
  auth: {
    strategy: 'local',
    options: {
      // Hardcoded users are handy for testing and for simple sites
      users: {
        admin: {
          username: 'admin',
          password: 'demo'
        }
      },
      // This is the default name for the users mongodb collection
      collection: 'users'
    }
  },
  // A neat alternative: twitter auth
  // auth: {
  //   strategy: 'twitter',
  //   options: {
  //     consumerKey: 'xxxx',
  //     consumerSecret: 'xxxx',
  //     callbackURL: 'http://my.example.com:3000/twitter-auth'
  //   }
  // },
  //
  // Or pass a function as your 'strategy', see the passport docs

  static: __dirname + '/sample-public',

  // Lock the /new prefix to require login. You can lock
  // an array of prefixes if you wish.
  // Prefixes must be followed by / or . or
  // be matched exactly. To lock everything except the
  // login mechanism itself, use locked: true
  locked: '/new',
  // If you're using locked: true you can make exceptions here
  // unlocked: [ '/welcome' ]
  sessionSecret: 'whatever',
  // Redirects to this host if accessed by another name
  // (canonicalization). This is pretty hard to undo once
  // the browser gets the redirect, so use it in production only
  // host: 'my.example.com:3000',
  db: {
    // host: 'localhost'
    // port: 27017,
    name: 'example',
    collections: [ 'posts' ]
    // If I need indexes I specify that collection in more detail:
    // [ { name: 'posts', index: { fields: { { title: 1 } }, unique: true } } ]
    // Or more than one index:
    // [ { name: 'posts', indexes: [ { fields: { { title: 1 } } }, ... ] } ]
  },
  ready: function(app, db) {
    app.get('/', function(req, res) {
      appy.posts.find().sort({created: -1}).toArray(function(err, posts) {
        res.send('messages: ' + posts.map(function(post) { return post.message; }).join());
      });
    });
    app.get('/new/:message', function(req, res) {
      var post = { 'message': req.params.message, 'createdAt': new Date() };
      appy.posts.insert(post, function(err) {
        res.send('added');
      });
    });
    appy.listen();
  }
});


Note that the `strategy` option can also be a custom strategy function rather than a string. You can rely on the strategy functions provided in appy.js as examples of how this function should operate.

Because the goal here is to bootstrap simple apps quickly, I broke the rule that every callback should take an `err` argument first. If your database connection and app configuration fail, what are you supposed to do about it? Not a lot, right? So appy just prints the error and exits.

When users log in via Twitter, some developers will want to do more than just serialize the user object into the session. For instance, I often need to capture Twitter tokens so I can tweet on a user's behalf. To achieve this, just add an options.beforeSignin callback function. The first argument is an error if any, the second is the user object. Note that the Twitter strategy makes the Twitter token and tokenSecret available as properties of the user object, which you can save for later.

## Appy, Template Languages and Partials

By default Appy configures the Jade template language for you.

If you wish to use an alternative template language instead of Jade, pass your own viewEngine function, like this one:

    viewEngine: function(app) {
      var nunjucks = require('nunjucks');
      var env = new nunjucks.Environment(new nunjucks.FileSystemLoader(__dirname + '/views'));
      env.express(app);
    }

Regardless of the template language you choose, Appy adds support for partials. Express 3.0 does not include partials by default, and takes the position that providing partials is up to the template language. My feeling is that robust partials with their own, separate namespace are essential to build complex pages without bugs.

To use Appy's partials in Jade, just call the `partial` function. Make sure you use `!=` so that the result is not double-escaped:

    != partial('nameOfTemplate', { color: green, age: 1 });

In Nunjucks you would write:

    {{ partial('nameOfTemplate', { color: green, age: 1 }) }}

## Appy, users, and mongodb

Appy's `local` auth strategy now supports storing users in MongoDB. The rule is very simple: you must have a MongoDB collection with `username` and `password` properties, and the password property must contain a hashed password as generated by the [password-hash](https://npmjs.org/package/password-hash) npm module. Plaintext passwords are quite deliberately NOT supported.

By default, appy will look for a collection called `users`. If this is not what you want, just set the `collection` option when configuring your auth strategy, for instance:

    auth: {
      strategy: 'local',
      options: {
        // Hardcoded users are handy for testing and for simple sites
        users: {
          admin: {
            username: 'admin',
            password: 'demo'
          }
        },
        // This is the default name for the users mongodb collection
        collection: 'mycollectionname'
      }
    }

*Hardcoded users win* in case of any conflict.





