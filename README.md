# Appy

Bootstraps a typical Express 3.0 app with even less fuss than usual. Makes a bunch of bold assumptions that are spot on for me and allow me to get moving swiftly. If they work for you too... awesome! If not, no worries - Appy isn't doing anything you can't do yourself in an hour or two.

Right now appy creates an app that:

* Uses Twitter for authentication (you must register a Twitter app), or local authentication against a set of users you configure, or a custom auth strategy function
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

## Using Appy

You must pass a callback function called `ready` to the appy.boostrap method. This callback receives the Express app and the db for convenience, however you can also access them as properties of the appy object.

Your `ready` callback must then invoke `appy.listen`.

Here's a simple example (see also `sample.js`):

    var appy = require(__dirname + '/appy.js');

    appy.bootstrap({
      // Useful for testing appy. For now just supports
      // a predeclared set of users. Later this ought to offer
      // the password hash npm module + mongodb
      auth: {
        strategy: 'local',
        options: {
          users: {
            admin: {
              username: 'admin',
              password: 'demo'
            }
          }
        }
      },
      // More useful in practice
      // auth: {
      //   strategy: 'twitter',
      //   options: {
      //     consumerKey: 'xxxx',
      //     consumerSecret: 'xxxx',
      //     callbackURL: 'http://my.example.com:3000/twitter-auth'
      //   }
      // },

      // Serve static files, with LESS stylesheet compilation of .less files to .css
      // as needed via less-middleware
      static: __dirname + '/public',

      // Lock the /new prefix to require login. You can lock
      // an array of prefixes if you wish.
      // Prefixes must be followed by / or . or
      // be matched exactly. To lock everything except the
      // login mechanism itself, use locked: true
      locked: '/new',

      // If you're using locked: true you can make exceptions here
      // unlocked: [ '/welcome' ]
      
      sessionSecret: 'whatever',
      
      host: 'my.example.com:3000',
      
      db: {
        // If the uri option is present, it wins. This is
        // MongoLab - compatible. 
        // You can specify username:password@ the host,
        // and you can add :port after the host. You can
        // also specify user and password as separate options
        //
        // uri: 'mongodb:user:password@someserver.com/somedatabase'
        // host: 'localhost'
        // port: 27017,
        name: 'example',
        // These collections are automatically created and
        // become properties of the appy object
        collections: [ 'posts' ]
      },
      
      ready: function(app, db) {
        app.get('/', function(req, res) {
          appy.posts.find().sort({created: -1}).toArray(function(err, posts) {
            res.send(appy.posts.map(function(post) { return post.message; }).join());
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

