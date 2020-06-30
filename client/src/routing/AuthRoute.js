import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Route, Redirect } from 'react-router-dom';

const AuthRoute = ({ component: Component, authenticated, ...rest }) => (
  <Route {...rest} render={(props) => (authenticated ? <Redirect to='/' /> : <Component {...props} />)} />
);

export default AuthRoute;
