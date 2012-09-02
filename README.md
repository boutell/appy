appy
====

Bootstraps a typical Express 3.0 app with even less fuss than usual. Makes a bunch of bold assumptions that are spot on for me and allow me to get moving swiftly. If they work for you too... awesome!

Right now appy creates an app that:

* Uses Twitter for authentication (you must register a Twitter app)
* Has /login and /logout URLs for the above
* Uses MongoDB
* Redirects traffic to a preferred hostname
* Has the Express bodyParser and session middleware in place
* Listens on port 3000 unless it sees a data/port file (ready for use with Stagecoach)

You must pass a callback function called `ready` to the appy.boostrap method. This callback receives the Express app and the db for convenience, however you can also access them as properties of the appy object.

Your `ready` callback must then invoke `appy.listen`.

I'll probably modify this in the near future to offer other authentication options, especially Google.

Here's a minimal example:

    var appy = require(__dirname + '/appy.js');

    appy.bootstrap({
      twitter: {
        consumerKey: 'xxxx',
        consumerSecret: 'xxxx',
        callbackURL: 'http://my.example.com:3000/twitter-auth'
      },
      sessionSecret: 'whatever',
      host: 'my.example.com:3000',
      db: {
        url: 'mongodb://localhost/example',
        name: 'example'
      },
      ready: function(app, db) {
        app.get('/', function(req, res) {
          console.log('Awesome!');
        });
        appy.listen();
      }
    });

Because the goal here is to bootstrap simple apps quickly, I broke the rule that every callback should take an `err` argument first. If your database connection and app configuration fail, what are you supposed to do about it? Not a lot, right? So appy just prints the error and exits.
