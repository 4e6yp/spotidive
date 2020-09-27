import React from 'react';
import { Button, Card, CardActions, CardHeader, CardMedia, makeStyles } from '@material-ui/core';
import PropTypes from 'prop-types';

const useStyles = makeStyles((theme) => ({
  root: {
    width: 300,
    margin: 20
  },
  media: {
    height: 0,
    paddingTop: '100%',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-around'
  }
}));

const CreatedPlaylistPaper = (props) => {
  const classes = useStyles();
  return (    
    <Card className={classes.root}>
      <CardHeader title={props.name} />
      <CardMedia 
        className={classes.media} 
        image={props.image}
        title={props.name}
      />
      <CardActions className={classes.actions}>
        {props.uri ? <Button href={props.uri}>Open in App</Button> : null}
        {props.webUrl ? <Button href={props.webUrl} target='_blank'>Open in Web</Button> : null}
      </CardActions>
    </Card>
  );
}

CreatedPlaylistPaper.propTypes = {
  uri: PropTypes.string.isRequired,
  image: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  webUrl: PropTypes.string.isRequired
}

export default CreatedPlaylistPaper;