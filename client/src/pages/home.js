import React, { useState, useEffect } from 'react';
import axios from 'axios';

import Scream from '../components/Scream';

import Grid from '@material-ui/core/Grid';

const Home = () => {
  const [screams, setScream] = useState(null);

  useEffect(() => {
    const getScreams = async () => {
      let res = await axios.get('/screams');
      setScream(res.data);
    };

    getScreams();
  }, []);

  return (
    <Grid container spacing={10}>
      <Grid item sm={8} xs={12}>
        {screams ? screams.map((scream, i) => <Scream key={i} scream={scream} />) : <p>Loading ......</p>}
      </Grid>
      <Grid item sm={4} xs={12}>
        Profile...
      </Grid>
    </Grid>
  );
};

export default Home;
