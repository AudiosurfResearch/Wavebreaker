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

module.exports = router;