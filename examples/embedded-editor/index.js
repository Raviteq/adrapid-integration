/**
 * Adrapid integration example
 * 
 * 1 - Create or find previously created user
 * 2 - Get user access urls
 * 3 - Generate html page with the editor iframe
 */

const axios = require('axios');
const express = require('express');
const app = express();
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// load environment variables
require('dotenv').config();

const config = {
  token: process.env.API_TOKEN,
  port: process.env.PORT || 3000,
  apiURL: process.env.API_URL || 'https://api.adrapid.se/v1/api'
}

// set up local db
const adapter = new FileSync('db.json')
const db = low(adapter);
const testUser = {
  id: 1,
  username: 'integration test'
}

db.defaults({ users: [testUser] }).write();

// express config
app.set('view engine', 'pug');
app.set('views', './examples/embedded-editor/views');

// axious instance config
const axiosInstance = axios.create({
  baseURL: config.apiURL,
  timeout: 1000,
  headers: { 'Authorization': `Bearer ${config['token']}` }
});

// get user from local db, check if it already has an id from adrapid and find/create it in adrapid
const findOrCreateUser = userId => {
  const user = db.get('users').find({ id: userId }).value();
  if (user['adrapidId']) {
    return axiosInstance.get(`users/${user['adrapidId']}`).then(response => {
      return response.data['id'];
    });
  }
  return axiosInstance.post('users', {
    username: user['username']
  }).then(response => {
    const adrapidId = response['data'];
    // save local db with adrapid user id
    db.get('users').find({ username: user['username'] }).assign({ adrapidId: adrapidId }).write();

    return adrapidId;
  });
}

// get user access url token
const getUserAccess = adrapidUserId => {
  const url = `users/${adrapidUserId}/access`;
  return axiosInstance.get(url).then(response => response.data);
};

app.get('/', (req, res, next) => {
  findOrCreateUser(testUser['id']).then(getUserAccess).then(access => {
    const url = access['embeddedEditorURL'];
    res.render('index', {
      src: url
    });
  }).catch(next);
});

app.listen(config.port, () => console.log(`Adrapid integration app listening on port ${config.port}!`))