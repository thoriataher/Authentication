require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const PassportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");




const app = express();


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({ 
    email: String,
    password: String,
    googleId: String,
    facebookId: String
});

userSchema.plugin(PassportLocalMongoose); //Hash&Salt password and save user into the dbs
userSchema.plugin(findOrCreate);


const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());



passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret:  process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get('/', function(req, res){
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));


  app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

  app.get("/auth/facebook",
  passport.authenticate("facebook"));

app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login"}),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get('/login', function(req, res){
    res.render("login");
});

app.get('/register', function(req, res){
    res.render("register");
});

app.get('/secrets', function(req, res){
    //if the user is authenticated
    if(req.isAuthenticated()){
    res.render("secrets");
    }else{
        res.redirect("/login")
    }
});

app.get("/logout", function(req, res){
    req.logOut(function(err){
        if(err){
            console.log (err);
        }else{
    res.redirect("/login");
        }
    });
});

app.post("/register", async function(req, res){

    try{
        await User.register({username: req.body.username}, req.body.password, async function(err, user){
            if(err){
                console.log(err);
                res.redirect("/register");
            }else{
                passport.authenticate("local")(req, res, async function(){
                    res.redirect("/secrets");
                });
            }
        });
    }catch(err){
        res.send(err);
    }
});

app.post("/login", async function(req, res){
    try{
        const user = new User({
            username: req.body.username,
            password:req.body.password
        });
        req.logIn(user, async function(err){
            if(err){
                console.log(err);
            }else{
                passport.authenticate("local")(req, res, async function(){
                    res.redirect("/secrets")
                });
            }
        });
    }catch(err){
        res.send(err);
    }
});


app.listen(3000, function(){
    console.log("Server started on port 3000");
})