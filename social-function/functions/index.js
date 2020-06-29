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

// MIDDLEWARE ======================================================================

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
    req.user.imageURL = data.docs[0].data().imageURL;
    next();
  } catch (error) {
    res.status(500).json(error);
  }
};

// GET SCREAM ======================================================================

app.get('/screams', async (req, res) => {
  try {
    const data = await db.collection('screams').orderBy('createdAt', 'desc').get();

    let screams = [];

    data.forEach((doc) => {
      screams.push({
        screamID: doc.id,
        body: doc.data().body,
        userHandle: doc.data().userHandle,
        imageURL: doc.data().imageURL,
        createdAt: doc.data().createdAt,
      });
    });
    return res.json(screams);
  } catch (error) {
    console.log(error);
  }
});

// ADD SCREAM ============================================================================

app.post('/scream', verifyToken, async (req, res) => {
  try {
    let data = {
      body: req.body.body,
      userHandle: req.user.handle,
      imageURL: req.user.imageURL,
      // createdAt: admin.firestore.Timestamp.fromDate(new Date()),
      createdAt: new Date().toISOString(),
      likeCount: 0,
      commentCount: 0,
    };

    const doc = await db.collection('screams').add(data);

    const screams = data;
    screams.screamId = doc.id;

    res.json(screams);
  } catch (error) {
    console.log(error);
  }
});

// CREATE USER======================================================================

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
    res.status(500).json({ msg: 'Something went wrong' });
  }
});

// LOGIN USER======================================================================

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
    return res.status(500).json({ msg: 'Wrong crendentials' });
  }
});

// UPLOAD IMAGE ======================================================================
app.post('/user/image', verifyToken, (req, res) => {
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  const busboy = new BusBoy({ headers: req.headers });

  let imageName,
    imageUpload = {};

  // ===================================================================

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

  // ===================================================================

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

// UPDATE USER  ===================================================================
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

// GET USER ===================================================================
app.get('/user', verifyToken, async (req, res) => {
  let userData = {};

  try {
    const doc = await db.doc(`/users/${req.user.handle}`).get();

    if (doc.exists) {
      userData.crendentials = doc.data();
      const like = await db.collection('likes').where('userHandle', '==', req.user.handle).get();
      const comment = await db.collection('comments').where('userHandle', '==', req.user.handle).get();
      const notification = await db.collection('notifications').where('recipient', '==', req.user.handle).orderBy('createdAt', 'desc').get();

      userData.likes = [];
      userData.comments = [];
      userData.notifications = [];

      like.forEach((doc) => {
        userData.likes.push(doc.data());
      });

      comment.forEach((doc) => {
        userData.comments.push(doc.data());
      });

      notification.forEach((doc) => {
        userData.notifications.push(doc.data());
        userData.notifications.notificationId = doc.id;
      });

      res.status(200).json(userData);
    }
  } catch (error) {
    res.status(500).json({ error: error.code });
  }
});

// Get Single User ===================================================================
app.get('/user/:handle', async (req, res) => {
  let userData = {};

  const doc = await db.doc(`/users/${req.params.handle}`).get();

  if (doc.exists) {
    userData.user = doc.data();

    let screams = await db.collection('screams').where('userHandle', '==', req.params.handle).orderBy('createdAt', 'desc').get();

    userData.screams = [];

    screams.forEach((doc) => {
      userData.screams.push(doc.data());
      userData.screams.screamId = doc.id;
    });

    res.status(200).json(userData);
  } else {
    return res.status(400).json({ error: 'No user' });
  }

  try {
  } catch (error) {
    res.status(500).json({ error: error.code });
  }
});

// Mark Notification ===================================================================
app.post('/notifications', verifyToken, async (req, res) => {
  try {
    let batch = db.batch();
    req.body.forEach((id) => {
      const notification = db.doc(`/notifications/${id}`);
      batch.update(notification, { read: true });
    });

    await batch.commit();

    res.status(200).json({ msg: 'Notification Read' });
  } catch (error) {
    res.status(500).json({ error: error.code });
  }
});

// GET COMMENT ===================================================================
app.get('/scream/:screamId', async (req, res) => {
  let screamData = {};

  try {
    const doc = await db.doc(`/screams/${req.params.screamId}`).get();

    if (!doc.exists) {
      return res.status(404).json({ msg: 'No scream of this id' });
    }

    screamData = doc.data();
    screamData.screamId = req.params.screamId;

    const data = await db.collection('comments').orderBy('createdAt', 'desc').where('screamId', '==', req.params.screamId).get();

    screamData.comments = [];

    data.forEach((comment) => {
      screamData.comments.push(comment.data());
    });

    res.status(200).json(screamData);
  } catch (error) {
    res.status(500).json({ error: error.code });
  }
});

// ADD COMMENT ===================================================================
app.post('/scream/:screamId/comment', verifyToken, async (req, res) => {
  try {
    if (!req.body.body) return res.status(400).json({ msg: 'Please Enter a Comment' });

    const newComment = {
      body: req.body.body,
      createdAt: new Date().toISOString(),
      screamId: req.params.screamId,
      userHandle: req.user.handle,
      imageURL: req.user.imageURL,
    };

    const doc = await db.doc(`/screams/${req.params.screamId}`).get();

    if (!doc.exists) {
      return res.status(404).json({ msg: 'No scream of this id' });
    }

    await doc.ref.update({ commentCount: doc.data().commentCount + 1 });

    await db.collection('comments').add(newComment);

    res.status(200).json(newComment);
  } catch (error) {
    res.status(500).json({ error: error.code });
  }
});

// LIKE SCREAM ===================================================================
app.get('/scream/:screamId/like', verifyToken, async (req, res) => {
  try {
    let likeDocument = db.collection('likes');

    likeDocument = likeDocument.where('userHandle', '==', req.user.handle);

    likeDocument = likeDocument.where('screamId', '==', req.params.screamId);

    likeDocument = likeDocument.limit(1);

    likeDocument = await likeDocument.get();

    const screamDocument = await db.doc(`/screams/${req.params.screamId}`).get();

    let screamData;

    if (screamDocument.exists) {
      screamData = screamDocument.data();
      screamData.scream = screamDocument.id;

      if (likeDocument.empty) {
        await db.collection('likes').add({ screamId: req.params.screamId, userHandle: req.user.handle });

        screamData.likeCount++;

        await db.doc(`/screams/${req.params.screamId}`).update({ likeCount: screamData.likeCount });
        return res.status(200).json(screamData);
      } else {
        return res.status(403).json({ data: 'Already Liked' });
      }
    } else {
      return res.status(403).json({ msg: 'NO scream' });
    }
  } catch (error) {
    return res.status(500).json({ error: error });
  }
});
// UNLIKE SCREAM ===================================================================
app.get('/scream/:screamId/unlike', verifyToken, async (req, res) => {
  try {
    let likeDocument = db.collection('likes');

    likeDocument = likeDocument.where('userHandle', '==', req.user.handle);

    likeDocument = likeDocument.where('screamId', '==', req.params.screamId);

    likeDocument = likeDocument.limit(1);

    likeDocument = await likeDocument.get();

    const screamDocument = await db.doc(`/screams/${req.params.screamId}`).get();

    let screamData;

    if (screamDocument.exists) {
      screamData = screamDocument.data();
      screamData.scream = screamDocument.id;

      if (likeDocument.empty) {
        return res.status(400).json({ error: 'Scream already Unliked' });
      } else {
        await db.doc(`/likes/${likeDocument.docs[0].id}`).delete();

        screamData.likeCount--;

        await db.doc(`/screams/${req.params.screamId}`).update({ likeCount: screamData.likeCount });
        return res.status(200).json(screamData);
      }
    } else {
      return res.status(403).json({ msg: 'NO scream' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.code });
  }
});

// DELETE SCREAM ===================================================================
app.delete('/scream/:screamId', verifyToken, async (req, res) => {
  try {
    const doc = await db.doc(`/screams/${req.params.screamId}`).get();

    if (!doc.exists) {
      return res.status(400).json({ msg: 'Already Delete' });
    }

    if (doc.data().userHandle !== req.user.handle) {
      return res.status(404).json({ msg: 'Unauthorized' });
    }

    await db.doc(`/screams/${req.params.screamId}`).delete();

    return res.status(200).json({ msg: 'Scream Delete' });
  } catch (error) {
    return res.status(500).json({ error: error.code });
  }
});

// NOTIFICATIONS ON LIKE ===================================================================
exports.createNotificationLIKE = functions.firestore.document('likes/{id}').onCreate((snapshot) => {
  db.doc(`/screams/${snapshot.data().screamId}`)
    .get()
    .then((data) => {
      //apni post like me no notification
      if (data.exists && data.data().userHandle !== snapshot.data().userHandle) {
        return db.doc(`/notifications/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: data.data().userHandle,
          sender: snapshot.data().userHandle,
          type: 'like',
          read: false,
          screamId: data.id,
        });
      }
    })
    .then(() => {
      return;
    })
    .catch((err) => console.log(err));
});

// NOTIFICATIONS ON COMMENT ===================================================================
exports.createNotificationCOMMENT = functions.firestore.document('comments/{id}').onCreate((snapshot) => {
  db.doc(`/screams/${snapshot.data().screamId}`)
    .get()
    .then((data) => {
      if (data.exists && data.data().userHandle !== snapshot.data().userHandle) {
        return db.doc(`/notifications/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: data.data().userHandle,
          sender: snapshot.data().userHandle,
          type: 'comment',
          read: false,
          screamId: data.id,
        });
      }
    })
    .then(() => {
      return;
    })
    .catch((err) => console.log(err));
});

// DELETE NOTIFICATIONS ON UNLIKE ===================================================================
exports.deleteNotificationUNLIKE = functions.firestore.document('likes/{id}').onDelete((snapshot) => {
  db.doc(`/notifications/${snapshot.id}`)
    .delete()
    .then(() => {
      return;
    })
    .catch((err) => console.log(err));
});

// If user change image tou hr jagah change hujaye ===================================================================
exports.onUserImageChange = functions.firestore.document('/users/{id}').onUpdate((change) => {
  // change has two properties

  if (change.before.data().imageURL !== change.after.data().imageURL) {
    const batch = db.batch();

    return db
      .collection('screams')
      .where('userHandle', '==', change.before.data().handle)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          const scream = db.doc(`/screams/${doc.id}`);
          batch.update(scream, { imageURL: change.after.data().imageURL });
        });
        return batch.commit();
      });
  } else {
    return true;
  }
});

// If user delete scream tou like, comment aur notification del krdu ==================================================
exports.onScreamDelete = functions.firestore.document('/screams/{id}').onDelete((snapshot, context) => {
  const screamId = context.params.id;
  const batch = db.batch();

  return db
    .collection('comments')
    .where('screamId', '==', screamId)
    .get()
    .then((data) => {
      data.forEach((doc) => {
        batch.delete(db.doc(`/comments/${doc.id}`));
      });
      return db.collection('likes').where('screamId', '==', screamId).get();
    })
    .then((data) => {
      data.forEach((doc) => {
        batch.delete(db.doc(`/likes/${doc.id}`));
      });
      return db.collection('notifications').where('screamId', '==', screamId).get();
    })
    .then((data) => {
      data.forEach((doc) => {
        batch.delete(db.doc(`/notifications/${doc.id}`));
      });
      return batch.commit();
    })
    .catch((err) => console.log(err));
});

// https:url/api/
exports.api = functions.https.onRequest(app);
