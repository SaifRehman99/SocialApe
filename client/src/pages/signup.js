import React, { useState } from 'react';
import withStyles from '@material-ui/core/styles/withStyles';
import PropTypes from 'prop-types';
import Grid from '@material-ui/core/Grid';

import axios from 'axios';
import { Link } from 'react-router-dom';

import Logo from './facebook-logo-new.png';

import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

import CircularProgress from '@material-ui/core/CircularProgress';

const styles = {
  form: {
    textAlign: 'center',
  },
  image: {
    height: 60,
    width: 50,
  },
  pageTitle: {
    margin: '50px auto 50px auto',
  },
  button: {
    margin: '50px auto 50px auto',
  },
  textField: {
    margin: '10px auto 10px auto',
  },
  button: {
    position: 'relative',
  },
  progress: {
    position: 'absolute',
  },
};

const Signup = ({ classes, history }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    handle: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ error: {} });

  const { email, password, confirmPassword, handle } = formData;
  const { error } = errors;

  const onChange = (e) =>
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

  const onSubmit = (e) => {
    e.preventDefault();

    setLoading(true);

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const body = JSON.stringify({ email, password, confirmPassword, handle });

    axios
      .post('/signup', body, config)
      .then((res) => {
        console.log(res.data);
        localStorage.setItem('token', `Bearer ${res.data.token}`);
        setLoading(false);
        history.push('/');
      })
      .catch((err) => {
        setErrors({ ...errors, error: err.response.data });
        setLoading(false);
      });

    console.log(error);
  };

  return (
    <div>
      <Grid container className={classes.form}>
        <Grid item sm></Grid>
        <Grid item sm>
          <img src={Logo} alt='asdasd' className={classes.image} />
          <Typography variant='h2' className={classes.pageTitle}>
            Signup
          </Typography>
          <form noValidate onSubmit={(e) => onSubmit(e)}>
            <TextField
              id='email'
              name='email'
              type='email'
              label='Email'
              className={classes.textField}
              helperText={error.msg}
              error={error.msg ? true : false}
              value={email}
              onChange={(e) => onChange(e)}
              fullWidth
            />
            <TextField
              id='password'
              name='password'
              type='password'
              label='Password'
              className={classes.textField}
              helperText={error.msg}
              error={error.msg ? true : false}
              value={password}
              onChange={(e) => onChange(e)}
              fullWidth
            />
            <TextField
              id='confirmPassword'
              name='confirmPassword'
              type='password'
              label='Confirm Password'
              className={classes.textField}
              helperText={error.msg}
              error={error.msg ? true : false}
              value={confirmPassword}
              onChange={(e) => onChange(e)}
              fullWidth
            />
            <TextField
              id='handle'
              name='handle'
              type='text'
              label='handle'
              className={classes.textField}
              helperText={error.msg}
              error={error.msg ? true : false}
              value={handle}
              onChange={(e) => onChange(e)}
              fullWidth
            />

            <Button type='submit' className={classes.button} variant='contained' color='primary' disabled={loading}>
              Register
              {loading && <CircularProgress className={classes.progress} size={25} />}
            </Button>

            <p>
              Already Have an account?{' '}
              <Link to='/login'>
                <b>Login</b>
              </Link>{' '}
              here
            </p>
          </form>
        </Grid>
        <Grid item sm></Grid>
      </Grid>
    </div>
  );
};

Signup.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Signup);
