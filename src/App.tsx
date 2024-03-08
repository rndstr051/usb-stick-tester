import type { Component } from 'solid-js';

import styles from './App.module.css';
import { Button } from '@suid/material';

const App: Component = () => {
  return (
    <div class={styles.App}>
      <Button variant='contained'>asd</Button>
    </div>
  );
};

export default App;
