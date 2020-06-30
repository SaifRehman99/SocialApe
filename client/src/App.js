import React from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import home from './pages/home';
import login from './pages/login';
import signup from './pages/signup';
import Navbar from './components/Navbar';

import jwtDecode from 'jwt-decode';

import AuthRoute from './routing/AuthRoute';

let authenticated;

if (localStorage.token) {
  const decoded = jwtDecode(localStorage.token);
  if (decoded.exp * 1000 < Date.now()) {
    authenticated = false;
  } else {
    authenticated = true;
  }
}

function App() {
  return (
    <div>
      <Router>
        <div className='container'>
          <Navbar />
          <Switch>
            <Route exact path='/' component={home} />
            <AuthRoute exact path='/login' authenticated={authenticated} component={login} />
            <AuthRoute exact path='/signup' authenticated={authenticated} component={signup} />
          </Switch>
        </div>
      </Router>
    </div>
  );
}

export default App;
