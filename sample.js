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
  },
  ready: function(app, db) {
    app.get('/', function(req, res) {
      appy.posts.find().sort({created: -1}).toArray(function(err, posts) {
        res.send(posts.map(function(post) { return post.message; }).join());
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

