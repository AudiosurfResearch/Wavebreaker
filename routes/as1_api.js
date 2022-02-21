var express = require('express');
var bodyParser = require('body-parser');
var xml2js = require('xml2js');
var router = express.Router();
const builder = new xml2js.Builder();
const database = require('../database');
const { Op, Model, DataTypes } = require('sequelize');
let dotenv = require('dotenv').config();

router.post('/game_AttemptLogin_unicodepub64.php', function (req, res, next) {
    const statusString = require('crypto').createHash('md5').update("ntlr78ouqkutfc" + req.body.loginorig + "47ourol9oux").digest("hex");
    (async function () {
        console.log("Attempting login for user " + req.body.email);

        var user = await database.User.unscoped().findOne({
            where: {
                [Op.and]: [
                    { username: req.body.email },
                    { gamepassword: req.body.pass }
                ]
            }
        });

        var userInfoResponse;
        if (user != null) {
            userInfoResponse = {
                RESULT: {
                    $: {
                        status: statusString
                    },
                    userid: user.id,
                    username: user.username,
                    locationid: user.locationid, // locationid is the n-th element in the location list you see when registering
                    steamid: user.steamid32 //SteamID32, not ID64
                }
            };
        }
        else {
            userInfoResponse = {
                RESULT: {
                    $: {
                        status: "failed"
                    }
                }
            };
        }

        res.send(builder.buildObject(userInfoResponse));
    })();
});

router.post('/game_fetchsongid_unicodePB.php', function (req, res, next) {
    console.log("Looking up PB of user ID " + req.body.uid + " on " + req.body.artist + " - " + req.body.song);

    (async function () {
        var song = database.getOrCreateSong(req.body.artist, req.body.song);     

        var pb = await database.Score.findOne({
            where: {
                [Op.and]: [
                    { songid: song.id },
                    { userid: req.body.uid },
                    { leagueid: req.body.league }
                ]
            }
        });

        var personalBestResponse = {
            RESULT: {
                $: {
                    status: "allgood"
                },
                songid: song.id,
                pb: 0
            }
        };
        if (pb != null) {
            personalBestResponse.RESULT.pb = pb.score;
        }

        res.send(builder.buildObject(personalBestResponse));
    })();
});

router.post('/game_customnews_unicode2.php', function (req, res, next) {
    const customNewsResponse = {
        RESULTS: {
            TEXT: "Powered by AudioExpress\nEnjoy the ride!"
        }
    };

    console.log("Retrieving custom news for user ID " + req.body.uid);
    res.send(builder.buildObject(customNewsResponse));
});

router.post('/game_nowplaying_unicode_testing.php', function (req, res, next) {
    res.send("done");
});

router.post('/game_sendride25.php', function (req, res, next) {
    console.log("Received ride on song " + req.body.artist + " - " + req.body.song + " with score of " + req.body.score);

    (async function () {
        var user = await database.User.unscoped().findOne({
            where: {
                [Op.and]: [
                    { username: req.body.email },
                    { gamepassword: req.body.pass }
                ]
            }
        });

        var song = database.getOrCreateSong(req.body.artist, req.body.song);

        var sendRideResponse;
        if (user != null && song != null) {
            sendRideResponse = {
                RESULT: {
                    $: {
                        status: 'allgood'
                    },
                    songid: song.id
                }
            };

            var prevScore = await database.Score.findOne({
                where: {
                    [Op.and]: [
                        { userid: user.id },
                        { songid: song.id },
                        { leagueid: req.body.league }
                    ]
                }
            });

            if (prevScore != null) {
                prevScore.destroy();
            }

            await database.Score.create({
                songid: song.id,
                userid: user.id,
                leagueid: req.body.league,
                trackshape: req.body.trackshape,
                density: req.body.density,
                xstats: req.body.xstats,
                iss: req.body.iss,
                isj: req.body.isj,
                songlength: req.body.songlength,
                ridetime: Math.floor(new Date().getTime() / 1000),
                goldthreshold: req.body.goldthreshold,
                feats: req.body.feats,
                vehicleid: req.body.vehicle,
                score: req.body.score
            });
        }
        else {
            sendRideResponse = {
                RESULT: {
                    $: {
                        status: "failed"
                    }
                }
            };
        }

        res.send(builder.buildObject(sendRideResponse));
    })();
});

router.post('/game_fetchscores6_unicode.php', function (req, res, next) {
    (async function () {
        var casualScores = await database.Score.findAll({
            where: {
                [Op.and]: [
                    { songid: req.body.songid },
                    { leagueid: 0 }
                ]
            },
            order: [['score', 'DESC']],
            limit: 11
        });
        var proScores = await database.Score.findAll({
            where: {
                [Op.and]: [
                    { songid: req.body.songid },
                    { leagueid: 1 }
                ]
            },
            order: [['score', 'DESC']],
            limit: 11
        });
        var eliteScores = await database.Score.findAll({
            where: {
                [Op.and]: [
                    { songid: req.body.songid },
                    { leagueid: 2 }
                ]
            },
            order: [['score', 'DESC']],
            limit: 11
        });

        var fullScoreArray = [];
        for (const score of casualScores) {
            var user = await database.User.findByPk(score.userid);

            fullScoreArray.push({
                $: {
                    scoretype: 0
                },
                league: {
                    $: {
                        leagueid: 0
                    },
                    ride: {
                        username: user.username,
                        vehicleid: score.vehicleid,
                        score: score.score,
                        ridetime: score.ridetime,
                        feats: score.feats,
                        songlength: score.songlength,
                        trafficcount: 1 //TODO: Figure out how to calculate traffic count
                    }
                }
            });
        }

        for (const score of proScores) {
            var user = await database.User.findByPk(score.userid);

            fullScoreArray.push({
                $: {
                    scoretype: 0
                },
                league: {
                    $: {
                        leagueid: 1
                    },
                    ride: {
                        username: user.username,
                        vehicleid: score.vehicleid,
                        score: score.score,
                        ridetime: score.ridetime,
                        feats: score.feats,
                        songlength: score.songlength,
                        trafficcount: 1 //TODO: Figure out how to calculate traffic count
                    }
                }
            });
        }

        for (const score of eliteScores) {
            var user = await database.User.findByPk(score.userid);

            fullScoreArray.push({
                $: {
                    scoretype: 0
                },
                league: {
                    $: {
                        leagueid: 2
                    },
                    ride: {
                        username: user.username,
                        vehicleid: score.vehicleid,
                        score: score.score,
                        ridetime: score.ridetime,
                        feats: score.feats,
                        songlength: score.songlength,
                        trafficcount: score.rideid
                    }
                }
            });
        }

        const fetchScoresResponse = {
            RESULTS: {
                scores: fullScoreArray
            }
        };

        res.send(builder.buildObject(fetchScoresResponse));
    })();
});

router.post('/game_fetchtrackshape2.php', function (req, res, next) {
    (async function () {
        const score = await database.Score.findByPk(req.body.ridd);
        res.send(score.trackshape);
    })();
});

module.exports = router;