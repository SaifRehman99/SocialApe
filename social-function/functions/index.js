const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();

admin.initializeApp();

// =============================================================
const config = {
  apiKey: 'AIzaSyDdjE-nCxMzYCOAG0sOxZZhMVTZv8khRHM',
  authDomain: 'socialapp-185fb.firebaseapp.com',
  databaseURL: 'https://socialapp-185fb.firebaseio.com',
  projectId: 'socialapp-185fb',
  storageBucket: 'socialapp-185fb.appspot.com',
  messagingSenderId: '120949968428',
  appId: '1:120949968428:web:cfe802ed52edfef58d8b89',
  measurementId: 'G-L2ENHX041Q',
};

const firebase = require('firebase');
firebase.initializeApp(config);

const db = admin.firestore();

// ======================================================================

const verifyToken = async (req, res, next) => {
  let token;

  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else {
      return res.status(403).json({ msg: 'Unauthorized' });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    req.user = decoded;

    const data = await db.collection('users').where('userId', '==', req.user.uid).get();

    req.user.handle = data.docs[0].data().handle;
    next();
  } catch (error) {
    res.status(500).json(error);
  }
};

// ======================================================================

app.get('/screams', async (req, res) => {
  try {
    const data = await db.collection('screams').orderBy('createdAt', 'desc').get();

    let screams = [];

    data.forEach((doc) => {
      screams.push({
        screamID: doc.id,
        body: doc.data().body,
        userHandle: doc.data().userHandle,
        createdAt: doc.data().createdAt,
      });
    });
    return res.json(screams);
  } catch (error) {
    console.log(error);
  }
});

// ======================================================================

app.post('/scream', verifyToken, async (req, res) => {
  try {
    let data = {
      body: req.body.body,
      userHandle: req.user.handle,
      // createdAt: admin.firestore.Timestamp.fromDate(new Date()),
      createdAt: new Date().toISOString(),
    };

    const doc = await db.collection('screams').add(data);

    res.json({ msg: `User of id ${doc.id} created` });
  } catch (error) {
    console.log(error);
  }
});

// ======================================================================

app.post('/signup', async (req, res) => {
  try {
    if (!req.body.email || !req.body.password || !req.body.confirmPassword || !req.body.handle) {
      return res.status(400).json({ msg: `Please Enter complete fields` });
    }

    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).json({ msg: `Password Not Match` });
    }

    const newUser = {
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      handle: req.body.handle,
    };

    const doc = await db.doc(`/users/${newUser.handle}`).get();

    if (doc.exists) {
      return res.status(400).json({ msg: `User already created` });
    }

    const data = await firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);

    const token = await data.user.getIdToken();

    const userCreated = {
      email: newUser.email,
      handle: newUser.handle,
      createdAt: new Date().toISOString(),
      userId: data.user.uid,
      imageURL: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/no-img.png?alt=media`,
    };

    await db.doc(`/users/${newUser.handle}`).set(userCreated);

    res.status(201).json({ token });
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      return res.status(403).json({ msg: `User already created` });
    }
    res.status(500).json({ error: error.code });
  }
});

// ======================================================================

app.post('/login', async (req, res) => {
  try {
    const user = {
      email: req.body.email,
      password: req.body.password,
    };

    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ msg: `Please Enter complete fields` });
    }

    const data = await firebase.auth().signInWithEmailAndPassword(user.email, user.password);

    const token = await data.user.getIdToken();
    res.status(201).json({ token });
  } catch (error) {
    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      return res.status(403).json({ msg: `Wrong Credentials` });
    }
    res.status(500).json({ error: error.code });
  }
});

// ======================================================================
app.post('/user/image', verifyToken, (req, res) => {
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  const busboy = new BusBoy({ headers: req.headers });

  let imageName,
    imageUpload = {};

  // ================================================================================================================

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== 'image/png' && mimetype !== 'image/jpeg') {
      return res.status(403).json({ msg: 'Only png and jpg file can be uploaded.' });
    }

    const imageExt = filename.split('.')[filename.split('.').length - 1];
    imageName = `${Math.round(Math.random() * 10000)}.${imageExt}`;

    const filePath = path.join(os.tmpdir(), imageName);

    imageUpload = { filePath, mimetype };

    file.pipe(fs.createWriteStream(filePath));
  });

  // ================================================================================================================

  busboy.on('finish', async () => {
    try {
      await admin
        .storage()
        .bucket()
        .upload(imageUpload.filePath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageUpload.mimetype,
            },
          },
        });

      const imageURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageName}?alt=media`;

      // this will update, if not key then make it
      // Key : Value
      await db.doc(`/users/${req.user.handle}`).update({ imageURL });

      res.status(201).json({ msg: 'Image Uploaded' });
    } catch (error) {
      res.status(500).json({ error: error.code });
    }
  });

  busboy.end(req.rawBody);
});

// ================================================================================================================
app.post('/user', verifyToken, async (req, res) => {
  try {
    const { bio, website, location } = req.body;

    const userDetails = {};

    if (bio) userDetails.bio = bio;
    if (location) userDetails.location = location;
    if (website) userDetails.website = website;

    if (website.substring(0, 4) !== 'http') {
      userDetails.website = `http://${website}`;
    }

    await db.doc(`/users/${req.user.handle}`).update(userDetails);

    res.status(200).json({ msg: 'Data Added' });
  } catch (error) {
    res.status(500).json({ error: error.code });
  }
});

// ================================================================================================================
app.get('/user', verifyToken, async (req, res) => {
  let userData = {};

  try {
    const doc = await db.doc(`/users/${req.user.handle}`).get();

    if (doc.exists) {
      userData.crendentials = doc.data();
      const like = await db.collection('likes').where('userHandle', '==', req.user.handle).get();

      userData.likes = [];

      like.forEach((doc) => {
        userData.likes.push(doc.data());
      });
      res.status(200).json(userData);
    }
  } catch (error) {
    res.status(500).json({ error: error.code });
  }
});

// https:url/api/
exports.api = functions.https.onRequest(app);
