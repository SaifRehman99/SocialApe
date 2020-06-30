import React from 'react';
import { Link } from 'react-router-dom';
import Moment from 'react-moment';
import withStyles from '@material-ui/core/styles/withStyles';

import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';

import Typography from '@material-ui/core/Typography';

const styles = {
  card: {
    display: 'flex',
  },
  image: {
    minWidth: 200,
    height: 150,
  },
  content: {
    padding: 30,
    objectFit: 'cover',
  },
};

const Scream = ({ scream: { screamId, body, userHandle, imageURL, createdAt, commentCount, likeCount }, classes }) => {
  return (
    <div>
      <Card className={classes.card}>
        <CardMedia image={imageURL} title='user' className={classes.image} />
        <CardContent className={classes.content}>
          <Typography variant='h5' component={Link} to={`/users/${userHandle}`} color='secondary'>
            {userHandle}
          </Typography>
          <Typography variant='body2' color='textSecondary'>
            <Moment fromNow>{createdAt}</Moment>
          </Typography>
          <Typography variant='body1'>{body}</Typography>
        </CardContent>
      </Card>
    </div>
  );
};

export default withStyles(styles)(Scream);
