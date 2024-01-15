require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const PassportLocalMongoose = require("passport-local-mongoose");


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
    password: String
});

userSchema.plugin(PassportLocalMongoose); //Hash&Salt password and save user into the dbs


const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', function(req, res){
    res.render("home");
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
    res.redirect("/");
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
    // try{
    // bcrypt.hash(req.body.password, saltRounds, async function(err, hash) {
    //     if(err){
    //         throw err;
    //     }
    //         const newUser = new User({
    //             email: req.body.username,
    //             password: hash
    //         });
    //         await newUser.save();
    //         res.render("secrets");
    //     });
    //     }catch(err){
    //         res.send(err);
    //     }
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
    // try{
    //     const username = req.body.username;
    //     const password = req.body.password; 
    //     const foundUser = await User.findOne({email: username});
    //     if(foundUser){
    //         bcrypt.compare(password, foundUser.password, async function(err, result) {
    //            if(err){
    //             throw err
    //            }else{
    //             res.render("secrets");
    //            }
    //         });
    // }
    // }catch(err){
    //     console.log(err);
    // }
});


app.listen(3000, function(){
    console.log("Server started on port 3000");
})