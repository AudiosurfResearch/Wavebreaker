var express = require('express');
const database = require('../../database');
const { Op, Model, DataTypes } = require('sequelize');
let dotenv = require('dotenv').config();
var router = express.Router();
var passport = require('passport');

router.get('/auth/steam', passport.authenticate('steam', {
    failureRedirect: '/autherror'
}),
    function (req, res) {
        // The request will be redirected to Steam for authentication, so
        // this function will not be called.
    });

router.get('/auth/steam/return', passport.authenticate('steam', {
    failureRedirect: '/loginfail'
}),
    function (req, res) {
        // Successful authentication, redirect home.
        console.log("Login success!");
        res.redirect('/account-init');
    });

router.get('/auth/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

module.exports = router;