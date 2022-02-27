var express = require('express');
const database = require('../../database');
var router = express.Router();
var passport = require('passport');

router.post('/getUserByUsername', function (req, res) {
    database.findUserByUsername(req.body.username, true).then(user => {
        if (user) {
            console.log("User " + req.body.username + " found")
            console.log(user);
            res.json(user);
        }
        else {
            console.log("User " + req.body.username + " not found")
            console.log(user);
            res.sendStatus(404);
        }
    })
});

router.post('/initializeAccount', function (req, res) {
    if (req.isAuthenticated()) {
        database.initializeAccount(req.user.id, req.body.username, req.body.password, req.body.locationid).then(result => {
            if (result.success) {
                console.log("Account " + req.body.username + " with ID " + req.user.id + " initialized");
                res.json(result);
            }
            else {
                console.log("Failed initializing " + req.body.username);
                res.json(result);
            }
        })
    }
    else {
        res.sendStatus(401);
    }
});

module.exports = router;