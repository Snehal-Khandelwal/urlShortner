const UrlModel = require('../models/urlModel.js');
const ShortId = require('shortid');
//const ValidUrl = require('valid-url');
const redis = require("redis");
const { promisify } = require("util");

const isValid = function (value) {
    if (typeof value === "undefined" || value === null) return false;
    if (typeof value === "string" && value.trim().length === 0) return false;
    return true;
};





//Connect to redis
const redisClient = redis.createClient(
    13190,
    "redis-13190.c301.ap-south-1-1.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("gkiOIPkytPI3ADi14jHMSWkZEo2J5TDG", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});



//1. connect to the server
//2. use the commands :

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);




const createUrl = async (req, res) => {
    try {
        const { longUrl } = req.body;
        const baseUrl = "http://localhost:3000";
        if (Object.keys(req.body).length != 0) {

            if (!isValid(longUrl))
                return res.status(400).send({ status: false, message: "Please enter longUrl" });
            if (!/(?:https?):\/\/(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/.test(longUrl))
                return res.status(400).send({ status: false, message: "Please enter valid url" });

            const usedUrl = await UrlModel.findOne({ longUrl: longUrl });
            if (usedUrl)
                return res.status(200).send({ message: "This Url is already shorten", data: usedUrl.shortUrl });


            const urlId = ShortId.generate();
            const urlShort = baseUrl + "/" + urlId;
            req.body.shortUrl = urlShort;
            req.body.urlCode = urlId;

            const urlCreated = await UrlModel.create(req.body);
            let urlDetails = {
                longUrl,
                shortUrl: urlCreated.shortUrl,
                urlCode: urlCreated.urlCode
            };
            res.status(201).send({ status: true, data: urlDetails })
        } else {
            return res.status(400).send({ status: false, message: "Requested body cannot remain empty please provide some data" })
        }

    } catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }
}



const getUrl = async (req, res) => {
    try {
        const urlCode = req.params.urlCode;
        if (!ShortId.isValid(urlCode)) return res.status(400).send({ status: false, message: "Please enter valid urlCode" });

        let cahcedUrlData = await GET_ASYNC(`${req.params.urlCode}`)
        if (cahcedUrlData) {
            return res.status(302).redirect(cahcedUrlData);
        } else {
            let requredUrl = await UrlModel.findOne({ urlCode: urlCode });
            if (!requredUrl) return res.status(404).send({ status: false, message: "No such url present" });
            await SET_ASYNC(`${req.params.urlCode}`, (requredUrl.longUrl));
        
            return res.status(302).redirect(requredUrl.longUrl);
        }
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
}


module.exports.createUrl = createUrl;
module.exports.getUrl = getUrl;