/*
* Bot module that interacts with Telegram server using node-telegram-bot-api api
* Can be started locally with 'node index.js' or 'heroku local' or pushed on heroku
* Based on how it's started the bot will be configured in polling or webhook mode:
* - When configured in polling mode, the bot will automatically query the telegram server to
*   check if any message was received.
* - When configured in webhook mode, the bot will send an URL to the telegram server
*   and will start listening on a specific port, now the telegram server will automatically
*   forward any new message to the URL given.
*
* Author: Giuliani Daniele
*/

/* Fetching of enviroment variables */
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '483884774:AAGbt5DFB214pfoisaMXfMqyLOoGaJKsNdc';
const NODE_ENV = process.env.NODE_ENV || 'development';
const HOST_URL = process.env.HOST_URL;

/* Import of different modules */
var TelegramBot = require('node-telegram-bot-api');
var commandParser = require('./command-parser');
var STUB_SERVER = require('./test/api-stub-replier');

/* Error messages */
const BAD_INPUT = 'Non riesco a capirti, prova con la chat!';
const BOT_SLEEPY = 'Yaaawn! Lasciami il tempo di svegliarmi...';
const BOT_ERROR = 'Scusami, oggi non mi sento molto bene...';

/* Contains the status of the bot, after the inizialization gets set to false */
var sleepy = true;
var error = false;

/* BOT CONFIGURATION */

console.log('BOT: Starting bot...');
console.log('BOT: Fetching codenames...');
commandParser.initCodenameList().then(function(val) {
    sleepy = false;
    console.log('BOT: Codename list updated!');
}).catch(function(res) {
    sleepy = false;
    error = true;
    console.log('BOT: Failed to init codename list!');
});

var bot;

//check enviroment variable to decide in what mode start the bot
if(NODE_ENV === 'development') {
    //starts the bot in polling mode (development only)
    bot = new TelegramBot(TELEGRAM_TOKEN, {polling: true});
    //STUB_SERVER.start(8080, false); //start server for local testing
} else {
    //starts the bot in webhook mode (production only)
    var options = {
        webHook: {
            port: process.env.PORT
        }
    };
    bot = new TelegramBot(TELEGRAM_TOKEN, options);
    bot.setWebHook(HOST_URL + bot.token)
}

console.log('BOT: Bot started in ' + NODE_ENV + ' mode');


/* Bot logic */

bot.on('message', function(msg){
    if(msg.text === undefined) {
        bot.sendMessage(msg.chat.id, BAD_INPUT, {parse_mode: 'markdown'});
    } else if(sleepy) {
        //bot still starting
        bot.sendMessage(msg.chat.id, BOT_SLEEPY, {parse_mode: 'markdown'});
    } else if(error) {
        //initilization error
        bot.sendMessage(msg.chat.id, BOT_ERROR, {parse_mode: 'markdown'});
    } else {
        var answer = commandParser.parse(msg).then(function(val) {
            bot.sendMessage(msg.chat.id, val, {parse_mode: 'markdown'});
        }).catch(function(res) {
            bot.sendMessage(msg.chat.id, res, {parse_mode: 'markdown'});
            console.log('BOT: bad request received!');
            console.log('Request:');
            console.log(msg.text);
            console.log('Response:');
            console.log(res);
        });
    }
});