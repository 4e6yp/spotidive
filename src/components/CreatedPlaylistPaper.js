import React from 'react';
import { Paper, Typography } from '@material-ui/core';
import PropTypes from 'prop-types';

const CreatedPlaylistPaper = (props) => {
  return (    
    <Paper elevation={3} style={{maxWidth:'350px', maxHeight: '350px'}}>
      <a href={props.uri}>
        <img src={props.image} alt={props.name} style={{maxWidth:'200px', maxHeight: '200px'}}/>
      </a>
      <Typography variant="h4">{props.name}</Typography>
    </Paper>
  );
}

CreatedPlaylistPaper.propTypes = {
  uri: PropTypes.string.isRequired,
  image: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired
}

export default CreatedPlaylistPaper;