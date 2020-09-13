import React from 'react';
import Mode from './Mode';
import { Container, Button } from '@material-ui/core';
import * as modeTypes from '../../utility/modeTypes';
import PropTypes from 'prop-types';

const ModeSwitcher = (props) => {
  const changeModeBtn = (type) => {
    let text;
    let action;
    if (!props.isAuth) {
      text = 'Login to continue';
      action = props.login;
    } else {
      text = 'Let\'s get started';
      action = () => props.changeMode(type);
    }

    return (
      <Button onClick={action}>
        {text}
      </Button>
    );
  }

  return (
    <Container style={{
      margin: '50px 0',
      display: 'flex',
      justifyContent: 'space-around'
    }}>
      <Mode title="Look closer" desc="Welcome and let's begin" changeModeBtn={changeModeBtn(modeTypes.LOOK_CLOSER)} />
      <Mode title="Dive deeper" desc="Welcome and let's begin" changeModeBtn={changeModeBtn(modeTypes.DIVE_DEEPER)} />
    </Container>
  );
}

ModeSwitcher.propTypes = {
  isAuth: PropTypes.bool.isRequired,
  changeMode: PropTypes.func.isRequired,
  login: PropTypes.func.isRequired
}

export default ModeSwitcher;