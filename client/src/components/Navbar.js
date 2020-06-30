import React from 'react';
import { Link } from 'react-router-dom';

//MUI Stuff
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Button from '@material-ui/core/Button';

const Navbar = () => {
  return (
    <AppBar>
      <Toolbar className='nav-container'>
        <Button color='inherit' component={Link} to='/login'>
          Login
        </Button>
        <Button color='inherit' component={Link} to='/'>
          Home
        </Button>
        <Button color='inherit' component={Link} to='/signup'>
          SignUp
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
