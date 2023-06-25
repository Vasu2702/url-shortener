const algoliasearch = require('algoliasearch');

const algoliaClient = algoliasearch('JYQ304GH5V', 'cd190f4199deaad21ef7961635f990ca');
const algoliaIndex = algoliaClient.initIndex('url short');

const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const app = express();
const port = 3000;

const serviceAccount = require('./urlshorten-ff22b-firebase-adminsdk-vkn60-6c22d192f0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const urlsCollection = db.collection('urlsdb');

app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/:short', (req, res) => {
  const short = req.params.short;
  const docRef = urlsCollection.doc(short);

  docRef.get()
    .then((doc) => {
      if (doc.exists) {
        const data = doc.data();
        res.redirect(301, data.url);
      } else {
        res.redirect(301, 'https://expressjs.com/en/starter/hello-world.html');
      }
    })
    .catch((error) => {
      console.log(error);
      res.redirect(301, 'https://expressjs.com/en/starter/hello-world.html');
    });
});

app.post('/admin/urls', (req, res) => {
  const { short, url } = req.body;
  const docRef = urlsCollection.doc(short);

  docRef.set({ url })
    .then(() => {
      // Index data in Algolia
      const record = {
        objectID: short,
        url: url
      };

      algoliaIndex.saveObject(record, (err, content) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log('Record indexed in Algolia');
      });

      res.send({ short });
    })
    .catch((error) => {
      console.log(error);
      res.send({ error: 'Failed to generate short URL.' });
    });
});

app.get('/admin/urls/:short', (req, res) => {
  const short = req.params.short;
  const query = urlsCollection.where('short', '==', short);

  query.get()
    .then((snapshot) => {
      const results = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        results.push(data);
      });
      res.send(results);
    })
    .catch((error) => {
      console.log(error);
      res.send({ error: 'An error occurred. Please try again.' });
    });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
